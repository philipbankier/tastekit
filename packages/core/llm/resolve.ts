import { LLMProvider, LLMProviderConfig } from './provider.js';

/**
 * Resolve an LLMProvider from configuration.
 */
export async function resolveProvider(config: LLMProviderConfig): Promise<LLMProvider> {
  switch (config.provider) {
    case 'anthropic': {
      const envVar = config.api_key_env ?? 'ANTHROPIC_API_KEY';
      const apiKey = process.env[envVar];
      if (!apiKey) throw new Error(`Missing environment variable: ${envVar}`);
      const { AnthropicProvider } = await import('./providers/anthropic.js');
      return new AnthropicProvider({ apiKey, model: config.model, baseUrl: config.base_url });
    }
    case 'openai': {
      const envVar = config.api_key_env ?? 'OPENAI_API_KEY';
      const apiKey = process.env[envVar];
      if (!apiKey) throw new Error(`Missing environment variable: ${envVar}`);
      const { OpenAIProvider } = await import('./providers/openai.js');
      return new OpenAIProvider({ apiKey, model: config.model, baseUrl: config.base_url });
    }
    case 'ollama': {
      const { OllamaProvider } = await import('./providers/ollama.js');
      return new OllamaProvider({ model: config.model, baseUrl: config.base_url });
    }
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}. Supported: anthropic, openai, ollama`);
  }
}

/**
 * Auto-detect LLM provider from environment.
 * Checks in order: ANTHROPIC_API_KEY, OPENAI_API_KEY, Ollama running locally.
 */
export async function autoDetectProvider(): Promise<LLMProviderConfig> {
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic' };
  }

  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai' };
  }

  // Check if Ollama is running locally
  try {
    const res = await fetch('http://localhost:11434/api/version', {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) return { provider: 'ollama' };
  } catch {
    // Not running
  }

  throw new Error(
    'No LLM provider detected.\n' +
    'Set ANTHROPIC_API_KEY or OPENAI_API_KEY, or start Ollama locally.\n' +
    'You can also configure a provider in .tastekit/tastekit.yaml under llm_provider.'
  );
}
