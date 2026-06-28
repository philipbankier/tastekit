# Live LLM End-to-End Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a release-confidence validation harness that runs a live, unscripted Full Taste Composition with GPT-5.5 as the TasteKit interviewer and GLM-5.1 as the simulated human, then validates the generated artifacts and downstream runtime surfaces.

**Architecture:** Keep this outside the production CLI as `scripts/validation/live-full-composition-e2e.mjs`, with small testable helper modules under `scripts/validation/lib/live-e2e/`. The harness imports the real built TasteKit core APIs for the interview loop, drives the real CLI for compile/export/drift/eval/trust/skills checks, writes all evidence under a timestamped validation directory, and never mutates the repo root runtime files.

**Tech Stack:** Node.js 20+ ESM, pnpm workspace packages, built `@actrun_ai/tastekit-*` packages, native `fetch`, native `node:test`, GPT-5.5 via OpenAI-compatible chat completions, GLM-5.1 via exact Z.ai chat-completions endpoint.

---

## Scope Check

The approved spec covers one subsystem: a live validation harness and its evidence assets. It touches provider calling, transcript logging, artifact assertions, CLI orchestration, and report generation, but those are all part of one runnable validation flow. Do not split this into multiple specs.

This must not change production onboarding semantics. Production code should only change if implementation discovers a real bug in existing public behavior.

## File Structure

- Create `scripts/validation/lib/live-e2e/options.mjs`
  - Parse harness command-line flags, provide usage text, and normalize depth labels.
- Create `scripts/validation/lib/live-e2e/chat-client.mjs`
  - Direct exact-endpoint OpenAI-compatible chat client for OpenAI and Z.ai, with preflight and retry.
- Create `scripts/validation/lib/live-e2e/events.mjs`
  - JSONL event writer, secret redaction, assertion/failure event helpers.
- Create `scripts/validation/lib/live-e2e/cli-runner.mjs`
  - Child-process wrapper for local `node packages/cli/dist/cli.js` and validator commands.
- Create `scripts/validation/lib/live-e2e/artifacts.mjs`
  - Deterministic artifact assertions: files exist, managed regions, extensions, no raw transcript/hidden machinery leaks.
- Create `scripts/validation/lib/live-e2e/report.mjs`
  - Markdown and JSON report rendering plus exit-code classification.
- Create `scripts/validation/lib/live-e2e/workspace.mjs`
  - Validation output directory, temp workspace, synthetic trace, eval pack, and import-roundtrip helpers.
- Create `scripts/validation/live-full-composition-e2e.mjs`
  - Main executable harness.
- Create `scripts/validation/__tests__/live-e2e-utils.test.mjs`
  - Fast unit tests for helpers; no network calls.
- Create `scripts/validation/__tests__/live-e2e-options.test.mjs`
  - Fast unit tests for argument parsing and exit classification.
- Create `docs/validation/live/full-composition-persona.md`
  - GLM-5.1 simulated human persona prompt.
- Create `docs/validation/live/full-composition-judge-rubric.md`
  - GPT-5.5 artifact judge rubric and JSON output contract.
- Create `docs/validation/live/README.md`
  - Operator instructions for live run, env vars, expected outputs, and review policy.
- Modify `.gitignore`
  - Ignore generated `docs/validation/live/full-composition-*/` evidence directories while keeping prompt source files tracked.
- Modify `package.json`
  - Add `test:live-e2e:unit` and `test:live-e2e` scripts. Do not add the live script to `test`, `lint`, or PR gates.

## Implementation Notes

- The current `OpenAIProvider` appends `/v1/chat/completions`. Do not use it for Z.ai Coding Plan. The new `chat-client.mjs` must call the exact endpoint `baseUrl + /chat/completions` unless the user passes a base URL already ending in `/chat/completions`.
- The live interview must use the real `Interviewer` from `@actrun_ai/tastekit-core/interview`, not a reimplemented interview loop.
- Build first. Runtime imports should use built package exports after `pnpm -r build`.
- The harness should use CLI commands for user-visible lifecycle behavior after the interview: `compile`, `export`, `skills graph`, `trust audit`, `eval run`, `eval replay`, and `drift detect`.
- The main script may support `--preflight-only` and `--no-judge` for operator control. Those modes are validation ergonomics, not product features.
- Generated report directories are release evidence. They are intentionally ignored by default and can be committed selectively by a human.

---

### Task 1: Add Fast Unit Tests And Script Entrypoints

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `scripts/validation/__tests__/live-e2e-utils.test.mjs`
- Create: `scripts/validation/__tests__/live-e2e-options.test.mjs`

- [ ] **Step 1: Add failing helper tests**

Create `scripts/validation/__tests__/live-e2e-utils.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildChatCompletionsUrl, redactSecrets } from '../lib/live-e2e/chat-client.mjs';
import { createEventWriter, readJsonl } from '../lib/live-e2e/events.mjs';
import {
  countManagedRegions,
  detectRuntimeMarkdownLeaks,
  assertExtensionPresence,
} from '../lib/live-e2e/artifacts.mjs';
import { classifyExitCode } from '../lib/live-e2e/report.mjs';

test('buildChatCompletionsUrl appends chat path without adding /v1', () => {
  assert.equal(
    buildChatCompletionsUrl('https://api.z.ai/api/coding/paas/v4'),
    'https://api.z.ai/api/coding/paas/v4/chat/completions',
  );
  assert.equal(
    buildChatCompletionsUrl('https://api.z.ai/api/coding/paas/v4/chat/completions'),
    'https://api.z.ai/api/coding/paas/v4/chat/completions',
  );
});

test('redactSecrets removes known API keys from nested content', () => {
  const redacted = redactSecrets(
    {
      authorization: 'Bearer sk-test-secret',
      nested: ['zai-secret-value', { text: 'OPENAI_API_KEY=sk-test-secret' }],
    },
    ['sk-test-secret', 'zai-secret-value'],
  );
  assert.equal(JSON.stringify(redacted).includes('sk-test-secret'), false);
  assert.equal(JSON.stringify(redacted).includes('zai-secret-value'), false);
  assert.equal(JSON.stringify(redacted).includes('[REDACTED]'), true);
});

test('event writer stores JSONL events with redaction', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-events-'));
  try {
    const path = join(dir, 'events.jsonl');
    const writer = createEventWriter(path, { secrets: ['secret-token'] });
    writer.write('preflight', { endpoint: 'https://example.test', token: 'secret-token' });
    writer.writeAssertion('unit-check', 'pass', 'info', { detail: 'ok' });
    const events = readJsonl(path);
    assert.equal(events.length, 2);
    assert.equal(events[0].type, 'preflight');
    assert.equal(events[0].data.token, '[REDACTED]');
    assert.equal(events[1].type, 'assertion');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('artifact helpers detect managed regions, extensions, and leaks', () => {
  const markdown = [
    '<!-- BEGIN TASTEKIT MANAGED REGION -->',
    '# AGENTS.md',
    'Practical guidance.',
    '<!-- END TASTEKIT MANAGED REGION -->',
    '',
  ].join('\n');
  assert.equal(countManagedRegions(markdown), 1);

  const leaks = detectRuntimeMarkdownLeaks(markdown, {
    transcriptSamples: ['raw interview answer'],
    hiddenTerms: ['<!--COVERAGE', 'policy reason codes'],
  });
  assert.deepEqual(leaks, []);

  const constitution = {
    extensions: {
      'x-tastekit-composition': { schema_version: 'tastekit.composition.v1' },
      'x-tastekit-metacognition': { schema_version: 'tastekit.metacognition.v1' },
    },
  };
  assert.doesNotThrow(() => assertExtensionPresence(constitution));
});

test('exit classification separates deterministic failure from judge failure', () => {
  assert.equal(classifyExitCode({ failures: [], judgePassed: true, judgeAvailable: true }), 0);
  assert.equal(classifyExitCode({ failures: [], judgePassed: false, judgeAvailable: true }), 2);
  assert.equal(classifyExitCode({ failures: [{ severity: 'critical' }], judgePassed: true, judgeAvailable: true }), 1);
  assert.equal(classifyExitCode({ failures: [], judgePassed: false, judgeAvailable: false }), 0);
});
```

