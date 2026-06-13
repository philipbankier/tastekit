import { existsSync, readFileSync } from 'node:fs';

export const DEFAULT_LIVE_ENV_FILE = 'docs/validation/live/tastekit-live.env';

export function findEnvFileArg(argv, env = process.env, { defaultPath = DEFAULT_LIVE_ENV_FILE } = {}) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--env-file') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing value for --env-file');
      return value;
    }
  }
  if (env.LIVE_E2E_ENV_FILE) return env.LIVE_E2E_ENV_FILE;
  return existsSync(defaultPath) ? defaultPath : undefined;
}

export function parseEnvFile(content) {
  const parsed = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) throw new Error(`Invalid env file line: ${rawLine}`);
    const [, key, rawValue] = match;
    parsed[key] = parseEnvValue(rawValue);
  }
  return parsed;
}

export function loadEnvFile(path, { env = process.env, override = false } = {}) {
  if (!path) return { path, loaded: [], skipped: [] };
  if (!existsSync(path)) throw new Error(`Env file not found: ${path}`);
  const parsed = parseEnvFile(readFileSync(path, 'utf-8'));
  const loaded = [];
  const skipped = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (!override && env[key] !== undefined) {
      skipped.push(key);
      continue;
    }
    env[key] = value;
    loaded.push(key);
  }
  return { path, loaded, skipped };
}

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  const commentIndex = trimmed.search(/\s#/);
  return commentIndex === -1 ? trimmed : trimmed.slice(0, commentIndex).trim();
}
