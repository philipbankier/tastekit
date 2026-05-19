const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function buildChatCompletionsUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

export function redactSecrets(value, secrets = []) {
  const activeSecrets = secrets.filter(secret => typeof secret === 'string' && secret.length > 0);
  if (typeof value === 'string') {
    const exactRedacted = activeSecrets.reduce((text, secret) => text.split(secret).join('[REDACTED]'), value);
    return redactGenericSecretPatterns(exactRedacted);
  }
  if (Array.isArray(value)) {
    return value.map(item => redactSecrets(item, activeSecrets));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, redactSecrets(child, activeSecrets)]),
    );
  }
  return value;
}

function redactGenericSecretPatterns(value) {
  return value
    .replace(/(["']?\b(?:OPENAI_API_KEY|ZAI_API_KEY|Z_AI_API_KEY)["']?\s*[:=]\s*["']?)[^\s'",}]+/g, '$1[REDACTED]')
    .replace(/(["']?\bauthorization["']?\s*:\s*["']?\s*Bearer\s+)[A-Za-z0-9._~+/-]{12,}/gi, '$1[REDACTED]')
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/g, '[REDACTED_OPENAI_API_KEY]');
}

export function isExactOkPreflightResponse(content) {
  return typeof content === 'string' && content.trim().toLowerCase() === 'ok';
}

export function createChatClient({ name, apiKey, baseUrl, model, headers = {}, thinking, systemRole }, { eventWriter } = {}) {
  if (!apiKey) throw new Error(`${name} API key is required`);
  if (!baseUrl) throw new Error(`${name} base URL is required`);
  if (!model) throw new Error(`${name} model is required`);

  const url = buildChatCompletionsUrl(baseUrl);
  const isOpenAI = name.startsWith('openai');
  const resolvedSystemRole = systemRole ?? (isOpenAI ? 'developer' : 'system');

  async function complete(messages, options = {}) {
    const timeoutMs = options.timeoutMs ?? 120000;
    const warnings = [];
    let response = await postChatCompletion(buildRequestBody(messages, options));
    if (!response.ok) {
      const errorText = await response.text();
      const unsupportedParams = unsupportedSamplingParams(errorText);
      if (response.status === 400 && unsupportedParams.length > 0) {
        warnings.push(`retried without unsupported parameter(s): ${unsupportedParams.join(', ')}`);
        eventWriter?.write('provider_warning', {
          provider: name,
          model,
          endpoint: url,
          warning: warnings.at(-1),
        });
        response = await postChatCompletion(buildRequestBody(messages, options, new Set(unsupportedParams)));
      }
      if (!response.ok) {
        const retryErrorText = response.bodyUsed ? errorText : await response.text();
        throw new Error(`${name} chat completion failed (${response.status}): ${retryErrorText.slice(0, 1000)}`);
      }
    }

    async function postChatCompletion(body) {
      const requestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...headers,
        },
        body: JSON.stringify(body),
      };
      return fetchWithRetry(url, () => ({
        ...requestInit,
        signal: AbortSignal.timeout(timeoutMs),
      }), options.retries ?? 2);
    }

    let data = await response.json();
    let content = extractMessageContent(data?.choices?.[0]?.message);
    if (typeof content !== 'string' && options.missingContentRetries !== 0) {
      warnings.push('retried after provider returned missing message content');
      eventWriter?.write('provider_warning', {
        provider: name,
        model,
        endpoint: url,
        warning: warnings.at(-1),
        response_shape: summarizeMissingContentShape(data),
      });
      response = await postChatCompletion(buildRequestBody(messages, options));
      if (!response.ok) {
        const retryErrorText = await response.text();
        throw new Error(`${name} chat completion failed after missing-content retry (${response.status}): ${retryErrorText.slice(0, 1000)}`);
      }
      data = await response.json();
      content = extractMessageContent(data?.choices?.[0]?.message);
    }
    if (typeof content !== 'string') {
      throw new Error(`${name} response did not include choices[0].message.content (${summarizeMissingContentShape(data)})`);
    }
    return {
      content,
      usage: {
        input_tokens: data?.usage?.prompt_tokens,
        output_tokens: data?.usage?.completion_tokens,
      },
      warnings,
      raw: data,
    };
  }

  function buildRequestBody(messages, options, omitParams = new Set()) {
    const body = {
      model,
      messages: messages.map(message => ({
        role: message.role === 'system' ? resolvedSystemRole : message.role,
        content: message.content,
      })),
    };
    if (options.maxTokens !== undefined) {
      if (isOpenAI && !omitParams.has('max_completion_tokens')) body.max_completion_tokens = options.maxTokens;
      else if (!isOpenAI && !omitParams.has('max_tokens')) body.max_tokens = options.maxTokens;
    }
    if (options.temperature !== undefined && !omitParams.has('temperature')) body.temperature = options.temperature;
    if (options.stop !== undefined && !omitParams.has('stop')) body.stop = options.stop;
    if (thinking && !omitParams.has('thinking')) body.thinking = { type: thinking };
    return body;
  }

  return { name, model, baseUrl, url, complete };
}

function extractMessageContent(message) {
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const text = content
      .map(part => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        if (typeof part?.content === 'string') return part.content;
        return '';
      })
      .join('');
    return text || undefined;
  }
  return undefined;
}

function summarizeMissingContentShape(data) {
  const rootKeys = keysOf(data).join(',') || 'none';
  const firstChoice = Array.isArray(data?.choices) ? data.choices[0] : undefined;
  const choiceKeys = keysOf(firstChoice).join(',') || 'none';
  const messageKeys = keysOf(firstChoice?.message).join(',') || 'none';
  const finishReason = typeof firstChoice?.finish_reason === 'string' ? firstChoice.finish_reason : 'unknown';
  return `response_keys=${rootKeys}; choice_keys=${choiceKeys}; message_keys=${messageKeys}; finish_reason=${finishReason}`;
}

function keysOf(value) {
  return value && typeof value === 'object' ? Object.keys(value) : [];
}

export async function preflightChatClient(client, eventWriter) {
  const startedAt = Date.now();
  const result = await client.complete([
    { role: 'user', content: 'Reply with exactly: ok' },
  ], { maxTokens: 8, temperature: 0, retries: 1, timeoutMs: 30000 });
  if (!isExactOkPreflightResponse(result.content)) {
    throw new Error(`${client.name} preflight returned an unexpected response: ${result.content.slice(0, 120)}`);
  }
  const elapsedMs = Date.now() - startedAt;
  eventWriter?.write('preflight', {
    provider: client.name,
    model: client.model,
    endpoint: client.url,
    elapsed_ms: elapsedMs,
    response_preview: result.content.slice(0, 80),
    warnings: result.warnings,
  });
  return result;
}

function unsupportedSamplingParams(errorText) {
  const lower = String(errorText).toLowerCase();
  const mentionsUnsupported = /unsupported|unrecognized|unknown|not supported|not compatible|invalid parameter/.test(lower);
  if (!mentionsUnsupported) return [];
  return ['temperature', 'stop', 'thinking']
    .filter(param => lower.includes(param));
}

async function fetchWithRetry(url, initFactory, retries) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const init = typeof initFactory === 'function' ? initFactory(attempt) : initFactory;
      const response = await fetch(url, init);
      if (!TRANSIENT_STATUSES.has(response.status) || attempt === retries) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
    }
    await sleep(750 * (attempt + 1));
  }
  throw lastError ?? new Error('fetchWithRetry exhausted without response');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