Create `scripts/validation/__tests__/live-e2e-options.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseArgs,
  normalizeHarnessDepth,
  publicDepthLabel,
  usage,
} from '../lib/live-e2e/options.mjs';

test('parseArgs applies spec defaults', () => {
  const opts = parseArgs([]);
  assert.equal(opts.domain, 'general-agent');
  assert.equal(opts.depth, 'operator');
  assert.equal(opts.depthInput, 'full-taste-composition');
  assert.equal(opts.output, undefined);
  assert.equal(opts.noJudge, false);
  assert.equal(opts.openaiModel, 'gpt-5.5');
  assert.equal(opts.zaiModel, 'glm-5.1');
});

test('parseArgs preserves explicit endpoint and control flags', () => {
  const opts = parseArgs([
    '--domain', 'development-agent',
    '--depth', 'full',
    '--output', '/tmp/tastekit-live',
    '--max-turns', '120',
    '--no-judge',
    '--preflight-only',
    '--zai-base-url', 'https://api.z.ai/api/paas/v4',
    '--zai-model', 'glm-5.1-air',
    '--openai-model', 'gpt-5.5',
  ]);
  assert.equal(opts.domain, 'development-agent');
  assert.equal(opts.depth, 'operator');
  assert.equal(opts.depthInput, 'full');
  assert.equal(opts.output, '/tmp/tastekit-live');
  assert.equal(opts.maxTurns, 120);
  assert.equal(opts.noJudge, true);
  assert.equal(opts.preflightOnly, true);
  assert.equal(opts.zaiBaseUrl, 'https://api.z.ai/api/paas/v4');
  assert.equal(opts.zaiModel, 'glm-5.1-air');
});

test('depth labels are stable', () => {
  assert.equal(normalizeHarnessDepth('full-taste-composition'), 'operator');
  assert.equal(normalizeHarnessDepth('full'), 'operator');
  assert.equal(publicDepthLabel('operator'), 'Full Taste Composition');
  assert.equal(publicDepthLabel('guided'), 'Guided');
});

test('unknown flags and unsupported depths fail clearly', () => {
  assert.throws(() => parseArgs(['--depth', 'deep']), /Unsupported depth/);
  assert.throws(() => parseArgs(['--surprise']), /Unknown argument/);
  assert.match(usage(), /live-full-composition-e2e/);
});
```

- [ ] **Step 2: Add root scripts**

