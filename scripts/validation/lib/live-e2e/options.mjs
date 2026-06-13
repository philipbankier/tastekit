import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_PERSONA_PATH = 'docs/validation/live/full-composition-persona.md';
export const DEFAULT_JUDGE_PATH = 'docs/validation/live/full-composition-judge-rubric.md';
export const DEFAULT_ZAI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_CLIPROXY_OPENAI_BASE_URL = 'http://127.0.0.1:8317/v1';
export const DEFAULT_CLIPROXY_KEY_FILE = join(homedir(), '.cli-proxy-api', 'client_api_key');

const DEPTHS = new Set(['quick', 'guided', 'operator', 'full', 'full-taste-composition']);

export function normalizeHarnessDepth(value) {
  if (value === 'full' || value === 'full-taste-composition') return 'operator';
  if (value === 'quick' || value === 'guided' || value === 'operator') return value;
  throw new Error(`Unsupported depth: ${value}`);
}

export function publicDepthLabel(depth) {
  switch (depth) {
    case 'quick':
      return 'Quick';
    case 'guided':
      return 'Guided';
    case 'operator':
      return 'Full Taste Composition';
    default:
      throw new Error(`Unsupported normalized depth: ${depth}`);
  }
}

export function resolveProviderKeys(env = process.env, options = {}) {
  const openaiFileKey = readProviderKeyFile(options.openaiKeyFile || env.OPENAI_API_KEY_FILE);
  const zaiFileKey = readProviderKeyFile(options.zaiKeyFile || env.ZAI_API_KEY_FILE || env.Z_AI_API_KEY_FILE);
  const openaiKey = normalizeProviderKey(env.OPENAI_API_KEY) || openaiFileKey;
  const zaiApiKey = normalizeProviderKey(env.ZAI_API_KEY);
  const legacyZaiApiKey = normalizeProviderKey(env.Z_AI_API_KEY);
  const zaiKey = zaiApiKey || legacyZaiApiKey;
  const zaiSource = zaiApiKey ? 'ZAI_API_KEY' : legacyZaiApiKey ? 'Z_AI_API_KEY' : undefined;
  return {
    openaiKey,
    openaiSource: normalizeProviderKey(env.OPENAI_API_KEY) ? 'OPENAI_API_KEY' : openaiFileKey ? 'OPENAI_API_KEY_FILE' : undefined,
    zaiKey: zaiKey || zaiFileKey,
    zaiSource: zaiSource || (zaiFileKey ? 'ZAI_API_KEY_FILE' : undefined),
  };
}

function readProviderKeyFile(path) {
  const expanded = expandHome(path?.trim());
  if (!expanded || !existsSync(expanded)) return undefined;
  return normalizeProviderKey(readFileSync(expanded, 'utf-8'));
}

