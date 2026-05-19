#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_LIVE_ENV_FILE, parseEnvFile } from './lib/live-e2e/env-file.mjs';
import { DEFAULT_CLIPROXY_KEY_FILE, DEFAULT_CLIPROXY_OPENAI_BASE_URL } from './lib/live-e2e/options.mjs';

function main(argv) {
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
    return 0;
  }

  try {
    const zaiKey = resolveZaiKey(options);
    if (!zaiKey) throw new Error('No Z.ai key provided. Use --zai-key-stdin, --zai-key-file <path>, or run interactively.');

    const env = readExistingEnv(options.envFile);
    env.ZAI_API_KEY = zaiKey;
    env.ZAI_BASE_URL ??= 'https://api.z.ai/api/coding/paas/v4';
    env.ZAI_MODEL ??= 'glm-5.1';
    env.ZAI_THINKING ??= 'disabled';

    if (options.subscriptionDemo) {
      env.OPENAI_API_KEY_FILE ??= DEFAULT_CLIPROXY_KEY_FILE;
      env.OPENAI_BASE_URL = DEFAULT_CLIPROXY_OPENAI_BASE_URL;
      env.OPENAI_MODEL = options.cliproxyModel;
    } else {
      env.OPENAI_API_KEY ??= '';
      env.OPENAI_BASE_URL ??= 'https://api.openai.com/v1';
      env.OPENAI_MODEL ??= 'gpt-5.5';
    }

    writeEnvFile(options.envFile, env, { subscriptionDemo: options.subscriptionDemo });
    console.log(`Wrote ${options.envFile}`);
    console.log(`ZAI_API_KEY: set length=${zaiKey.length}`);
    if (options.subscriptionDemo) {
      console.log(`OPENAI_API_KEY_FILE: ${env.OPENAI_API_KEY_FILE}`);
      console.log(`OPENAI_BASE_URL: ${env.OPENAI_BASE_URL}`);
      console.log(`OPENAI_MODEL: ${env.OPENAI_MODEL}`);
      console.log('Next: pnpm test:live-e2e:subscription-demo');
    } else {
      console.log('Next: pnpm test:live-e2e:preflight');
    }
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv) {
  const options = {
    envFile: DEFAULT_LIVE_ENV_FILE,
    zaiKeyFile: undefined,
    zaiKeyStdin: false,
    subscriptionDemo: false,
    cliproxyModel: 'grok-4.3',
    help: false,
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
      case '--output-env-file':
        options.envFile = readValue();
        break;
      case '--zai-key-file':
        options.zaiKeyFile = readValue();
        break;
      case '--zai-key-stdin':
        options.zaiKeyStdin = true;
        break;
      case '--subscription-demo':
        options.subscriptionDemo = true;
        break;
      case '--cliproxy-model':
        options.cliproxyModel = readValue();
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function resolveZaiKey(options) {
  if (options.zaiKeyFile) return normalizeKey(readFileSync(options.zaiKeyFile, 'utf-8'));
  if (options.zaiKeyStdin) return normalizeKey(readFileSync(0, 'utf-8'));
  if (!process.stdin.isTTY) return normalizeKey(readFileSync(0, 'utf-8'));
  return readSecret('ZAI_API_KEY: ');
}

function normalizeKey(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readSecret(prompt) {
  process.stdout.write(prompt);
  try {
    execFileSync('stty', ['-echo'], { stdio: ['inherit', 'ignore', 'ignore'] });
    const input = readFileSync(0, 'utf-8');
    process.stdout.write('\n');
    return normalizeKey(input);
  } finally {
    try {
      execFileSync('stty', ['echo'], { stdio: ['inherit', 'ignore', 'ignore'] });
    } catch {
      // Best-effort restoration. If this fails the terminal likely is not a TTY.
    }
  }
}

function readExistingEnv(path) {
  if (!existsSync(path)) return {};
  return parseEnvFile(readFileSync(path, 'utf-8'));
}

function writeEnvFile(path, env, { subscriptionDemo }) {
  mkdirSync(dirname(path), { recursive: true });
  const lines = [
    '# Local TasteKit live validation env.',
    '# This file is gitignored. Do not commit real provider keys.',
    '',
    `ZAI_API_KEY=${shellEscapeEnvValue(env.ZAI_API_KEY)}`,
    `ZAI_BASE_URL=${env.ZAI_BASE_URL}`,
    `ZAI_MODEL=${env.ZAI_MODEL}`,
    `ZAI_THINKING=${env.ZAI_THINKING}`,
    '',
  ];
  if (subscriptionDemo) {
    lines.push(
      '# Local CLIProxyAPI-backed interviewer/judge for subscription demo evidence.',
      `OPENAI_API_KEY_FILE=${env.OPENAI_API_KEY_FILE}`,
      `OPENAI_BASE_URL=${env.OPENAI_BASE_URL}`,
      `OPENAI_MODEL=${env.OPENAI_MODEL}`,
    );
  } else {
    lines.push(
      '# Official release evidence also requires an OpenAI API key.',
      `OPENAI_API_KEY=${shellEscapeEnvValue(env.OPENAI_API_KEY ?? '')}`,
      `OPENAI_BASE_URL=${env.OPENAI_BASE_URL}`,
      `OPENAI_MODEL=${env.OPENAI_MODEL}`,
    );
  }
  lines.push('');
  writeFileSync(path, lines.join('\n'), { encoding: 'utf-8', flag: 'w', mode: 0o600 });
}

function shellEscapeEnvValue(value) {
  const text = String(value);
  if (/^[A-Za-z0-9._~+/@:=,-]*$/.test(text)) return text;
  return JSON.stringify(text);
}

function usage() {
  return [
    'Usage: node scripts/validation/configure-live-env.mjs [options]',
    '',
    'Safely writes the ignored TasteKit live validation env file without putting secrets in chat or shell args.',
    '',
    'Options:',
    '  --subscription-demo      Configure local CLIProxyAPI interviewer/judge defaults',
    '  --output-env-file <path> Env file to write, default docs/validation/live/tastekit-live.env',
    '  --zai-key-stdin          Read Z.ai key from stdin',
    '  --zai-key-file <path>    Read Z.ai key from a local file',
    '  --cliproxy-model <id>    CLIProxyAPI model for subscription demo, default grok-4.3',
    '  --help                   Print this help',
    '',
    'Examples:',
    '  printf "%s" "$ZAI_API_KEY" | node scripts/validation/configure-live-env.mjs --subscription-demo --zai-key-stdin',
    '  node scripts/validation/configure-live-env.mjs --subscription-demo',
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