Patch `package.json` scripts:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r build && pnpm -r test",
    "demo:one-pager": "pnpm --filter @actrun_ai/tastekit-core build && node scripts/demo/render-one-pager.mjs",
    "test:pr-gate": "bash scripts/validation/pr-gate.sh",
    "test:pre-release-live": "bash scripts/validation/pre-release-live-ollama.sh",
    "test:live-e2e:unit": "node --test scripts/validation/__tests__/*.test.mjs",
    "test:live-e2e": "node scripts/validation/live-full-composition-e2e.mjs",
    "lint": "pnpm -r lint",
    "clean": "pnpm -r clean"
  }
}
```

Keep every existing script and insert only the two new scripts.

- [ ] **Step 3: Ignore generated live evidence directories**

Add this block to `.gitignore` below the existing `examples/*/output/` line:

```gitignore

# Live validation run outputs; prompt/rubric source files remain tracked.
docs/validation/live/full-composition-*/
```

- [ ] **Step 4: Run tests to verify they fail before helper modules exist**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: FAIL with module resolution errors for `scripts/validation/lib/live-e2e/*.mjs`.

- [ ] **Step 5: Commit red tests and script wiring**

```bash
git add package.json .gitignore scripts/validation/__tests__/live-e2e-utils.test.mjs scripts/validation/__tests__/live-e2e-options.test.mjs
git commit -m "test: add live llm e2e harness unit coverage"
```

---

### Task 2: Implement Testable Harness Helper Modules

**Files:**
- Create: `scripts/validation/lib/live-e2e/options.mjs`
- Create: `scripts/validation/lib/live-e2e/chat-client.mjs`
- Create: `scripts/validation/lib/live-e2e/events.mjs`
- Create: `scripts/validation/lib/live-e2e/artifacts.mjs`
- Create: `scripts/validation/lib/live-e2e/cli-runner.mjs`
- Create: `scripts/validation/lib/live-e2e/report.mjs`
- Create: `scripts/validation/lib/live-e2e/workspace.mjs`

- [ ] **Step 1: Implement options parsing**

Create `scripts/validation/lib/live-e2e/options.mjs`:

```js
export const DEFAULT_PERSONA_PATH = 'docs/validation/live/full-composition-persona.md';
export const DEFAULT_JUDGE_PATH = 'docs/validation/live/full-composition-judge-rubric.md';
export const DEFAULT_ZAI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';

const DEPTHS = new Set(['quick', 'guided', 'operator', 'full', 'full-taste-composition']);

export function normalizeHarnessDepth(value) {
  if (value === 'full' || value === 'full-taste-composition') return 'operator';
  if (value === 'quick' || value === 'guided' || value === 'operator') return value;
  throw new Error(`Unsupported depth: ${value}`);
}

export function publicDepthLabel(depth) {
  switch (depth) {
    case 'quick': return 'Quick';
    case 'guided': return 'Guided';
    case 'operator': return 'Full Taste Composition';
    default: throw new Error(`Unsupported normalized depth: ${depth}`);
  }
}

export function usage() {
  return [
    'Usage: node scripts/validation/live-full-composition-e2e.mjs [options]',
    '',
    'Options:',
    '  --domain <id>             Domain to interview, default general-agent',
    '  --second-domain <id>      Optional second artifact pass, usually development-agent',
    '  --depth <depth>           quick, guided, full, full-taste-composition, or operator',
    '  --output <dir>            Validation output directory',
    '  --max-turns <n|auto>      Override safety ceiling',
    '  --persona <path>          Persona prompt markdown',
    '  --judge <path>            Judge rubric markdown',
    '  --no-judge                Skip qualitative GPT-5.5 judge',
    '  --preflight-only          Check providers and exit before interview',
    '  --zai-base-url <url>      Exact Z.ai base URL before /chat/completions',
    '  --zai-model <id>          GLM model, default glm-5.1',
    '  --openai-model <id>       Interviewer/judge model, default gpt-5.5',
    '  --help                    Print this help',
  ].join('\n');
}

export function parseArgs(argv) {
  const opts = {
    domain: 'general-agent',
    secondDomain: undefined,
    depthInput: 'full-taste-composition',
    depth: 'operator',
    output: undefined,
    maxTurns: 'auto',
    persona: DEFAULT_PERSONA_PATH,
    judge: DEFAULT_JUDGE_PATH,
    noJudge: false,
    preflightOnly: false,
    zaiBaseUrl: process.env.ZAI_BASE_URL || DEFAULT_ZAI_BASE_URL,
    zaiModel: process.env.ZAI_MODEL || 'glm-5.1',
    zaiThinking: process.env.ZAI_THINKING || 'disabled',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-5.5',
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const readValue = () => {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      return value;
    };

    switch (arg) {
      case '--domain':
        opts.domain = readValue();
        break;
      case '--second-domain':
        opts.secondDomain = readValue();
        break;
      case '--depth': {
        const input = readValue();
        if (!DEPTHS.has(input)) throw new Error(`Unsupported depth: ${input}`);
        opts.depthInput = input;
        opts.depth = normalizeHarnessDepth(input);
        break;
      }
      case '--output':
        opts.output = readValue();
        break;
      case '--max-turns': {
        const value = readValue();
        opts.maxTurns = value === 'auto' ? 'auto' : Number.parseInt(value, 10);
        if (opts.maxTurns !== 'auto' && (!Number.isInteger(opts.maxTurns) || opts.maxTurns <= 0)) {
          throw new Error(`Invalid --max-turns value: ${value}`);
        }
        break;
      }
      case '--persona':
        opts.persona = readValue();
        break;
      case '--judge':
        opts.judge = readValue();
        break;
      case '--no-judge':
        opts.noJudge = true;
        break;
      case '--preflight-only':
        opts.preflightOnly = true;
        break;
      case '--zai-base-url':
        opts.zaiBaseUrl = readValue();
        break;
      case '--zai-model':
        opts.zaiModel = readValue();
        break;
      case '--openai-model':
        opts.openaiModel = readValue();
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}
```

- [ ] **Step 2: Implement exact-endpoint chat client**

Create `scripts/validation/lib/live-e2e/chat-client.mjs` with these exports:

```js
export function buildChatCompletionsUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

export function redactSecrets(value, secrets = []) {
  const activeSecrets = secrets.filter(secret => typeof secret === 'string' && secret.length > 0);
  if (typeof value === 'string') {
    return activeSecrets.reduce((text, secret) => text.split(secret).join('[REDACTED]'), value);
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

export function createChatClient({ name, apiKey, baseUrl, model, headers = {}, thinking }) {
  if (!apiKey) throw new Error(`${name} API key is required`);
  if (!baseUrl) throw new Error(`${name} base URL is required`);
  if (!model) throw new Error(`${name} model is required`);

  const url = buildChatCompletionsUrl(baseUrl);

  async function complete(messages, options = {}) {
    const body = {
      model,
      messages: messages.map(message => ({ role: message.role, content: message.content })),
    };
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.stop !== undefined) body.stop = options.stop;
    if (thinking) body.thinking = { type: thinking };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 120000),
    }, options.retries ?? 2);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${name} chat completion failed (${response.status}): ${errorText.slice(0, 1000)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error(`${name} response did not include choices[0].message.content`);
    }
    return {
      content,
      usage: {
        input_tokens: data?.usage?.prompt_tokens,
        output_tokens: data?.usage?.completion_tokens,
      },
      raw: data,
    };
  }

  return { name, model, baseUrl, url, complete };
}

export async function preflightChatClient(client, eventWriter) {
  const startedAt = Date.now();
  const result = await client.complete([
    { role: 'user', content: 'Reply with exactly: ok' },
  ], { maxTokens: 8, temperature: 0, retries: 1, timeoutMs: 30000 });
  const elapsedMs = Date.now() - startedAt;
  eventWriter?.write('preflight', {
    provider: client.name,
    model: client.model,
    endpoint: client.url,
    elapsed_ms: elapsedMs,
    response_preview: result.content.slice(0, 80),
  });
  return result;
}

async function fetchWithRetry(url, init, retries) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === retries) {
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
```

- [ ] **Step 3: Implement event writer**

Create `scripts/validation/lib/live-e2e/events.mjs`:

```js
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { redactSecrets } from './chat-client.mjs';

export function createEventWriter(path, { secrets = [] } = {}) {
  mkdirSync(dirname(path), { recursive: true });

  function write(type, data = {}) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      data: redactSecrets(data, secrets),
    };
    appendFileSync(path, `${JSON.stringify(event)}\n`, 'utf-8');
    return event;
  }

  return {
    path,
    write,
    writeAssertion(name, status, severity, evidence = {}) {
      return write('assertion', { name, status, severity, ...evidence });
    },
    writeFailure(severity, category, message, evidence = {}) {
      return write('failure', { severity, category, message, ...evidence });
    },
  };
}

export function readJsonl(path) {
  const content = readFileSync(path, 'utf-8').trim();
  return content ? content.split('\n').map(line => JSON.parse(line)) : [];
}
```

- [ ] **Step 4: Implement artifact assertions**

Create `scripts/validation/lib/live-e2e/artifacts.mjs`:

```js
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_EXTENSIONS = ['x-tastekit-composition', 'x-tastekit-metacognition'];

export function countManagedRegions(markdown) {
  return (markdown.match(/BEGIN TASTEKIT MANAGED REGION/g) ?? []).length;
}

export function detectRuntimeMarkdownLeaks(markdown, { transcriptSamples = [], hiddenTerms = [] } = {}) {
  const leaks = [];
  for (const term of hiddenTerms) {
    if (term && markdown.includes(term)) leaks.push({ type: 'hidden_term', value: term });
  }
  for (const sample of transcriptSamples) {
    const trimmed = typeof sample === 'string' ? sample.trim() : '';
    if (trimmed.length >= 40 && markdown.includes(trimmed)) {
      leaks.push({ type: 'transcript_sample', value: trimmed.slice(0, 120) });
    }
  }
  return leaks;
}

export function assertExtensionPresence(constitution) {
  const extensions = constitution?.extensions;
  if (!extensions || typeof extensions !== 'object') {
    throw new Error('constitution.extensions is missing');
  }
  for (const key of REQUIRED_EXTENSIONS) {
    if (!extensions[key] || typeof extensions[key] !== 'object') {
      throw new Error(`constitution.extensions["${key}"] is missing`);
    }
  }
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function assertFile(path) {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  return path;
}

export function runtimeMarkdownPaths(workspaceDir) {
  return ['CLAUDE.md', 'SOUL.md', 'AGENTS.md', 'taste.md']
    .map(name => join(workspaceDir, name))
    .filter(path => existsSync(path));
}

export function assertRuntimeMarkdown(workspaceDir, transcriptSamples = []) {
  const hiddenTerms = ['<!--COVERAGE', 'COVERAGE-->', 'policy reason codes', 'dimension_updates'];
  const results = [];
  for (const path of runtimeMarkdownPaths(workspaceDir)) {
    const markdown = readFileSync(path, 'utf-8');
    const regionCount = countManagedRegions(markdown);
    if (regionCount !== 1) throw new Error(`${path} has ${regionCount} TasteKit managed regions`);
    const leaks = detectRuntimeMarkdownLeaks(markdown, { transcriptSamples, hiddenTerms });
    if (leaks.length > 0) throw new Error(`${path} leaked hidden/runtime content: ${JSON.stringify(leaks)}`);
    results.push({ path, regionCount });
  }
  return results;
}
```

- [ ] **Step 5: Implement CLI runner**

Create `scripts/validation/lib/live-e2e/cli-runner.mjs`:

```js
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

export const CLI_PATH = resolve('packages/cli/dist/cli.js');
export const VALIDATOR_PATH = resolve('packages/validator/dist/cli.js');

export async function runNodeScript(scriptPath, args, { cwd = process.cwd(), env = {}, timeoutMs = 120000 } = {}) {
  return await runCommand(process.execPath, [scriptPath, ...args], { cwd, env, timeoutMs });
}

export async function runTastekit(args, options = {}) {
  return runNodeScript(CLI_PATH, args, options);
}

export async function runValidator(args, options = {}) {
  return runNodeScript(VALIDATOR_PATH, args, options);
}

export async function runCommand(command, args, { cwd, env = {}, timeoutMs = 120000 } = {}) {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out: ${command} ${args.join(' ')}`));
    }, timeoutMs);
    child.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timeout);
      resolvePromise({ code: code ?? 1, stdout, stderr, command, args, cwd });
    });
  });
}
```

- [ ] **Step 6: Implement report helper**

Create `scripts/validation/lib/live-e2e/report.mjs`:

```js
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function classifyExitCode({ failures, judgePassed, judgeAvailable }) {
  if (failures.some(failure => failure.severity === 'critical')) return 1;
  if (judgeAvailable && judgePassed === false) return 2;
  return 0;
}

export function renderReportMarkdown(report) {
  const lines = [];
  lines.push('# TasteKit Live Full Taste Composition E2E Report');
  lines.push('');
  lines.push(`Result: **${report.result}**`);
  lines.push('');
  lines.push('## Run Metadata');
  lines.push('');
  for (const [key, value] of Object.entries(report.metadata)) {
    lines.push(`- ${key}: ${String(value)}`);
  }
  lines.push('');
  lines.push('## Interview Shape');
  lines.push('');
  for (const [key, value] of Object.entries(report.interviewShape)) {
    lines.push(`- ${key}: ${String(value)}`);
  }
  lines.push('');
  lines.push('## Taste Extracted');
  lines.push('');
  lines.push(report.tasteSummary || 'No taste summary available.');
  lines.push('');
  lines.push('## Deterministic Assertions');
  lines.push('');
  lines.push('| Status | Severity | Name | Evidence |');
  lines.push('| --- | --- | --- | --- |');
  for (const assertion of report.assertions) {
    lines.push(`| ${assertion.status} | ${assertion.severity} | ${assertion.name} | ${assertion.evidence ?? ''} |`);
  }
  lines.push('');
  lines.push('## Artifact Inventory');
  lines.push('');
  for (const artifact of report.artifacts) {
    lines.push(`- ${artifact}`);
  }
  lines.push('');
  lines.push('## Judge Results');
  lines.push('');
  if (report.judge) {
    lines.push(`Average: ${report.judge.average}`);
    lines.push(`Passed: ${report.judge.passed}`);
    for (const score of report.judge.scores ?? []) {
      lines.push(`- ${score.dimension}: ${score.score} - ${score.rationale}`);
    }
  } else {
    lines.push('Judge unavailable or disabled.');
  }
  lines.push('');
  lines.push('## Drift And Eval Results');
  lines.push('');
  for (const item of report.downstream) {
    lines.push(`- ${item.name}: ${item.status}${item.summary ? ` - ${item.summary}` : ''}`);
  }
  lines.push('');
  lines.push('## Release Interpretation');
  lines.push('');
  lines.push(report.releaseInterpretation);
  lines.push('');
  lines.push('## Follow-Ups');
  lines.push('');
  if (report.followUps.length === 0) {
    lines.push('- None.');
  } else {
    for (const item of report.followUps) lines.push(`- ${item}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function writeReports(outputDir, report) {
  writeFileSync(join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf-8');
  writeFileSync(join(outputDir, 'report.md'), renderReportMarkdown(report), 'utf-8');
}
```

- [ ] **Step 7: Implement workspace helper**

Create `scripts/validation/lib/live-e2e/workspace.mjs`:

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

export function createRunDirectory(output) {
  const dir = resolve(output || join('docs/validation/live', `full-composition-${timestampSlug()}`));
  mkdirSync(dir, { recursive: true });
  const workspaceDir = join(dir, 'workspace');
  mkdirSync(workspaceDir, { recursive: true });
  return { outputDir: dir, workspaceDir, tastekitDir: join(workspaceDir, '.tastekit') };
}

export function writeSyntheticDriftTrace(tastekitDir) {
  const tracesDir = join(tastekitDir, 'traces');
  mkdirSync(tracesDir, { recursive: true });
  const path = join(tracesDir, 'live-e2e-drift.trace.v1.jsonl');
  const runId = `live-e2e-${Date.now()}`;
  const now = new Date().toISOString();
  const events = [
    repeatedApproval(runId, now, 'agreed too quickly with weak product idea'),
    repeatedApproval(runId, now, 'agreed too quickly with weak product idea'),
    repeatedApproval(runId, now, 'agreed too quickly with weak product idea'),
    errorEvent(runId, now, 'unsupported public claim', ['evidence_policy']),
    errorEvent(runId, now, 'irreversible action without approval', ['autonomy_boundaries']),
    errorEvent(runId, now, 'over-explained low-stakes update', ['communication_style']),
  ];
  writeFileSync(path, events.map(event => JSON.stringify(event)).join('\n') + '\n', 'utf-8');
  return path;
}

export function writeEvalPack(tastekitDir) {
  const evalDir = join(tastekitDir, 'evals');
  mkdirSync(evalDir, { recursive: true });
  const path = join(evalDir, 'live-e2e-evalpack.json');
  const pack = {
    schema_version: 'evalpack.v1',
    id: 'live-e2e-profile-behavior',
    name: 'Live E2E Profile Behavior',
    description: 'Deterministic checks that generated profile guidance contains key behavioral affordances.',
    scenarios: [
      {
        scenario_id: 'challenge-weak-assumptions',
        name: 'Challenge weak assumptions',
        description: 'Profile should mention challenge behavior.',
        setup: { inputs: { response: 'challenge uncertainty approval fatigue evidence' } },
        expected: {
          rubrics: ['challenge'],
          thresholds: { challenge: 0.5 },
          required_outputs: ['response'],
        },
      },
    ],
    judging: {
      output_format: 'json',
      rules: [
        { rule_id: 'required-response', type: 'deterministic', pattern: 'challenge', weight: 1 },
        { rule_id: 'uncertainty-word', type: 'regex', pattern: 'uncertainty|evidence|approval|fatigue', weight: 1 },
      ],
    },
  };
  writeFileSync(path, JSON.stringify(pack, null, 2), 'utf-8');
  return path;
}

function repeatedApproval(runId, timestamp, reason) {
  return {
    schema_version: 'trace_event.v1',
    run_id: runId,
    timestamp,
    actor: 'user',
    event_type: 'approval_response',
    data: { approved: false, reason },
  };
}

function errorEvent(runId, timestamp, error, principleRefs) {
  return {
    schema_version: 'trace_event.v1',
    run_id: runId,
    timestamp,
    actor: 'system',
    event_type: 'error',
    error,
    principle_refs: principleRefs,
  };
}
```

- [ ] **Step 8: Run helper tests to verify they pass**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: PASS for `live-e2e-utils.test.mjs` and `live-e2e-options.test.mjs`.

- [ ] **Step 9: Commit helper modules**

```bash
git add scripts/validation/lib/live-e2e scripts/validation/__tests__
git commit -m "feat: add live e2e harness helpers"
```

---

### Task 3: Add Persona, Judge Rubric, And Operator Docs

**Files:**
- Create: `docs/validation/live/full-composition-persona.md`
- Create: `docs/validation/live/full-composition-judge-rubric.md`
- Create: `docs/validation/live/README.md`
- Modify: `scripts/validation/__tests__/live-e2e-utils.test.mjs`

- [ ] **Step 1: Add failing prompt source test**

Append this test to `scripts/validation/__tests__/live-e2e-utils.test.mjs`:

```js
test('live prompt source files contain required contracts', () => {
  const persona = readFileSync('docs/validation/live/full-composition-persona.md', 'utf-8');
  const judge = readFileSync('docs/validation/live/full-composition-judge-rubric.md', 'utf-8');
  assert.match(persona, /Answer as the person/i);
  assert.match(persona, /Do not volunteer the whole profile/i);
  assert.match(persona, /fatigue/i);
  assert.match(persona, /push back/i);
  assert.match(judge, /JSON/i);
  assert.match(judge, /autonomy boundaries/i);
  assert.match(judge, /metacognition/i);
});
```

- [ ] **Step 2: Run prompt test to verify it fails**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: FAIL because the prompt files are missing.

- [ ] **Step 3: Create simulated human persona prompt**

Create `docs/validation/live/full-composition-persona.md`:

```markdown
# Full Taste Composition Simulated Human Persona

You are the simulated human user in a live TasteKit onboarding interview.

Answer as the person. Do not explain the persona. Do not mention this prompt. Do not act like an assistant helping the interviewer test software.

You are a research-heavy product and engineering founder building AI agents for high-stakes operator workflows. You care about agents that can plan, challenge, ideate, research, write, and execute across ambiguous work.

Core preferences:

- You hate generic agreement, vague praise, shallow productivity advice, and unsupported confidence.
- You value taste, judgment, nuance, principled disagreement, adversarial thinking, and practical execution.
- You want the agent to explore, synthesize, generate options, and draft first passes with high autonomy.
- You want low autonomy for irreversible changes, public claims, external messages, credentials, user-data handling, legal/medical/financial claims, and production deploys.
- You want concise updates for low-stakes work and deeper reasoning for high-leverage decisions.
- You want creative leaps only when the agent explains the basis and tradeoff.

Productive contradictions to reveal gradually:

- You say "move fast" but reject sloppy assumptions.
- You say "be concise" but want deep reasoning for expensive or strategic decisions.
- You want challenge, but not performative contrarianism.
- You want creativity, but not novelty theater.

Behavior during the interview:

- Answer only the interviewer's current question.
- Do not volunteer the whole profile up front.
- Give natural, incomplete human answers.
- Occasionally under-specify an answer so the interviewer has to follow up.
- Correct yourself when the interviewer surfaces a better distinction.
- Show fatigue partway through by asking for compression.
- Push back on at least one draft or summary if it misses a meaningful nuance.
- Accept a final draft only when it captures your practical operating style.

Stay coherent. Do not intentionally sabotage the test. The goal is to be a demanding but realistic user.
```

- [ ] **Step 4: Create judge rubric prompt**

Create `docs/validation/live/full-composition-judge-rubric.md`:

```markdown
# Full Taste Composition Judge Rubric

You are judging a TasteKit live end-to-end run. Judge the real-world value of the generated profile and runtime artifacts, not only whether files exist.

Inputs you may receive:

- Persona prompt.
- Transcript summary or selected transcript events.
- `.tastekit/session.json`.
- `.tastekit/constitution.v1.json`.
- Runtime markdown files.
- Export summaries.
- Deterministic assertion results.

Score each dimension from 1 to 5:

- Depth: non-obvious preferences and operating taste were discovered.
- Specificity: artifacts are concrete enough to guide an agent.
- Tension capture: contradictions and tradeoffs are preserved without flattening.
- Autonomy boundaries: approvals, reversibility, public actions, and data handling are clear.
- Challenge style: the profile says when and how to push back.
- Evidence behavior: research, citations, and uncertainty expectations are clear.
- Metacognition: pacing, fatigue, assumptions, confirmation, and conflict handling are captured.
- Runtime usability: Claude Code or OpenClaw-style agents could use the files immediately.
- Drift/eval readiness: outputs support later maintenance and regression checking.

Return strict JSON:

```json
{
  "passed": true,
  "average": 4.2,
  "scores": [
    { "dimension": "Depth", "score": 4, "rationale": "Short rationale." }
  ],
  "critical_concerns": [],
  "release_interpretation": "This run increases release confidence because..."
}
```

Pass threshold:

- Average score is at least 4.0.
- No score below 3 for Autonomy boundaries, Metacognition, or Runtime usability.
- No critical deterministic assertion failures are present.

Do not make clinical, therapeutic, or diagnostic claims.
```

- [ ] **Step 5: Create live validation README**

Create `docs/validation/live/README.md`:

```markdown
# Live TasteKit Validation

This directory stores source prompts for the live Full Taste Composition end-to-end validation harness.

Generated runs are written to `docs/validation/live/full-composition-YYYYMMDD-HHMMSS/` and ignored by git by default.

Required environment:

- `OPENAI_API_KEY` for GPT-5.5 interviewer and judge.
- `ZAI_API_KEY` for GLM-5.1 simulated human.

Useful environment:

- `ZAI_BASE_URL`, default `https://api.z.ai/api/coding/paas/v4`.
- `ZAI_MODEL`, default `glm-5.1`.
- `ZAI_THINKING`, default `disabled`.
- `OPENAI_MODEL`, default `gpt-5.5`.

Run:

```bash
pnpm -r build
node scripts/validation/live-full-composition-e2e.mjs
```

The harness is release evidence, not a PR gate. It uses live LLMs and may fail due to provider availability, latency, or subjective quality. Deterministic failures should block release confidence until fixed. Judge-only failures should trigger product review.
```

- [ ] **Step 6: Run tests to verify prompt contracts pass**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: PASS.

- [ ] **Step 7: Commit prompt and docs**

```bash
git add docs/validation/live scripts/validation/__tests__/live-e2e-utils.test.mjs
git commit -m "docs: add live e2e persona and judge rubric"
```

---

### Task 4: Add Main Harness Shell With Preflight-Only Mode

**Files:**
- Create: `scripts/validation/live-full-composition-e2e.mjs`
- Modify: `scripts/validation/__tests__/live-e2e-options.test.mjs`

- [ ] **Step 1: Add failing script contract tests**

Append to `scripts/validation/__tests__/live-e2e-options.test.mjs`:

```js
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('main harness prints help', () => {
  assert.equal(existsSync('scripts/validation/live-full-composition-e2e.mjs'), true);
  const result = spawnSync(process.execPath, ['scripts/validation/live-full-composition-e2e.mjs', '--help'], {
    encoding: 'utf-8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Full Taste Composition/i);
  assert.match(result.stdout, /--preflight-only/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: FAIL because the main script does not exist.

- [ ] **Step 3: Create executable main script shell**

Create `scripts/validation/live-full-composition-e2e.mjs`:

```js
#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, publicDepthLabel, usage } from './lib/live-e2e/options.mjs';
import { createChatClient, preflightChatClient } from './lib/live-e2e/chat-client.mjs';
import { createEventWriter } from './lib/live-e2e/events.mjs';
import { createRunDirectory } from './lib/live-e2e/workspace.mjs';
import { classifyExitCode, writeReports } from './lib/live-e2e/report.mjs';

async function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(usage());
    return 1;
  }

  if (options.help) {
    console.log(usage());
    console.log('');
    console.log('Default depth: Full Taste Composition');
    return 0;
  }

  const startedAt = new Date();
  const { outputDir, workspaceDir } = createRunDirectory(options.output);
  const secrets = [process.env.OPENAI_API_KEY, process.env.ZAI_API_KEY].filter(Boolean);
  const events = createEventWriter(join(outputDir, 'transcript.jsonl'), { secrets });
  const failures = [];
  const assertions = [];

  const recordFailure = (severity, category, message, evidence = {}) => {
    const failure = { severity, category, message, evidence };
    failures.push(failure);
    events.writeFailure(severity, category, message, evidence);
  };

  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const zaiKey = process.env.ZAI_API_KEY;
    if (!openaiKey) throw new Error('OPENAI_API_KEY is required');
    if (!zaiKey) throw new Error('ZAI_API_KEY is required');

    const interviewerClient = createChatClient({
      name: 'openai',
      apiKey: openaiKey,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: options.openaiModel,
    });
    const simulatedUserClient = createChatClient({
      name: 'zai',
      apiKey: zaiKey,
      baseUrl: options.zaiBaseUrl,
      model: options.zaiModel,
      thinking: options.zaiThinking,
    });

    await preflightChatClient(interviewerClient, events);
    await preflightChatClient(simulatedUserClient, events);

    assertions.push({ name: 'provider-preflight', status: 'pass', severity: 'critical', evidence: 'GPT-5.5 and GLM-5.1 reachable' });
    events.writeAssertion('provider-preflight', 'pass', 'critical', { openai_model: options.openaiModel, zai_model: options.zaiModel });

    if (options.preflightOnly) {
      const report = buildMinimalReport({
        options,
        outputDir,
        workspaceDir,
        startedAt,
        failures,
        assertions,
        result: 'preflight-pass',
      });
      writeReports(outputDir, report);
      console.log(`Preflight passed. Report written to ${join(outputDir, 'report.md')}`);
      return 0;
    }

    await runLiveE2E({
      options,
      outputDir,
      workspaceDir,
      events,
      interviewerClient,
      simulatedUserClient,
      assertions,
      failures,
      recordFailure,
      startedAt,
    });
  } catch (error) {
    recordFailure('critical', 'harness', error instanceof Error ? error.message : String(error));
  }

  const report = buildMinimalReport({
    options,
    outputDir,
    workspaceDir,
    startedAt,
    failures,
    assertions,
    result: failures.some(f => f.severity === 'critical') ? 'fail' : 'pass-without-live-body',
  });
  writeReports(outputDir, report);
  console.log(`Report written to ${join(outputDir, 'report.md')}`);
  return classifyExitCode({ failures, judgePassed: true, judgeAvailable: false });
}

async function runLiveE2E() {
  throw new Error('Full live interview mode is guarded in this shell commit. Run with --preflight-only for Task 4 verification.');
}

function buildMinimalReport({ options, outputDir, workspaceDir, startedAt, failures, assertions, result }) {
  return {
    result,
    metadata: {
      output_dir: outputDir,
      workspace_dir: workspaceDir,
      domain: options.domain,
      depth: publicDepthLabel(options.depth),
      openai_model: options.openaiModel,
      zai_model: options.zaiModel,
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
    },
    interviewShape: {
      turn_count: 0,
      stop_reason: result,
    },
    tasteSummary: '',
    assertions,
    failures,
    artifacts: [],
    downstream: [],
    judge: null,
    releaseInterpretation: failures.length > 0
      ? 'This run does not increase release confidence because deterministic failures occurred.'
      : 'Provider preflight succeeded. Run the full harness for release evidence.',
    followUps: failures.map(failure => `${failure.category}: ${failure.message}`),
  };
}

main(process.argv.slice(2)).then(code => {
  process.exitCode = code;
});
```

- [ ] **Step 4: Fix OpenAI base URL handling before running preflight**

The `createChatClient` helper appends `/chat/completions` to the base URL. The OpenAI default must therefore be `https://api.openai.com/v1`, not `https://api.openai.com`. Keep the default in the main script exactly as shown above.

- [ ] **Step 5: Run unit tests**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: PASS.

- [ ] **Step 6: Run help command**

Run:

```bash
node scripts/validation/live-full-composition-e2e.mjs --help
```

Expected: exit `0`, output includes `--preflight-only` and `Default depth: Full Taste Composition`.

- [ ] **Step 7: Commit main shell**

```bash
git add scripts/validation/live-full-composition-e2e.mjs scripts/validation/__tests__/live-e2e-options.test.mjs
git commit -m "feat: add live e2e harness shell"
```

---

### Task 5: Wire The Real Live Interview Loop

**Files:**
- Modify: `scripts/validation/live-full-composition-e2e.mjs`

- [ ] **Step 1: Add imports for built TasteKit APIs**

Patch the import section in `scripts/validation/live-full-composition-e2e.mjs` by replacing the existing `node:fs` import with a consolidated import and adding the built TasteKit imports:

```js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Interviewer, createSession, saveSession } from '@actrun_ai/tastekit-core/interview';
import { getDomainRubric } from '@actrun_ai/tastekit-core/domains';
import { compile } from '@actrun_ai/tastekit-core/compiler';
import { resolveSessionPath } from '@actrun_ai/tastekit-core/utils';
```

If Node cannot resolve workspace exports before build, do not add a runtime workaround. Keep the preflight error clear and require `pnpm -r build`.

- [ ] **Step 2: Replace the guarded `runLiveE2E` function with the real interview body**

Replace the guarded `runLiveE2E` function with:

```js
async function runLiveE2E(ctx) {
  const {
    options,
    outputDir,
    workspaceDir,
    events,
    interviewerClient,
    simulatedUserClient,
    assertions,
    failures,
    recordFailure,
    startedAt,
  } = ctx;

  const persona = readFileSync(options.persona, 'utf-8');
  writeFileSync(join(outputDir, 'persona-prompt.md'), persona, 'utf-8');

  const tastekitDir = join(workspaceDir, '.tastekit');
  mkdirSync(tastekitDir, { recursive: true });
  mkdirSync(join(tastekitDir, 'skills'), { recursive: true });
  mkdirSync(join(tastekitDir, 'traces'), { recursive: true });

  const config = {
    version: '0.2.0',
    project_name: 'live-full-composition-e2e',
    created_at: new Date().toISOString(),
    domain_id: options.domain,
    onboarding: {
      depth: options.depth,
      completed: false,
      session_path: 'session.json',
    },
    llm_provider: {
      provider: 'openai',
      model: options.openaiModel,
    },
  };
  writeFileSync(join(tastekitDir, 'tastekit.yaml'), renderTastekitYaml(config), 'utf-8');

  const rubric = getDomainRubric(options.domain);
  if (!rubric) {
    throw new Error(`No rubric found for domain: ${options.domain}`);
  }

  const sessionPath = resolveSessionPath(tastekitDir);
  const session = createSession(options.depth);
  session.domain_id = options.domain;
  session.llm_provider = { name: interviewerClient.name, model: interviewerClient.model };

  const simulatedHistory = [
    { role: 'system', content: persona },
  ];

  let lastInterviewerMessage = '';
  const transcriptSamples = [];

  const interviewer = new Interviewer({
    llm: interviewerClient,
    rubric,
    depth: options.depth,
    onInterviewerMessage: async (message) => {
      lastInterviewerMessage = message;
      events.write('interviewer_message', {
        turn: interviewer.getState().turn_count,
        message,
        domain: options.domain,
        depth: publicDepthLabel(options.depth),
      });
      if (/dimensions|rubric|coverage|dimension_updates|policy reason/i.test(message)) {
        recordFailure('critical', 'interview_ux', 'Interviewer exposed hidden machinery', { message });
      }
    },
    getUserInput: async () => {
      simulatedHistory.push({ role: 'user', content: lastInterviewerMessage });
      const response = await simulatedUserClient.complete(simulatedHistory, {
        maxTokens: 900,
        temperature: 0.85,
      });
      const answer = response.content.trim();
      simulatedHistory.push({ role: 'assistant', content: answer });
      transcriptSamples.push(answer);
      events.write('simulated_user_message', {
        turn: interviewer.getState().turn_count + 1,
        reply: answer,
        model: simulatedUserClient.model,
        usage: response.usage,
      });
      return answer;
    },
    onStateChange: (state) => {
      session.interview = state;
      session.current_step = 'interview';
      saveSession(sessionPath, session);
      events.write('state_update', {
        turn: state.turn_count,
        is_complete: state.is_complete,
        coverage_summary: state.metacognition?.coverage_summary,
        policy_action: state.metacognition?.policy_decisions?.at(-1)?.action,
        fatigue_events: state.metacognition?.fatigue_events?.length ?? 0,
        conflicts: state.metacognition?.conflicts?.length ?? 0,
        confirmation_checkpoints: state.metacognition?.confirmation_checkpoints?.length ?? 0,
      });
    },
  });

  const structuredAnswers = await interviewer.run();
  session.structured_answers = structuredAnswers;
  session.completed_steps = ['welcome', 'interview'];
  session.current_step = 'complete';
  session.interview = interviewer.getState();
  saveSession(sessionPath, session);

  const state = interviewer.getState();
  assertions.push({ name: 'live-interview-complete', status: state.is_complete ? 'pass' : 'fail', severity: 'critical', evidence: `${state.turn_count} turns` });
  events.writeAssertion('live-interview-complete', state.is_complete ? 'pass' : 'fail', 'critical', { turn_count: state.turn_count });

  if (!state.is_complete) {
    recordFailure('critical', 'interview', 'Interview did not complete');
  }
  if (!state.metacognition?.confirmation_checkpoints?.some(checkpoint => checkpoint.type === 'draft' && checkpoint.accepted)) {
    recordFailure('critical', 'interview', 'Full Taste Composition ended without an accepted draft checkpoint');
  }
  if ((state.metacognition?.fatigue_events?.length ?? 0) === 0) {
    recordFailure('warning', 'interview', 'No fatigue event recorded during demanding persona interview');
  }

  await runArtifactLifecycle({
    options,
    outputDir,
    workspaceDir,
    tastekitDir,
    session,
    transcriptSamples,
    assertions,
    failures,
    events,
    recordFailure,
    startedAt,
  });
}
```

- [ ] **Step 3: Add the local YAML renderer used by the harness config**

Add this helper below `runLiveE2E`:

```js
function renderTastekitYaml(config) {
  return [
    `version: "${config.version}"`,
    `project_name: ${config.project_name}`,
    `created_at: "${config.created_at}"`,
    `domain_id: ${config.domain_id}`,
    'onboarding:',
    `  depth: ${config.onboarding.depth}`,
    `  completed: ${config.onboarding.completed}`,
    `  session_path: ${config.onboarding.session_path}`,
    'llm_provider:',
    `  provider: ${config.llm_provider.provider}`,
    `  model: ${config.llm_provider.model}`,
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Add the `runArtifactLifecycle` guard that fails clearly during Task 5 verification**

Add this function below `runLiveE2E`:

```js
async function runArtifactLifecycle() {
  throw new Error('Artifact lifecycle is guarded until Task 6 replaces this function.');
}
```

- [ ] **Step 5: Build packages before import verification**

Run:

```bash
pnpm -r build
```

Expected: PASS. If it fails from existing repo changes, stop and fix the build failure before continuing.

- [ ] **Step 6: Run unit tests**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: PASS.

- [ ] **Step 7: Run provider preflight only**

Run:

```bash
node scripts/validation/live-full-composition-e2e.mjs --preflight-only
```

Expected:

- If `OPENAI_API_KEY` or `ZAI_API_KEY` is missing, exit `1` with a clear missing-key message.
- If both are present, exit `0`, create a report directory, and write `report.md`.

- [ ] **Step 8: Commit interview loop wiring**

```bash
git add scripts/validation/live-full-composition-e2e.mjs
git commit -m "feat: run live full composition interview"
```

---

### Task 6: Compile, Validate, Render, Export, And Assert Artifacts

**Files:**
- Modify: `scripts/validation/live-full-composition-e2e.mjs`

- [ ] **Step 1: Add artifact lifecycle imports**

Patch imports:

```js
import {
  assertExtensionPresence,
  assertFile,
  assertRuntimeMarkdown,
  readJson,
} from './lib/live-e2e/artifacts.mjs';
import { runTastekit, runValidator } from './lib/live-e2e/cli-runner.mjs';
```

- [ ] **Step 2: Replace artifact lifecycle guard with compile/validator/export flow**

Replace `runArtifactLifecycle` with:

```js
async function runArtifactLifecycle(ctx) {
  const {
    options,
    outputDir,
    workspaceDir,
    tastekitDir,
    session,
    transcriptSamples,
    assertions,
    events,
    recordFailure,
    startedAt,
  } = ctx;

  const compileResult = await compile({
    workspacePath: tastekitDir,
    session,
    generatorVersion: '0.2.0',
    resume: false,
  });
  events.write('artifact', { kind: 'compile', result: compileResult });
  if (!compileResult.success) {
    recordFailure('critical', 'compile', 'compile() returned unsuccessful result', { errors: compileResult.errors });
    return;
  }

  const constitutionPath = assertFile(join(tastekitDir, 'constitution.v1.json'));
  const constitution = readJson(constitutionPath);
  assertExtensionPresence(constitution);
  assertions.push({ name: 'constitution-extensions', status: 'pass', severity: 'critical', evidence: constitutionPath });
  events.writeAssertion('constitution-extensions', 'pass', 'critical', { path: constitutionPath });

  const validatorResult = await runValidator([constitutionPath, '--json'], { cwd: workspaceDir });
  events.write('artifact', {
    kind: 'validator',
    code: validatorResult.code,
    stdout: validatorResult.stdout,
    stderr: validatorResult.stderr,
  });
  if (validatorResult.code !== 0) {
    recordFailure('critical', 'validator', 'tastekit-validator failed', {
      stdout: validatorResult.stdout,
      stderr: validatorResult.stderr,
    });
  }

  const markdownResults = assertRuntimeMarkdown(workspaceDir, transcriptSamples);
  assertions.push({ name: 'runtime-markdown-safe', status: 'pass', severity: 'critical', evidence: `${markdownResults.length} files` });
  events.writeAssertion('runtime-markdown-safe', 'pass', 'critical', { markdownResults });

  await assertManagedRegionRerun({ workspaceDir, tastekitDir, session, events, recordFailure });

  const exportRoot = join(outputDir, 'exports');
  const targets = [
    ['claude-code', join(exportRoot, 'claude-code')],
    ['openclaw', join(exportRoot, 'openclaw')],
    ['manus', join(exportRoot, 'manus')],
    ['agents-md', join(exportRoot, 'agents-md')],
    ['agent-file', join(exportRoot, 'agent-file')],
  ];
  for (const [target, outDir] of targets) {
    const result = await runTastekit(['export', '--target', target, '--out', outDir], { cwd: workspaceDir });
    events.write('artifact', { kind: 'export', target, code: result.code, stdout: result.stdout, stderr: result.stderr });
    if (result.code !== 0) {
      recordFailure('critical', 'export', `Export failed for ${target}`, { stdout: result.stdout, stderr: result.stderr });
    }
  }

  const importRoundtripDir = join(outputDir, 'import-roundtrip');
  const agentFilePath = join(exportRoot, 'agent-file', 'agent.af');
  if (existsSync(agentFilePath)) {
    const result = await runTastekit(['import', '--target', 'agent-file', '--source', agentFilePath], { cwd: importRoundtripDir });
    events.write('artifact', { kind: 'import-roundtrip', code: result.code, stdout: result.stdout, stderr: result.stderr });
    if (result.code !== 0) {
      recordFailure('critical', 'import', 'Agent File import roundtrip failed', { stdout: result.stdout, stderr: result.stderr });
    }
  } else {
    recordFailure('critical', 'import', 'Agent File export missing, cannot run import roundtrip');
  }

  await runDownstreamChecks({
    options,
    outputDir,
    workspaceDir,
    tastekitDir,
    constitution,
    assertions,
    events,
    recordFailure,
    startedAt,
  });
}
```

- [ ] **Step 3: Add managed-region rerun assertion**

Add below `runArtifactLifecycle`:

```js
async function assertManagedRegionRerun({ workspaceDir, tastekitDir, session, events, recordFailure }) {
  const soulPath = join(workspaceDir, 'SOUL.md');
  const agentsPath = join(workspaceDir, 'AGENTS.md');
  const manualSoul = '# Manual Soul\n\nKeep this hand-written SOUL section.\n\n';
  const manualAgents = '# Manual Agents\n\nKeep this hand-written AGENTS section.\n\n';
  writeFileSync(soulPath, manualSoul + readFileSync(soulPath, 'utf-8'), 'utf-8');
  writeFileSync(agentsPath, manualAgents + readFileSync(agentsPath, 'utf-8'), 'utf-8');

  const rerun = await compile({
    workspacePath: tastekitDir,
    session,
    generatorVersion: '0.2.0',
    resume: false,
  });
  events.write('artifact', { kind: 'compile-rerun', result: rerun });
  if (!rerun.success) {
    recordFailure('critical', 'compile', 'compile rerun failed during managed-region check', { errors: rerun.errors });
    return;
  }

  const soul = readFileSync(soulPath, 'utf-8');
  const agents = readFileSync(agentsPath, 'utf-8');
  if (!soul.includes('Keep this hand-written SOUL section.')) {
    recordFailure('critical', 'managed_region', 'SOUL.md manual content was not preserved');
  }
  if (!agents.includes('Keep this hand-written AGENTS section.')) {
    recordFailure('critical', 'managed_region', 'AGENTS.md manual content was not preserved');
  }
}
```

- [ ] **Step 4: Add downstream guard**

Add:

```js
async function runDownstreamChecks() {
  throw new Error('Downstream checks are guarded until Task 7 replaces this function.');
}
```

- [ ] **Step 5: Run unit tests**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: PASS.

- [ ] **Step 6: Run existing compile/export integration tests**

Run:

```bash
pnpm --filter @actrun_ai/tastekit-cli test -- --run tests/integration/compile-output.test.ts tests/integration/export.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit artifact lifecycle**

```bash
git add scripts/validation/live-full-composition-e2e.mjs
git commit -m "feat: validate live e2e artifacts and exports"
```

---

### Task 7: Add Drift, Eval, Trust, Skills Graph, Judge, And Final Report

**Files:**
- Modify: `scripts/validation/live-full-composition-e2e.mjs`
- Modify: `scripts/validation/lib/live-e2e/report.mjs`

- [ ] **Step 1: Add workspace helper imports**

Patch imports:

```js
import { writeSyntheticDriftTrace, writeEvalPack } from './lib/live-e2e/workspace.mjs';
```

- [ ] **Step 2: Replace downstream guard**

Replace `runDownstreamChecks`:

```js
async function runDownstreamChecks(ctx) {
  const {
    options,
    outputDir,
    workspaceDir,
    tastekitDir,
    constitution,
    assertions,
    events,
    recordFailure,
    startedAt,
  } = ctx;

  const downstream = [];

  const skillsGraph = await runTastekit(['skills', 'graph'], { cwd: workspaceDir });
  downstream.push({ name: 'skills graph', status: skillsGraph.code === 0 ? 'pass' : 'fail', summary: (skillsGraph.stdout || skillsGraph.stderr).slice(0, 300) });
  events.write('artifact', { kind: 'skills-graph', code: skillsGraph.code, stdout: skillsGraph.stdout, stderr: skillsGraph.stderr });
  if (skillsGraph.code !== 0) recordFailure('critical', 'skills', 'skills graph failed', { stdout: skillsGraph.stdout, stderr: skillsGraph.stderr });

  const trustInit = await runTastekit(['trust', 'init'], { cwd: workspaceDir });
  events.write('artifact', { kind: 'trust-init', code: trustInit.code, stdout: trustInit.stdout, stderr: trustInit.stderr });
  const trustAudit = await runTastekit(['trust', 'audit'], { cwd: workspaceDir });
  downstream.push({ name: 'trust audit', status: trustAudit.code === 0 ? 'pass' : 'fail', summary: (trustAudit.stdout || trustAudit.stderr).slice(0, 300) });
  events.write('artifact', { kind: 'trust-audit', code: trustAudit.code, stdout: trustAudit.stdout, stderr: trustAudit.stderr });
  if (trustAudit.code !== 0) recordFailure('critical', 'trust', 'trust audit failed', { stdout: trustAudit.stdout, stderr: trustAudit.stderr });

  const tracePath = writeSyntheticDriftTrace(tastekitDir);
  const drift = await runTastekit(['drift', 'detect'], { cwd: workspaceDir });
  downstream.push({ name: 'drift detect', status: drift.code === 0 ? 'pass' : 'fail', summary: (drift.stdout || drift.stderr).slice(0, 300) });
  events.write('artifact', { kind: 'drift-detect', tracePath, code: drift.code, stdout: drift.stdout, stderr: drift.stderr });
  if (drift.code !== 0) recordFailure('critical', 'drift', 'drift detect failed', { stdout: drift.stdout, stderr: drift.stderr });

  const evalPackPath = writeEvalPack(tastekitDir);
  const evalRun = await runTastekit(['eval', 'run', '--pack', evalPackPath, '--format', 'summary'], { cwd: workspaceDir });
  downstream.push({ name: 'eval run', status: evalRun.code === 0 ? 'pass' : 'fail', summary: (evalRun.stdout || evalRun.stderr).slice(0, 300) });
  events.write('artifact', { kind: 'eval-run', evalPackPath, code: evalRun.code, stdout: evalRun.stdout, stderr: evalRun.stderr });
  if (evalRun.code !== 0) recordFailure('critical', 'eval', 'eval run failed', { stdout: evalRun.stdout, stderr: evalRun.stderr });

  const evalReplay = await runTastekit(['eval', 'replay', '--trace', tracePath], { cwd: workspaceDir });
  downstream.push({ name: 'eval replay', status: evalReplay.code === 0 ? 'pass' : 'warn', summary: (evalReplay.stdout || evalReplay.stderr).slice(0, 300) });
  events.write('artifact', { kind: 'eval-replay', code: evalReplay.code, stdout: evalReplay.stdout, stderr: evalReplay.stderr });

  const judge = options.noJudge
    ? null
    : await runJudge({ options, outputDir, workspaceDir, constitution, downstream, events, recordFailure });

  const state = readJson(join(tastekitDir, 'session.json')).interview;
  const report = buildFinalReport({
    options,
    outputDir,
    workspaceDir,
    tastekitDir,
    state,
    constitution,
    assertions,
    failures: ctx.failures,
    downstream,
    judge,
    startedAt,
  });
  writeReports(outputDir, report);
}
```

- [ ] **Step 3: Add GPT-5.5 judge runner**

Add:

```js
async function runJudge({ options, outputDir, workspaceDir, constitution, downstream, events, recordFailure }) {
  const judgePrompt = readFileSync(options.judge, 'utf-8');
  const persona = readFileSync(options.persona, 'utf-8');
  const session = readFileSync(join(workspaceDir, '.tastekit', 'session.json'), 'utf-8');
  const runtimeFiles = ['CLAUDE.md', 'SOUL.md', 'AGENTS.md']
    .map(name => ({ name, path: join(workspaceDir, name) }))
    .filter(file => existsSync(file.path))
    .map(file => `## ${file.name}\n\n${readFileSync(file.path, 'utf-8').slice(0, 12000)}`)
    .join('\n\n');

  const judgeClient = createChatClient({
    name: 'openai-judge',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: options.openaiModel,
  });

  const response = await judgeClient.complete([
    { role: 'system', content: judgePrompt },
    {
      role: 'user',
      content: [
        '# Persona',
        persona,
        '# Session JSON',
        session.slice(0, 24000),
        '# Constitution JSON',
        JSON.stringify(constitution, null, 2).slice(0, 24000),
        '# Runtime Files',
        runtimeFiles,
        '# Downstream Checks',
        JSON.stringify(downstream, null, 2),
      ].join('\n\n'),
    },
  ], { temperature: 0.2, maxTokens: 1800 });

  writeFileSync(join(outputDir, 'judge-report.raw.txt'), response.content, 'utf-8');
  const json = parseJsonObject(response.content);
  writeFileSync(join(outputDir, 'judge-report.json'), JSON.stringify(json, null, 2), 'utf-8');
  events.write('judge_score', json);

  if (json.passed !== true) {
    recordFailure('warning', 'judge', 'GPT-5.5 judge did not pass the run', { judge: json });
  }
  return json;
}

function parseJsonObject(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Judge response did not contain a JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
```

- [ ] **Step 4: Add final report builder**

Add:

```js
function buildFinalReport({ options, outputDir, workspaceDir, tastekitDir, state, constitution, assertions, failures, downstream, judge, startedAt }) {
  const metacognition = constitution.extensions?.['x-tastekit-metacognition'];
  const composition = constitution.extensions?.['x-tastekit-composition'];
  const scoreList = judge?.scores ?? [];
  const judgePassed = judge ? judge.passed === true : false;
  const criticalFailures = failures.filter(failure => failure.severity === 'critical');

  return {
    result: criticalFailures.length > 0 ? 'fail' : judge && !judgePassed ? 'judge-fail' : 'pass',
    metadata: {
      output_dir: outputDir,
      workspace_dir: workspaceDir,
      domain: options.domain,
      depth: publicDepthLabel(options.depth),
      internal_depth: options.depth,
      openai_model: options.openaiModel,
      zai_model: options.zaiModel,
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
    },
    interviewShape: {
      turn_count: state?.turn_count ?? 0,
      stop_reason: state?.is_complete ? 'tastekit-complete' : 'not-complete',
      fatigue_events: metacognition?.fatigue_events?.length ?? 0,
      conflicts: metacognition?.conflicts?.length ?? 0,
      confirmation_checkpoints: metacognition?.confirmation_checkpoints?.length ?? 0,
    },
    tasteSummary: summarizeTaste(composition, constitution),
    assertions,
    failures,
    artifacts: [
      join(tastekitDir, 'session.json'),
      join(tastekitDir, 'constitution.v1.json'),
      join(workspaceDir, 'CLAUDE.md'),
      join(workspaceDir, 'SOUL.md'),
      join(workspaceDir, 'AGENTS.md'),
      join(outputDir, 'exports'),
    ],
    downstream,
    judge,
    releaseInterpretation: judge?.release_interpretation
      ?? (criticalFailures.length > 0
        ? 'This run blocks release confidence because deterministic failures occurred.'
        : 'Deterministic checks passed; judge was disabled or unavailable.'),
    followUps: [
      ...failures.map(failure => `${failure.category}: ${failure.message}`),
      ...scoreList.filter(score => score.score < 4).map(score => `Judge score below 4 for ${score.dimension}: ${score.rationale}`),
    ],
  };
}

function summarizeTaste(composition, constitution) {
  const lines = [];
  if (constitution.principles?.length) {
    lines.push('Principles:');
    for (const principle of constitution.principles.slice(0, 5)) {
      lines.push(`- ${principle.statement}`);
    }
  }
  const dimensions = composition?.dimensions && typeof composition.dimensions === 'object'
    ? Object.values(composition.dimensions)
    : [];
  const summaries = dimensions
    .map(item => item && typeof item === 'object' ? item.summary : undefined)
    .filter(Boolean)
    .slice(0, 6);
  if (summaries.length > 0) {
    lines.push('');
    lines.push('Composition highlights:');
    for (const summary of summaries) lines.push(`- ${summary}`);
  }
  return lines.join('\n');
}
```

- [ ] **Step 5: Ensure final exit code uses judge status**

At the end of `main`, after `runLiveE2E`, load `report.json` if it exists and classify:

```js
const reportPath = join(outputDir, 'report.json');
if (existsSync(reportPath)) {
  const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
  return classifyExitCode({
    failures: report.failures ?? failures,
    judgePassed: report.judge ? report.judge.passed === true : false,
    judgeAvailable: !!report.judge,
  });
}
```

Keep the existing fallback report path for hard harness failures.

- [ ] **Step 6: Run unit tests**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: PASS.

- [ ] **Step 7: Run existing downstream integration tests**

Run:

```bash
pnpm --filter @actrun_ai/tastekit-cli test -- --run tests/integration/skills.test.ts tests/integration/trust.test.ts tests/integration/drift.test.ts tests/integration/eval.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit downstream and report flow**

```bash
git add scripts/validation/live-full-composition-e2e.mjs scripts/validation/lib/live-e2e/report.mjs
git commit -m "feat: add live e2e downstream checks and reporting"
```

---

### Task 8: Final Verification And Live Run

**Files:**
- No planned production edits.
- Generated evidence: `docs/validation/live/full-composition-YYYYMMDD-HHMMSS/`

- [ ] **Step 1: Run fast harness tests**

Run:

```bash
pnpm test:live-e2e:unit
```

Expected: PASS.

- [ ] **Step 2: Run full deterministic release checks before spending live model credits**

Run:

```bash
pnpm -r build
pnpm lint
node scripts/skill-bundle/sync.mjs --check
bash scripts/validation/pr-gate.sh
```

Expected: PASS. If any command fails, fix that deterministic failure before running live E2E.

- [ ] **Step 3: Run provider preflight**

Run:

```bash
node scripts/validation/live-full-composition-e2e.mjs --preflight-only
```

Expected with keys present:

- Exit `0`.
- `report.md` exists.
- `transcript.jsonl` includes two `preflight` events.
- The printed Z.ai endpoint is `https://api.z.ai/api/coding/paas/v4/chat/completions` unless `ZAI_BASE_URL` overrides it.

- [ ] **Step 4: Run full live E2E**

Run:

```bash
node scripts/validation/live-full-composition-e2e.mjs \
  --domain general-agent \
  --depth full-taste-composition
```

Expected:

- Exit `0` when deterministic checks and judge threshold pass.
- Exit `2` when deterministic checks pass but the judge says the product quality is not release-ready.
- Exit `1` for provider, harness, artifact, validation, export, or critical deterministic failures.

- [ ] **Step 5: Inspect report and artifacts**

Open the generated `report.md` and verify these sections are populated:

- Run Metadata.
- Interview Shape.
- Taste Extracted.
- Deterministic Assertions.
- Artifact Inventory.
- Judge Results.
- Drift And Eval Results.
- Release Interpretation.
- Follow-Ups.

Also inspect:

```bash
ls docs/validation/live/full-composition-*/workspace/.tastekit
ls docs/validation/live/full-composition-*/exports
```

Expected:

- `.tastekit/session.json` exists.
- `.tastekit/constitution.v1.json` exists.
- `CLAUDE.md`, `SOUL.md`, and `AGENTS.md` exist in the generated workspace.
- Export directories exist for Claude Code, OpenClaw, Manus, AGENTS.md, and Agent File.

- [ ] **Step 6: Dispatch a fresh reviewer session**

Use a fresh Codex session with no inherited context. Give it:

```text
Review the TasteKit live E2E report and artifacts in:
<absolute path to docs/validation/live/full-composition-YYYYMMDD-HHMMSS/>