function expandHome(path) {
  if (!path) return undefined;
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

function normalizeProviderKey(value) {
  const trimmed = value?.trim();
  if (!trimmed || isPlaceholderProviderKey(trimmed)) return undefined;
  return trimmed;
}

function isPlaceholderProviderKey(value) {
  const normalized = value.toLowerCase();
  const sentinelValues = new Set(['missing', 'none', 'null', 'undefined', 'todo', 'tbd', 'xxx', 'example']);
  return normalized.includes('your_')
    || normalized.includes('your-')
    || normalized.includes('replace-me')
    || normalized.includes('changeme')
    || normalized.includes('placeholder')
    || sentinelValues.has(normalized)
    || /^<.*>$/.test(normalized);
}

export function resolveMaxTurns(maxTurns, dimensionCount) {
  if (maxTurns !== 'auto') return maxTurns;
  const count = Number.isFinite(dimensionCount) ? Math.max(0, dimensionCount) : 0;
  return Math.max(90, count * 4);
}

export function usage() {
  return [
    'Usage: node scripts/validation/live-full-composition-e2e.mjs [options]',
    '',
    'Options:',
    '  --domain <id>             Domain to interview, default general-agent',
    '  --depth <depth>           quick, guided, full, full-taste-composition, or operator',
    '  --output <dir>            Validation output directory',
    '  --env-file <path>         Load provider keys/options from a local .env file',
    '  --max-turns <n|auto>      Override safety ceiling',
    '  --persona <path>          Persona prompt markdown',
    '  --judge <path>            Judge rubric markdown',
    '  --keep-invalid            Preserve invalid artifacts for review, default on',
    '  --no-judge                Skip qualitative GPT-5.5 judge',
    '  --preflight-only          Check providers and exit before interview',
    '  --mock-provider-smoke     Mark this as a deterministic local mock-provider smoke, not release evidence',
    '  --cliproxy-openai         Use local CLIProxyAPI for interviewer/judge defaults',
    '  --zai-base-url <url>      Exact Z.ai base URL before /chat/completions',
    '  --zai-key-file <path>     Load Z.ai key from a local ignored file',
    '  --zai-model <id>          GLM model, default glm-5.1',
    '  --zai-thinking <mode>     Z.ai thinking type, default disabled',
    '  --openai-base-url <url>   OpenAI-compatible base URL, default https://api.openai.com/v1',
    '  --openai-key-file <path>  Load OpenAI-compatible key from a local ignored file',
    '  --openai-model <id>       Interviewer/judge model, default gpt-5.5',
    '  --help                    Print this help',
  ].join('\n');
}

export function parseArgs(argv) {
  const opts = {
    domain: 'general-agent',
    depthInput: 'full-taste-composition',
    depth: 'operator',
    output: process.env.LIVE_E2E_OUTPUT_DIR || undefined,
    envFile: process.env.LIVE_E2E_ENV_FILE || undefined,
    maxTurns: 'auto',
    persona: DEFAULT_PERSONA_PATH,
    judge: DEFAULT_JUDGE_PATH,
    keepInvalid: true,
    noJudge: false,
    preflightOnly: false,
    mockProviderSmoke: false,
    zaiBaseUrl: process.env.ZAI_BASE_URL || DEFAULT_ZAI_BASE_URL,
    zaiModel: process.env.ZAI_MODEL || 'glm-5.1',
    zaiThinking: process.env.ZAI_THINKING || 'disabled',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-5.5',
    openaiKeyFile: process.env.OPENAI_API_KEY_FILE || undefined,
    openaiSystemRole: 'developer',
    zaiKeyFile: process.env.ZAI_API_KEY_FILE || process.env.Z_AI_API_KEY_FILE || undefined,
    cliproxyOpenai: false,
    help: false,
  };
  const explicit = {
    openaiBaseUrl: false,
    openaiModel: false,
    openaiKeyFile: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const readValue = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return value;
    };

    switch (arg) {
      case '--domain':
        opts.domain = readValue();
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
      case '--env-file':
        opts.envFile = readValue();
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
      case '--keep-invalid':
        opts.keepInvalid = true;
        break;
      case '--no-judge':
        opts.noJudge = true;
        break;
      case '--preflight-only':
        opts.preflightOnly = true;
        break;
      case '--mock-provider-smoke':
        opts.mockProviderSmoke = true;
        break;
      case '--cliproxy-openai':
        opts.cliproxyOpenai = true;
        break;
      case '--zai-base-url':
        opts.zaiBaseUrl = readValue();
        break;
      case '--zai-model':
        opts.zaiModel = readValue();
        break;
      case '--zai-thinking':
        opts.zaiThinking = readValue();
        break;
      case '--openai-base-url':
        opts.openaiBaseUrl = readValue();
        explicit.openaiBaseUrl = true;
        break;
      case '--openai-model':
        opts.openaiModel = readValue();
        explicit.openaiModel = true;
        break;
      case '--openai-key-file':
        opts.openaiKeyFile = readValue();
        explicit.openaiKeyFile = true;
        break;
      case '--zai-key-file':
        opts.zaiKeyFile = readValue();
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (opts.cliproxyOpenai) {
    if (!explicit.openaiBaseUrl) opts.openaiBaseUrl = DEFAULT_CLIPROXY_OPENAI_BASE_URL;
    if (!explicit.openaiModel) opts.openaiModel = 'grok-4.3';
    if (!explicit.openaiKeyFile && !process.env.OPENAI_API_KEY) opts.openaiKeyFile = DEFAULT_CLIPROXY_KEY_FILE;
    opts.openaiSystemRole = 'system';
  }

  return opts;
}