Judge whether the run proves TasteKit's real-world value as an agent-native Full Taste Composition onboarding flow. Focus on shallow interview behavior, missing taste signal, transcript leaks, unsafe artifacts, weak autonomy boundaries, and whether the report's release interpretation is justified.

Do not edit files. Return findings ordered by severity with file paths and evidence.
```

Expected: reviewer returns either no release-blocking findings or concrete issues to fix.

- [ ] **Step 7: Commit harness completion**

If the harness code is stable and deterministic checks pass:

```bash
git add scripts/validation docs/validation/live package.json .gitignore
git commit -m "feat: add live llm full composition e2e"
```

Do not commit generated `docs/validation/live/full-composition-*` evidence unless the user explicitly asks to keep that run in git.

---

## Self-Review Checklist

Spec coverage:

- Live GPT-5.5 interviewer and GLM-5.1 simulated human: Tasks 4 and 5.
- No scripted answers: Task 5 uses only persona prompt plus live model replies.
- Z.ai exact endpoint and preflight: Tasks 2 and 4.
- Session and constitution assertions: Tasks 5 and 6.
- Runtime markdown leak checks and managed-region rerun: Task 6.
- Exports for Claude Code, OpenClaw, Manus, AGENTS.md, and Agent File: Task 6.
- Drift, eval, trust, and skills graph: Task 7.
- GPT-5.5 judge and score threshold: Task 7.
- Report directory and reviewable `report.md`: Tasks 2, 4, and 7.
- Fresh reviewer session: Task 8.

Completion scan:

- No banned marker strings or unspecified implementation steps are intentionally present.
- Every created file has exact responsibility and executable commands.
- The live API calls are not part of fast unit tests.

Type and naming consistency:

- User-facing maximum depth is `Full Taste Composition`.
- Internal depth value is `operator`.
- Canonical session path is `.tastekit/session.json`.
- Canonical constitution path is `.tastekit/constitution.v1.json`.
- Generated evidence directory is `docs/validation/live/full-composition-YYYYMMDD-HHMMSS/`.

## Execution Recommendation

Use subagent-driven execution only where it is cleanly bounded:

- Main session owns Task 1, Task 4, Task 5, Task 8 because they define and validate the critical harness path.
- A worker can own Task 2 helper modules because the write scope is isolated under `scripts/validation/lib/live-e2e/`.
- A worker can own Task 3 prompts/docs because the write scope is isolated under `docs/validation/live/`.
- A worker can review Task 7 report semantics after the main session wires it, but the main session should integrate judge and downstream behavior.

Do not run multiple live interviews in parallel. The live test is sequential by design to avoid provider/concurrency noise and to keep the transcript auditable.
