import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { findEnvFileArg, loadEnvFile, parseEnvFile } from '../lib/live-e2e/env-file.mjs';
import {
  DEFAULT_CLIPROXY_KEY_FILE,
  DEFAULT_CLIPROXY_OPENAI_BASE_URL,
  parseArgs,
  normalizeHarnessDepth,
  publicDepthLabel,
  resolveMaxTurns,
  resolveProviderKeys,
  usage,
} from '../lib/live-e2e/options.mjs';

test('parseArgs applies spec defaults', () => {
  const opts = parseArgs([]);
  assert.equal(opts.domain, 'general-agent');
  assert.equal(opts.depth, 'operator');
  assert.equal(opts.depthInput, 'full-taste-composition');
  assert.equal(opts.output, undefined);
  assert.equal(opts.keepInvalid, true);
  assert.equal(opts.noJudge, false);
  assert.equal(opts.zaiBaseUrl, 'https://api.z.ai/api/coding/paas/v4');
  assert.equal(opts.openaiModel, 'gpt-5.5');
  assert.equal(opts.zaiModel, 'glm-5.1');
});

test('parseArgs preserves explicit endpoint and control flags', () => {
  const opts = parseArgs([
    '--domain', 'development-agent',
    '--depth', 'full',
    '--output', '/tmp/tastekit-live',
    '--env-file', '/tmp/tastekit-live.env',
    '--max-turns', '120',
    '--no-judge',
    '--preflight-only',
    '--mock-provider-smoke',
    '--keep-invalid',
    '--openai-key-file', '/tmp/openai.key',
    '--zai-key-file', '/tmp/zai.key',
    '--zai-base-url', 'https://api.z.ai/api/paas/v4',
    '--zai-model', 'glm-5.1-air',
    '--zai-thinking', 'enabled',
    '--openai-base-url', 'https://gateway.example/v1',
    '--openai-model', 'gpt-5.5',
  ]);
  assert.equal(opts.domain, 'development-agent');
  assert.equal(opts.depth, 'operator');
  assert.equal(opts.depthInput, 'full');
  assert.equal(opts.output, '/tmp/tastekit-live');
  assert.equal(opts.envFile, '/tmp/tastekit-live.env');
  assert.equal(opts.maxTurns, 120);
  assert.equal(opts.noJudge, true);
  assert.equal(opts.preflightOnly, true);
  assert.equal(opts.mockProviderSmoke, true);
  assert.equal(opts.keepInvalid, true);
  assert.equal(opts.zaiBaseUrl, 'https://api.z.ai/api/paas/v4');
  assert.equal(opts.zaiModel, 'glm-5.1-air');
  assert.equal(opts.zaiThinking, 'enabled');
  assert.equal(opts.openaiBaseUrl, 'https://gateway.example/v1');
  assert.equal(opts.openaiKeyFile, '/tmp/openai.key');
  assert.equal(opts.zaiKeyFile, '/tmp/zai.key');
});

test('parseArgs supports local CLIProxyAPI-backed interviewer defaults for subscription demos', () => {
  const opts = parseArgs(['--cliproxy-openai']);
  assert.equal(opts.cliproxyOpenai, true);
  assert.equal(opts.openaiBaseUrl, DEFAULT_CLIPROXY_OPENAI_BASE_URL);
  assert.equal(opts.openaiModel, 'grok-4.3');
  assert.equal(opts.openaiKeyFile, DEFAULT_CLIPROXY_KEY_FILE);
  assert.equal(opts.openaiSystemRole, 'system');
});

test('parseArgs lets explicit CLIProxyAPI mode override env-file OpenAI defaults', () => {
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  const originalModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
  process.env.OPENAI_MODEL = 'gpt-5.5';
  try {
    const opts = parseArgs(['--cliproxy-openai']);
    assert.equal(opts.openaiBaseUrl, DEFAULT_CLIPROXY_OPENAI_BASE_URL);
    assert.equal(opts.openaiModel, 'grok-4.3');
  } finally {
    if (originalBaseUrl === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = originalBaseUrl;
    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
  }
});

test('parseArgs supports LIVE_E2E_OUTPUT_DIR', () => {
  const original = process.env.LIVE_E2E_OUTPUT_DIR;
  process.env.LIVE_E2E_OUTPUT_DIR = '/tmp/tastekit-env-output';
  try {
    assert.equal(parseArgs([]).output, '/tmp/tastekit-env-output');
  } finally {
    if (original === undefined) {
      delete process.env.LIVE_E2E_OUTPUT_DIR;
    } else {
      process.env.LIVE_E2E_OUTPUT_DIR = original;
    }
  }
});

test('env file helpers parse dotenv-style provider settings without overriding existing env by default', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-env-'));
  const path = join(dir, '.env.live');
  try {
    writeFileSync(path, [
      'OPENAI_API_KEY=openai-from-file',
      'export Z_AI_API_KEY=\"zai from file\"',
      'ZAI_MODEL=glm-5.1 # comment',
      '',
    ].join('\n'), 'utf-8');
    assert.deepEqual(parseEnvFile('A=1\nB=\"two words\"\nC=three # comment'), {
      A: '1',
      B: 'two words',
      C: 'three',
    });
    const env = { OPENAI_API_KEY: 'existing-openai' };
    const result = loadEnvFile(path, { env });
    assert.deepEqual(result.loaded.sort(), ['ZAI_MODEL', 'Z_AI_API_KEY'].sort());
    assert.deepEqual(result.skipped, ['OPENAI_API_KEY']);
    assert.equal(env.OPENAI_API_KEY, 'existing-openai');
    assert.equal(env.Z_AI_API_KEY, 'zai from file');
    assert.equal(env.ZAI_MODEL, 'glm-5.1');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findEnvFileArg supports CLI flag and LIVE_E2E_ENV_FILE', () => {
  assert.equal(findEnvFileArg(['--env-file', '/tmp/live.env']), '/tmp/live.env');
  assert.equal(findEnvFileArg([], { LIVE_E2E_ENV_FILE: '/tmp/from-env' }), '/tmp/from-env');
  assert.throws(() => findEnvFileArg(['--env-file']), /Missing value/);
});

test('findEnvFileArg auto-loads the ignored default live env file when present', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-env-default-'));
  const defaultPath = join(dir, 'docs', 'validation', 'live', 'tastekit-live.env');
  try {
    mkdirSync(join(dir, 'docs', 'validation', 'live'), { recursive: true });
    writeFileSync(defaultPath, 'OPENAI_API_KEY=from-default\n', { encoding: 'utf-8', flag: 'w' });
    assert.equal(findEnvFileArg([], {}, { defaultPath }), defaultPath);
    assert.equal(findEnvFileArg([], { LIVE_E2E_ENV_FILE: '/tmp/from-env' }, { defaultPath }), '/tmp/from-env');
    assert.equal(findEnvFileArg(['--env-file', '/tmp/from-flag'], {}, { defaultPath }), '/tmp/from-flag');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveProviderKeys accepts the Z.ai legacy env alias without weakening OpenAI routing', () => {
  const keys = resolveProviderKeys({
    OPENAI_API_KEY: 'openai-secret',
    Z_AI_API_KEY: 'legacy-zai-secret',
  });
  assert.equal(keys.openaiKey, 'openai-secret');
  assert.equal(keys.openaiSource, 'OPENAI_API_KEY');
  assert.equal(keys.zaiKey, 'legacy-zai-secret');
  assert.equal(keys.zaiSource, 'Z_AI_API_KEY');
});

test('resolveProviderKeys can load provider keys from local key files without printing them', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-provider-key-files-'));
  const openaiKeyFile = join(dir, 'openai.key');
  const zaiKeyFile = join(dir, 'zai.key');
  try {
    writeFileSync(openaiKeyFile, 'cliproxy-client-key\n', 'utf-8');
    writeFileSync(zaiKeyFile, 'zai-live-key\n', 'utf-8');
    const keys = resolveProviderKeys({}, { openaiKeyFile, zaiKeyFile });
    assert.equal(keys.openaiKey, 'cliproxy-client-key');
    assert.equal(keys.openaiSource, 'OPENAI_API_KEY_FILE');
    assert.equal(keys.zaiKey, 'zai-live-key');
    assert.equal(keys.zaiSource, 'ZAI_API_KEY_FILE');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveProviderKeys treats copied example placeholders as missing credentials', () => {
  const keys = resolveProviderKeys({
    OPENAI_API_KEY: 'your_openai_api_key_here',
    ZAI_API_KEY: '<your-zai-api-key>',
    Z_AI_API_KEY: 'replace-me',
  });
  assert.equal(keys.openaiKey, undefined);
  assert.equal(keys.zaiKey, undefined);
  assert.equal(keys.zaiSource, undefined);
});

test('resolveProviderKeys treats plain missing-value sentinels as missing credentials', () => {
  for (const sentinel of ['missing', 'none', 'null', 'undefined', 'todo', 'tbd', 'xxx', 'example']) {
    const keys = resolveProviderKeys({
      OPENAI_API_KEY: sentinel,
      ZAI_API_KEY: sentinel,
      Z_AI_API_KEY: sentinel,
    });
    assert.equal(keys.openaiKey, undefined, sentinel);
    assert.equal(keys.zaiKey, undefined, sentinel);
    assert.equal(keys.zaiSource, undefined, sentinel);
  }
});

test('resolveProviderKeys keeps real-looking credentials with placeholder words embedded', () => {
  const keys = resolveProviderKeys({
    OPENAI_API_KEY: 'sk-live-example-token-value-123456',
    ZAI_API_KEY: 'zai-live-token-with-example-fragment-123456',
  });
  assert.equal(keys.openaiKey, 'sk-live-example-token-value-123456');
  assert.equal(keys.zaiKey, 'zai-live-token-with-example-fragment-123456');
  assert.equal(keys.zaiSource, 'ZAI_API_KEY');
});

test('resolveMaxTurns keeps Full Taste Composition coverage-driven with a runaway ceiling', () => {
  assert.equal(resolveMaxTurns('auto', 24), 96);
  assert.equal(resolveMaxTurns('auto', 7), 90);
  assert.equal(resolveMaxTurns(12, 24), 12);
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

test('main harness prints help', () => {
  assert.equal(existsSync('scripts/validation/live-full-composition-e2e.mjs'), true);
  const result = spawnSync(process.execPath, ['scripts/validation/live-full-composition-e2e.mjs', '--help'], {
    encoding: 'utf-8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Full Taste Composition/i);
  assert.match(result.stdout, /--preflight-only/);
  assert.match(result.stdout, /--mock-provider-smoke/);
  assert.match(result.stdout, /--env-file/);
  assert.match(result.stdout, /--openai-base-url/);
  assert.match(result.stdout, /--zai-thinking/);
});

test('missing credential preflight report includes copy-paste recovery steps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-missing-keys-report-'));
  const envPath = join(dir, 'tastekit-live.env');
  const outputDir = join(dir, 'run');
  try {
    writeFileSync(envPath, [
      'OPENAI_API_KEY=your_openai_api_key_here',
      'ZAI_API_KEY=<your-zai-api-key>',
      '',
    ].join('\n'), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/live-full-composition-e2e.mjs',
      '--preflight-only',
      '--env-file',
      envPath,
      '--output',
      outputDir,
    ], {
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
      },
    });
    assert.equal(result.status, 1);
    const report = readFileSync(join(outputDir, 'report.md'), 'utf-8');
    const reportJson = JSON.parse(readFileSync(join(outputDir, 'report.json'), 'utf-8'));
    assert.match(report, new RegExp(`credential_env_file: ${escapeRegExp(envPath)}`));
    assert.match(report, /credential_openai_key: missing/);
    assert.match(report, /credential_zai_key: missing/);
    assert.deepEqual(reportJson.assertions, [{
      name: 'credential-preflight',
      status: 'fail',
      severity: 'critical',
      evidence: 'OPENAI_API_KEY and ZAI_API_KEY or Z_AI_API_KEY missing',
    }]);
    assert.deepEqual(reportJson.verificationCommands, ['pnpm test:live-e2e:preflight']);
    assert.doesNotMatch(readFileSync(join(outputDir, 'demo.md'), 'utf-8'), /No deterministic validation evidence was available/);
    assert.doesNotMatch(readFileSync(join(outputDir, 'demo.md'), 'utf-8'), /No reproduction commands were recorded/);
    assert.match(report, /cp docs\/validation\/live\/tastekit-live\.env\.example docs\/validation\/live\/tastekit-live\.env/);
    assert.match(report, /Fill OPENAI_API_KEY and ZAI_API_KEY/);
    assert.match(report, /pnpm test:live-e2e:preflight/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('package scripts expose explicit live preflight and full-run entrypoints', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  assert.match(pkg.scripts['test:live-e2e:preflight'], /--preflight-only/);
  assert.match(pkg.scripts['test:live-e2e'], /live-full-composition-e2e\.mjs/);
  assert.match(pkg.scripts['test:live-e2e:diagnostics'], /live-provider-diagnostics\.mjs/);
  assert.match(pkg.scripts['test:live-e2e:assert-latest'], /assert-live-e2e-release-evidence\.mjs/);
  assert.match(pkg.scripts['test:live-e2e:release'], /run-live-e2e-release-sequence\.mjs/);
  assert.match(pkg.scripts['test:live-e2e:subscription-demo'], /run-live-e2e-subscription-demo-sequence\.mjs/);
  assert.match(pkg.scripts['configure:live-e2e'], /configure-live-env\.mjs/);
  assert.doesNotMatch(pkg.scripts.test, /test:live-e2e(?!:unit)/);
});

test('configure-live-env writes ignored subscription demo env without echoing secrets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-configure-live-env-'));
  const envPath = join(dir, 'tastekit-live.env');
  const secret = 'zai-secret-value-that-should-not-be-printed';
  try {
    const result = spawnSync(process.execPath, [
      'scripts/validation/configure-live-env.mjs',
      '--subscription-demo',
      '--output-env-file',
      envPath,
      '--zai-key-stdin',
    ], {
      input: secret,
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
      },
    });
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stdout, new RegExp(secret));
    assert.equal(result.stderr, '');
    const written = parseEnvFile(readFileSync(envPath, 'utf-8'));
    assert.equal(written.ZAI_API_KEY, secret);
    assert.equal(written.ZAI_MODEL, 'glm-5.1');
    assert.equal(written.OPENAI_BASE_URL, DEFAULT_CLIPROXY_OPENAI_BASE_URL);
    assert.equal(written.OPENAI_MODEL, 'grok-4.3');
    assert.equal(written.OPENAI_API_KEY_FILE, DEFAULT_CLIPROXY_KEY_FILE);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release sequence script documents the ordered live release path', () => {
  assert.equal(existsSync('scripts/validation/run-live-e2e-release-sequence.mjs'), true);
  const result = spawnSync(process.execPath, ['scripts/validation/run-live-e2e-release-sequence.mjs', '--help'], {
    encoding: 'utf-8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /live-provider-diagnostics\.mjs/);
  assert.match(result.stdout, /--preflight-only/);
  assert.match(result.stdout, /live-full-composition-e2e\.mjs/);
  assert.match(result.stdout, /assert-live-e2e-release-evidence\.mjs/);
});

test('subscription demo sequence documents local CLIProxyAPI routing without weakening release evidence', () => {
  assert.equal(existsSync('scripts/validation/run-live-e2e-subscription-demo-sequence.mjs'), true);
  const result = spawnSync(process.execPath, ['scripts/validation/run-live-e2e-subscription-demo-sequence.mjs', '--help'], {
    encoding: 'utf-8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /CLIProxyAPI/);
  assert.match(result.stdout, /subscription-backed/);
  assert.match(result.stdout, /not official release evidence/i);
});

test('subscription demo sequence ignores pnpm argument separator', () => {
  const result = spawnSync(process.execPath, [
    'scripts/validation/run-live-e2e-subscription-demo-sequence.mjs',
    '--',
    '--help',
  ], {
    encoding: 'utf-8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /subscription-backed/);
});

test('release sequence rejects no-judge because release evidence requires a judge report', () => {
  const result = spawnSync(process.execPath, [
    'scripts/validation/run-live-e2e-release-sequence.mjs',
    '--no-judge',
  ], { encoding: 'utf-8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--no-judge is not supported/);
});

test('release sequence rejects release-invalid provider and depth overrides before paid run', () => {
  for (const [flag, value] of [
    ['--openai-base-url', 'https://gateway.example/v1'],
    ['--openai-model', 'gpt-5.4'],
    ['--zai-base-url', 'https://api.z.ai/api/paas/v4'],
    ['--zai-model', 'glm-4.7'],
    ['--depth', 'guided'],
    ['--persona', '/tmp/custom-persona.md'],
    ['--judge', '/tmp/custom-judge.md'],
  ]) {
    const result = spawnSync(process.execPath, [
      'scripts/validation/run-live-e2e-release-sequence.mjs',
      flag,
      value,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1, flag);
    assert.match(result.stderr, /is not supported by the release sequence|Release sequence only supports/, flag);
  }
});

test('release sequence rejects release-invalid provider overrides from shell env', () => {
  for (const [name, value] of [
    ['OPENAI_BASE_URL', 'https://gateway.example/v1'],
    ['OPENAI_MODEL', 'gpt-5.4'],
    ['ZAI_BASE_URL', 'https://api.z.ai/api/paas/v4'],
    ['ZAI_MODEL', 'glm-4.7'],
    ['ZAI_THINKING', 'enabled'],
  ]) {
    const result = spawnSync(process.execPath, [
      'scripts/validation/run-live-e2e-release-sequence.mjs',
    ], {
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        [name]: value,
      },
    });
    assert.equal(result.status, 1, name);
    assert.match(result.stderr, new RegExp(`${name}=.*is not supported by the release sequence`), name);
  }
});

test('release sequence rejects proxy routing env vars before paid run', () => {
  for (const name of [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
    'GLOBAL_AGENT_HTTP_PROXY',
    'GLOBAL_AGENT_HTTPS_PROXY',
  ]) {
    const result = spawnSync(process.execPath, [
      'scripts/validation/run-live-e2e-release-sequence.mjs',
    ], {
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
        [name]: 'http://127.0.0.1:9999',
      },
    });
    assert.equal(result.status, 1, name);
    assert.match(result.stderr, new RegExp(`${name} is not supported by the release sequence`), name);
    assert.doesNotMatch(result.stderr, /127\.0\.0\.1:9999/, name);
  }
});

test('release sequence rejects proxy routing env vars from env file before paid run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-env-proxy-'));
  const envPath = join(dir, 'tastekit-live.env');
  try {
    writeFileSync(envPath, [
      'OPENAI_BASE_URL=https://api.openai.com/v1',
      'OPENAI_MODEL=gpt-5.5',
      'ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4',
      'ZAI_MODEL=glm-5.1',
      'ZAI_THINKING=disabled',
      'HTTPS_PROXY=http://127.0.0.1:9999',
      '',
    ].join('\n'), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/run-live-e2e-release-sequence.mjs',
      '--env-file',
      envPath,
    ], {
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
      },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /HTTPS_PROXY in .* is not supported by the release sequence/);
    assert.doesNotMatch(result.stderr, /127\.0\.0\.1:9999/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release sequence splits explicit output into preflight and live evidence directories', async () => {
  const { buildSequencePlan } = await import('../run-live-e2e-release-sequence.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-plan-'));
  const envPath = join(dir, 'tastekit-live.env');
  const outputPath = join(dir, 'release');
  try {
    writeFileSync(envPath, [
      'OPENAI_BASE_URL=https://api.openai.com/v1',
      'OPENAI_MODEL=gpt-5.5',
      'ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4',
      'ZAI_MODEL=glm-5.1',
      'ZAI_THINKING=disabled',
      '',
    ].join('\n'), 'utf-8');
    const plan = buildSequencePlan([
      '--env-file',
      envPath,
      '--output',
      outputPath,
    ], { PATH: process.env.PATH, LIVE_E2E_OUTPUT_DIR: '/tmp/ignored-live-output' });
    assert.deepEqual(plan.steps[0].args, [
      'scripts/validation/live-provider-diagnostics.mjs',
      '--env-file',
      envPath,
    ]);
    assert.deepEqual(plan.steps[1].args, [
      'scripts/validation/live-full-composition-e2e.mjs',
      '--env-file',
      envPath,
      '--preflight-only',
      '--output',
      join(outputPath, 'preflight'),
    ]);
    assert.deepEqual(plan.steps[2].args, [
      'scripts/validation/live-full-composition-e2e.mjs',
      '--env-file',
      envPath,
      '--output',
      join(outputPath, 'live'),
    ]);
    assert.deepEqual(plan.steps[3].args, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--latest',
      join(outputPath, 'latest-run.json'),
    ]);
    assert.equal(plan.childEnv.LIVE_E2E_OUTPUT_DIR, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release sequence rejects release-invalid provider overrides from env file before paid run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-env-overrides-'));
  const envPath = join(dir, 'tastekit-live.env');
  try {
    writeFileSync(envPath, [
      'OPENAI_BASE_URL=https://gateway.example/v1',
      'OPENAI_MODEL=gpt-5.5',
      'ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4',
      'ZAI_MODEL=glm-5.1',
      'ZAI_THINKING=disabled',
      '',
    ].join('\n'), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/run-live-e2e-release-sequence.mjs',
      '--env-file',
      envPath,
    ], {
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
      },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /OPENAI_BASE_URL=.*is not supported by the release sequence/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('provider diagnostics reports missing credentials without starting a live run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-provider-diagnostics-'));
  const envPath = join(dir, 'tastekit-live.env');
  try {
    writeFileSync(envPath, [
      'OPENAI_API_KEY=',
      'ZAI_API_KEY=',
      'OPENAI_MODEL=gpt-5.5',
      'ZAI_MODEL=glm-5.1',
      '',
    ].join('\n'), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/live-provider-diagnostics.mjs',
      '--env-file',
      envPath,
    ], {
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
      },
    });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /openai: missing OPENAI_API_KEY/);
    assert.match(result.stdout, /zai: missing ZAI_API_KEY or Z_AI_API_KEY/);
    assert.match(result.stdout, /Next steps:/);
    assert.match(result.stdout, /1\. Fill OPENAI_API_KEY in/);
    assert.match(result.stdout, /2\. Fill ZAI_API_KEY in/);
    assert.match(result.stdout, /3\. Re-run pnpm test:live-e2e:release/);
    assert.doesNotMatch(result.stdout, /OPENAI_API_KEY=/);
    assert.doesNotMatch(result.stdout, /ZAI_API_KEY=/);
    assert.doesNotMatch(result.stdout, /full-composition-/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('provider diagnostics can emit machine-readable JSON without secret values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-provider-diagnostics-json-'));
  const envPath = join(dir, 'tastekit-live.env');
  try {
    writeFileSync(envPath, [
      'OPENAI_API_KEY=missing',
      'ZAI_API_KEY=none',
      'OPENAI_MODEL=gpt-5.5',
      'ZAI_MODEL=glm-5.1',
      '',
    ].join('\n'), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/live-provider-diagnostics.mjs',
      '--env-file',
      envPath,
      '--json',
    ], {
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
      },
    });
    assert.equal(result.status, 1);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.env_file, envPath);
    assert.equal(parsed.providers.openai.status, 'missing');
    assert.equal(parsed.providers.openai.model, 'gpt-5.5');
    assert.equal(parsed.providers.zai.status, 'missing');
    assert.equal(parsed.providers.zai.model, 'glm-5.1');
    assert.deepEqual(parsed.next_steps, [
      `Fill OPENAI_API_KEY in ${envPath}, or pass --openai-key-file /path/to/key for local proxy-backed demos`,
      `Fill ZAI_API_KEY in ${envPath}`,
      'Re-run pnpm test:live-e2e:release',
    ]);
    assert.doesNotMatch(result.stdout, /OPENAI_API_KEY=missing/);
    assert.doesNotMatch(result.stdout, /ZAI_API_KEY=none/);
    assert.equal(result.stderr, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('provider diagnostics points CLIProxyAPI mode at the subscription demo command', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-provider-diagnostics-cliproxy-'));
  const envPath = join(dir, 'tastekit-live.env');
  const openaiKeyFile = join(dir, 'cliproxy.key');
  try {
    writeFileSync(envPath, [
      'ZAI_API_KEY=none',
      '',
    ].join('\n'), 'utf-8');
    writeFileSync(openaiKeyFile, 'local-proxy-key\n', 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/live-provider-diagnostics.mjs',
      '--env-file',
      envPath,
      '--cliproxy-openai',
      '--openai-key-file',
      openaiKeyFile,
      '--json',
    ], {
      encoding: 'utf-8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
      },
    });
    assert.equal(result.status, 1);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.providers.zai.status, 'missing');
    assert.match(parsed.next_steps.at(-1), /subscription-demo/);
    assert.doesNotMatch(result.stdout, /local-proxy-key/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live harness passes resolved provider keys into downstream judge checks', () => {
  const source = readFileSync('scripts/validation/live-full-composition-e2e.mjs', 'utf-8');
  assert.match(
    source,
    /async function runDownstreamChecks\(ctx\) \{[\s\S]*const \{[\s\S]*providerKeys,[\s\S]*\} = ctx;/,
  );
  assert.match(
    source,
    /runJudge\(\{[\s\S]*providerKeys[\s\S]*\}\)/,
  );
});

test('live release evidence assertion rejects failed latest-run reports', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-fail-'));
  const reportPath = join(dir, 'report.json');
  const latestPath = join(dir, 'latest-run.json');
  try {
    writeFileSync(reportPath, JSON.stringify({
      result: 'fail',
      metadata: { provider_mode: 'live', depth: 'Full Taste Composition', internal_depth: 'operator' },
      interviewShape: { turn_count: 0, stop_reason: 'fail' },
      assertions: [{ name: 'credential-preflight', status: 'fail', severity: 'critical' }],
      failures: [{ severity: 'critical', message: 'missing credentials' }],
      artifacts: [],
      downstream: [],
      judge: null,
    }), 'utf-8');
    writeFileSync(latestPath, JSON.stringify({ report_json: reportPath }), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--latest',
      latestPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /live release evidence failed/);
    assert.match(result.stdout, /report.result must be pass/);
    assert.match(result.stdout, /judge report must be present/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion accepts complete live reports only', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-pass-'));
  const reportPath = join(dir, 'report.json');
  const latestPath = join(dir, 'latest-run.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    writeLatestPointer(latestPath, dir, reportPath);
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--latest',
      latestPath,
      '--json',
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.report_json, reportPath);
    assert.equal(parsed.provider_mode, 'live');
    assert.equal(parsed.turn_count, 18);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects reports without live transcript provenance', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-transcript-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /transcript\.jsonl must exist next to report\.json/);
    assert.match(result.stdout, /missing transcript preflight: openai gpt-5\.5/);
    assert.match(result.stdout, /missing transcript preflight: zai glm-5\.1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects mock endpoints posing as live providers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-mock-endpoint-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingJudgeFiles(dir);
    writePassingTranscript(dir, {
      openaiEndpoint: 'http://127.0.0.1:4999/v1/chat/completions',
      zaiEndpoint: 'http://127.0.0.1:4998/chat/completions',
    });
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /openai preflight endpoint must be https:\/\/api\.openai\.com\/v1\/chat\/completions/);
    assert.match(result.stdout, /zai preflight endpoint must be https:\/\/api\.z\.ai\/api\/coding\/paas\/v4\/chat\/completions/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion requires report markdown in latest pointer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-report-md-'));
  const reportPath = join(dir, 'report.json');
  const latestPath = join(dir, 'latest-run.json');
  try {
    writePassingDemo(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    writeLatestPointer(latestPath, dir, reportPath);
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--latest',
      latestPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /report\.md must exist next to report\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects stale report markdown content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-stale-report-md-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writeFileSync(join(dir, 'report.md'), '# Stale Report\n\nResult: **fail**\n', 'utf-8');
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /report\.md result must match report\.json/);
    assert.match(result.stdout, /report\.md must include metadata provider_mode/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects truncated transcript conversations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-truncated-transcript-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir, { turnPairs: 2 });
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /transcript interviewer_message count must equal reported turn_count/);
    assert.match(result.stdout, /transcript simulated_user_message count must equal reported turn_count/);
    assert.match(result.stdout, /transcript must include completed state_update matching reported turn_count/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects no-judge live reports', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-no-judge-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    const report = createPassingLiveReleaseReport(dir);
    report.judge = null;
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /judge report must be present/);
    assert.match(result.stdout, /judge-report\.json must exist next to report\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion requires current checkout stamp', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-stamp-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir, {
      package_version: undefined,
      git_commit: '19c0070-stale',
      git_dirty: false,
    });
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /metadata\.package_version must match current package\.json version/);
    assert.match(result.stdout, /metadata\.git_commit must match current HEAD/);
    assert.match(result.stdout, /metadata\.git_dirty must match current checkout dirty state/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion requires exact dirty checkout fingerprint', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-dirty-fingerprint-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir, {
      git_dirty_fingerprint: '0'.repeat(64),
    })), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /metadata\.git_dirty_fingerprint must match current checkout dirty fingerprint/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects spoofed artifacts and skeletal judge reports', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-spoof-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir);
    report.artifacts = [
      join(dir, 'missing/workspace/.tastekit/constitution.v1.json'),
      join(dir, 'missing/workspace/CLAUDE.md'),
      join(dir, 'missing/workspace/SOUL.md'),
      join(dir, 'missing/workspace/AGENTS.md'),
    ].map(path => ({ path, exists: true, sha256: 'f'.repeat(64) }));
    report.judge = { passed: true, average: 4.4, critical_concerns: [], release_interpretation: 'Thin but passing.' };
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /artifact file missing/);
    assert.match(result.stdout, /judge\.scores must include required dimensions/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion validates constitution extensions and managed runtime markdown', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-content-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir);
    const constitutionPath = join(dir, 'workspace/.tastekit/constitution.v1.json');
    const claudePath = join(dir, 'workspace/CLAUDE.md');
    writeFileSync(constitutionPath, '{"schema_version":"constitution.v1","extensions":{}}\n', 'utf-8');
    writeFileSync(claudePath, '# Claude without managed region\n', 'utf-8');
    for (const artifact of report.artifacts) {
      if (artifact.path === constitutionPath) artifact.sha256 = sha256(readFileSync(constitutionPath));
      if (artifact.path === claudePath) artifact.sha256 = sha256(readFileSync(claudePath));
    }
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /constitution must include x-tastekit-composition/);
    assert.match(result.stdout, /CLAUDE\.md must contain exactly one TasteKit managed region/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects incomplete Full coverage hidden behind finish-now assumptions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-incomplete-full-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir);
    const constitutionPath = join(dir, 'workspace/.tastekit/constitution.v1.json');
    const constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
    constitution.extensions['x-tastekit-composition'].dimensions.autonomy_boundaries.status = 'in_progress';
    constitution.extensions['x-tastekit-composition'].dimensions.autonomy_boundaries.confidence = 1.2;
    constitution.extensions['x-tastekit-composition'].dimensions.autonomy_boundaries.confidence_threshold = 1.5;
    constitution.extensions['x-tastekit-metacognition'].coverage_summary.critical.covered = 1;
    constitution.extensions['x-tastekit-metacognition'].unresolved_assumptions = [{
      id: 'user_finish_now-autonomy_boundaries',
      dimension_id: 'autonomy_boundaries',
      source: 'user_finish_now',
      summary: 'User asked to finish before this dimension was fully covered.',
      turn_number: 18,
    }];
    writeFileSync(constitutionPath, JSON.stringify(constitution), 'utf-8');
    for (const artifact of report.artifacts) {
      if (artifact.path === constitutionPath) artifact.sha256 = sha256(readFileSync(constitutionPath));
    }
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Full Taste Composition release evidence cannot contain user_finish_now assumptions/);
    assert.match(result.stdout, /Full Taste Composition dimension autonomy_boundaries is not covered/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects runtime fact dumps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-runtime-facts-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir);
    const claudePath = join(dir, 'workspace/CLAUDE.md');
    const leakingMarkdown = [
      '# Claude',
      '',
      '<!-- BEGIN TASTEKIT MANAGED REGION -->',
      '## TasteKit Runtime Guidance',
      '- **autonomy_boundaries**: Useful summary. Facts: raw-ish interview detail should stay canonical only.',
      '<!-- END TASTEKIT MANAGED REGION -->',
      '',
    ].join('\n');
    writeFileSync(claudePath, leakingMarkdown, 'utf-8');
    for (const artifact of report.artifacts) {
      if (artifact.path === claudePath) artifact.sha256 = sha256(leakingMarkdown);
    }
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');

    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /CLAUDE\.md must not expose hidden interview machinery or raw transcript references/);
    assert.match(result.stdout, /Facts:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion validates session, eval, trace, and export content semantics', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-semantic-artifacts-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir);
    const sessionPath = join(dir, 'workspace/.tastekit/session.json');
    const evalPackPath = join(dir, 'workspace/.tastekit/evals/live-e2e-evalpack.json');
    const driftTracePath = join(dir, 'workspace/.tastekit/traces/live-e2e-drift.trace.v1.jsonl');
    const replayTracePath = join(dir, 'workspace/.tastekit/traces/live-e2e-clean-replay.trace.v1.jsonl');
    const exportAgentsPath = join(dir, 'exports/agents-md/AGENTS.md');
    writeFileSync(sessionPath, JSON.stringify({ schema_version: 'workspace.v1', depth: 'operator', current_step: 'complete', completed_steps: ['interview'] }), 'utf-8');
    writeFileSync(evalPackPath, '{"schema_version":"evalpack.v1","scenarios":[]}\n', 'utf-8');
    writeFileSync(driftTracePath, '{"schema_version":"trace_event.v1","event_type":"observation"}\n', 'utf-8');
    writeFileSync(replayTracePath, '{"schema_version":"trace_event.v1","event_type":"error"}\n', 'utf-8');
    writeFileSync(exportAgentsPath, '# Export without managed region\n', 'utf-8');
    for (const artifact of report.artifacts) {
      if ([sessionPath, evalPackPath, driftTracePath, replayTracePath, exportAgentsPath].includes(artifact.path)) {
        artifact.sha256 = sha256(readFileSync(artifact.path));
      }
    }
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /session\.json domain_id must match report metadata domain/);
    assert.match(result.stdout, /session\.json interview\.turn_count must match reported turn_count/);
    assert.match(result.stdout, /eval pack must contain at least four scenarios/);
    assert.match(result.stdout, /drift trace must contain approval_response and error events/);
    assert.match(result.stdout, /clean replay trace must not contain error events/);
    assert.match(result.stdout, /export AGENTS\.md must contain exactly one TasteKit managed region/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion requires exact live release models', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-models-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir, {
      openai_model: 'gpt-4o',
      zai_model: 'glm-4.7',
    })), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /metadata\.openai_model must be gpt-5\.5/);
    assert.match(result.stdout, /metadata\.zai_model must be glm-5\.1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects stale or mismatched latest-run pointers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-latest-'));
  const reportPath = join(dir, 'report.json');
  const latestPath = join(dir, 'latest-run.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    writeLatestPointer(latestPath, dir, reportPath, { provider_mode: 'mock-provider-smoke' });
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--latest',
      latestPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /latest-run provider_mode does not match report metadata/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects placeholder demo output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-demo-'));
  const reportPath = join(dir, 'report.json');
  try {
    writeFileSync(join(dir, 'demo.md'), '# Placeholder\n\nLive evidence.\n', 'utf-8');
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /demo\.md missing required live walkthrough content/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion requires value walkthrough in demo output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-demo-walkthrough-'));
  const reportPath = join(dir, 'report.json');
  try {
    writeFileSync(join(dir, 'demo.md'), [
      '# TasteKit Full Taste Composition Demo',
      '',
      '## What This Demonstrates',
      '- TasteKit completed an agent-native Full Taste Composition interview and turned it into durable runtime files.',
      '',
      '## Interview Shape',
      '- turn_count: 18',
      '',
      '## Extracted Taste',
      'Principles:',
      '- Challenge weak assumptions before implementation.',
      '',
      '## Runtime Impact',
      '- CLAUDE.md',
      '',
      '## Validation Evidence',
      '- provider-preflight: pass',
      '',
      '## Judge Read',
      '- average: 4.4',
      '',
      '## Reproduction Commands',
      '- `pnpm test:live-e2e`',
      '',
    ].join('\n'), 'utf-8');
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /demo\.md missing required live walkthrough content/);
    assert.match(result.stdout, /TasteKit Value Walkthrough/);
    assert.match(result.stdout, /Coverage evidence: live extraction/);
    assert.match(result.stdout, /Domain Mapping Examples/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects empty value walkthrough sections', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-demo-empty-walkthrough-'));
  const reportPath = join(dir, 'report.json');
  try {
    writeFileSync(join(dir, 'demo.md'), [
      '# TasteKit Full Taste Composition Demo',
      '',
      '## What This Demonstrates',
      '- TasteKit completed an agent-native Full Taste Composition interview and turned it into durable runtime files.',
      '',
      '## Interview Shape',
      '- turn_count: 18',
      '',
      '## Extracted Taste',
      'Principles:',
      '- Challenge weak assumptions before implementation.',
      '',
      '## TasteKit Value Walkthrough',
      '- Coverage evidence: live extraction',
      '- Coverage: 0/1 dimensions',
      '',
      '### Domain Mapping Examples',
      '',
      '### Runtime Guidance Produced',
      '',
      '### Safety And Portability',
      '',
      '## Runtime Impact',
      '- CLAUDE.md',
      '',
      '## Validation Evidence',
      '- provider-preflight: pass',
      '',
      '## Judge Read',
      '- average: 4.4',
      '',
      '## Reproduction Commands',
      '- `pnpm test:live-e2e`',
      '',
    ].join('\n'), 'utf-8');
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    writeFileSync(reportPath, JSON.stringify(createPassingLiveReleaseReport(dir)), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /demo\.md Coverage line must show positive covered and total dimensions/);
    assert.match(result.stdout, /demo\.md Domain Mapping Examples section must include at least one bullet/);
    assert.match(result.stdout, /demo\.md Runtime Guidance Produced section must include at least one bullet/);
    assert.match(result.stdout, /demo\.md Safety And Portability section must include at least one bullet/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion validates structured value walkthrough content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-report-walkthrough-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir);
    report.valueWalkthrough = {
      coverage: {
        evidence_kind: 'live extraction',
        total_dimensions: 1,
        covered_dimensions: 0,
      },
      dimension_examples: [],
      runtime_guidance: [],
      safety: [],
    };
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /report\.valueWalkthrough coverage must show positive live covered and total dimensions/);
    assert.match(result.stdout, /report\.valueWalkthrough dimension_examples must include at least one concrete mapping/);
    assert.match(result.stdout, /report\.valueWalkthrough runtime_guidance must include at least one item/);
    assert.match(result.stdout, /report\.valueWalkthrough safety must include at least one item/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion requires value walkthrough dimensions to exist in constitution', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-report-walkthrough-dims-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir);
    report.valueWalkthrough.dimension_examples = [{
      id: 'invented_dimension',
      status: 'covered',
      confidence: 0.9,
      summary: 'This mapping does not exist in the generated constitution.',
    }];
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /report\.valueWalkthrough dimension_examples include IDs not present in constitution: invented_dimension/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence assertion rejects extra non-concrete unknown value walkthrough dimension IDs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-release-evidence-report-extra-dims-'));
  const reportPath = join(dir, 'report.json');
  try {
    writePassingDemo(dir);
    writePassingReportMarkdown(dir);
    writePassingTranscript(dir);
    writePassingJudgeFiles(dir);
    const report = createPassingLiveReleaseReport(dir);
    report.valueWalkthrough.dimension_examples.push({ id: 'invented_dimension' });
    writeFileSync(reportPath, JSON.stringify(report), 'utf-8');
    const result = spawnSync(process.execPath, [
      'scripts/validation/assert-live-e2e-release-evidence.mjs',
      '--report',
      reportPath,
    ], { encoding: 'utf-8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /report\.valueWalkthrough dimension_examples include IDs not present in constitution: invented_dimension/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live release evidence module can be imported without executing the CLI', async () => {
  const mod = await import('../assert-live-e2e-release-evidence.mjs');
  assert.equal(typeof mod.validateLiveReleaseEvidence, 'function');
});

function createPassingLiveReleaseReport(dir, metadataOverrides = {}) {
  const artifactSpecs = [
    ['workspace/.tastekit/session.json', JSON.stringify({
      schema_version: 'workspace.v1',
      session_id: 'live-e2e-test-session',
      started_at: '2026-05-17T12:00:00.000Z',
      last_updated_at: '2026-05-17T12:30:00.000Z',
      depth: 'operator',
      domain_id: 'general-agent',
      completed_steps: ['welcome', 'interview'],
      current_step: 'complete',
      answers: { initial: 'challenge strategy without taking over' },
      structured_answers: { autonomy_boundaries: 'Challenge weak assumptions while preserving user agency.' },
      interview: {
        turn_count: 18,
        is_complete: true,
        transcript: [],
        dimension_coverage: [{
          dimension_id: 'autonomy_boundaries',
          status: 'covered',
          confidence: 1.8,
          confidence_threshold: 1.5,
          signals: [],
          anti_signals: [],
          relevant_turns: [1, 8, 18],
        }],
      },
    }) + '\n'],
    ['workspace/.tastekit/constitution.v1.json', JSON.stringify({
      schema_version: 'constitution.v1',
      user_id: 'tastekit-live-e2e',
      created_at: '2026-05-17T12:00:00.000Z',
      updated_at: '2026-05-17T12:30:00.000Z',
      principles: [{ id: 'challenge-weak-assumptions', statement: 'Challenge weak assumptions before implementation.', priority: 'high' }],
      guardrails: [{ id: 'protect-user-agency', rule: 'Ask before irreversible actions.', severity: 'must' }],
      memory_policy: { remember: [], forget: [], review_after_days: 30 },
      trace_map: {},
      extensions: {
        'x-tastekit-composition': {
          schema_version: 'tastekit.composition.v1',
          mode: 'full_taste_composition',
          domain_id: 'general-agent',
          domain_specific: { autonomy_boundaries: { summary: 'Needs active challenge with final user control.' } },
          dimensions: {
            autonomy_boundaries: {
              dimension_id: 'autonomy_boundaries',
              status: 'covered',
              summary: 'The agent should challenge weak assumptions while preserving user agency.',
              facts: ['Challenge before implementation.'],
              anti_signals: ['Silent compliance on public or irreversible changes.'],
              confidence: 0.9,
              source_turns: [1, 8, 18],
            },
          },
        },
        'x-tastekit-metacognition': {
          schema_version: 'tastekit.metacognition.v1',
          depth_label: 'Full Taste Composition',
          coverage_summary: {
            total_dimensions: 1,
            covered_dimensions: 1,
            critical: { total: 1, covered: 1, confirmed: 1, inferred: 0 },
          },
          unresolved_assumptions: [],
          conflicts: [],
          confirmation_checkpoints: [{ type: 'draft', turn: 18, accepted: true, summary: 'Accepted late draft checkpoint.' }],
          fatigue_events: [],
          policy_decisions: [{ turn: 18, action: 'stop', summary: 'Coverage complete and confirmed.' }],
        },
      },
    }) + '\n'],
    ['workspace/CLAUDE.md', managedMarkdown('Claude')],
    ['workspace/SOUL.md', managedMarkdown('Soul')],
    ['workspace/AGENTS.md', managedMarkdown('Agents')],
    ['workspace/.tastekit/evals/live-e2e-evalpack.json', JSON.stringify(liveE2eEvalPack()) + '\n'],
    ['workspace/.tastekit/traces/live-e2e-drift.trace.v1.jsonl', driftTraceJsonl()],
    ['workspace/.tastekit/traces/live-e2e-clean-replay.trace.v1.jsonl', cleanReplayTraceJsonl()],
    ['exports/claude-code/CLAUDE.md', managedMarkdown('Claude export')],
    ['exports/openclaw/SOUL.md', managedMarkdown('OpenClaw soul export')],
    ['exports/openclaw/AGENTS.md', managedMarkdown('OpenClaw agents export')],
    ['exports/openclaw/openclaw.config.json', '{"runtime":"openclaw"}\n'],
    ['exports/manus/README.md', '# Manus export\n'],
    ['exports/agents-md/AGENTS.md', managedMarkdown('Agents export')],
    ['exports/agent-file/agent.af', '{"format":"agent-file"}\n'],
  ];
  const artifacts = artifactSpecs.map(([relativePath, content]) => {
    const path = join(dir, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, 'utf-8');
    return { path, exists: true, sha256: sha256(content) };
  });
  const criticalAssertions = [
    'provider-preflight',
    'live-interview-complete',
    'constitution-extensions',
    'validator',
    'export-artifacts-present',
    'runtime-markdown-safe',
    'managed-region-rerun-balanced',
    'managed-region-manual-content-preserved',
  ].map(name => ({ name, status: 'pass', severity: 'critical', evidence: 'ok' }));
  const downstream = ['skills graph', 'trust audit', 'drift detect', 'eval run', 'eval replay']
    .map(name => ({ name, status: 'pass', summary: 'ok' }));
  return {
    result: 'pass',
    metadata: {
      output_dir: dir,
      workspace_dir: join(dir, 'workspace'),
      domain: 'general-agent',
      provider_mode: 'live',
      depth: 'Full Taste Composition',
      internal_depth: 'operator',
      openai_model: 'gpt-5.5',
      zai_model: 'glm-5.1',
      persona_path: 'docs/validation/live/full-composition-persona.md',
      persona_sha256: sha256(readFileSync('docs/validation/live/full-composition-persona.md')),
      judge_rubric_path: 'docs/validation/live/full-composition-judge-rubric.md',
      judge_rubric_sha256: sha256(readFileSync('docs/validation/live/full-composition-judge-rubric.md')),
      credential_openai_key: 'present',
      credential_zai_key: 'present',
      ...currentCheckoutStamp(),
      ...metadataOverrides,
    },
    interviewShape: {
      turn_count: 18,
      stop_reason: 'tastekit-complete',
      confirmation_checkpoints: 3,
    },
    assertions: criticalAssertions,
    failures: [],
    artifacts,
    downstream,
    judge: {
      passed: true,
      average: 4.4,
      critical_concerns: [],
      release_interpretation: 'Ready.',
      scores: [
        'Depth',
        'Specificity',
        'Tension capture',
        'Autonomy boundaries',
        'Challenge style',
        'Evidence behavior',
        'Metacognition',
        'Runtime usability',
        'Drift/eval readiness',
      ].map(dimension => ({ dimension, score: 4.4, rationale: `Strong ${dimension}.` })),
    },
    valueWalkthrough: passingValueWalkthrough(),
    verificationCommands: ['pnpm test:live-e2e'],
    releaseInterpretation: 'Live release evidence passed.',
  };
}

function passingValueWalkthrough() {
  return {
    canonical_profile: '.tastekit/constitution.v1.json',
    coverage: {
      evidence_kind: 'live extraction',
      total_dimensions: 1,
      covered_dimensions: 1,
      by_priority: {
        critical: { total: 1, covered: 1, confirmed: 1, inferred: 0 },
      },
    },
    metacognition: {
      policy_path: ['ask', 'confirm', 'draft', 'stop'],
      accepted_draft_checkpoints: 1,
      fatigue_events: 1,
      unresolved_assumptions: 0,
      conflicts: 0,
    },
    dimension_examples: [{
      id: 'autonomy_boundaries',
      status: 'covered',
      confidence: 0.9,
      summary: 'The agent should challenge weak assumptions while preserving user agency.',
    }],
    runtime_guidance: [
      'Challenge weak assumptions before implementation.',
      'Ask before irreversible actions.',
    ],
    safety: [
      'Canonical detail remains in constitution extensions; runtime markdown receives concise operating guidance.',
      'Runtime markdown is checked for transcript and hidden-coverage leaks before the run can pass.',
    ],
  };
}

function managedMarkdown(label) {
  return [
    `# ${label}`,
    '',
    '<!-- BEGIN TASTEKIT MANAGED REGION -->',
    '## TasteKit Runtime Guidance',
    '- Challenge weak assumptions before implementation.',
    '- Ask before irreversible actions.',
    '<!-- END TASTEKIT MANAGED REGION -->',
    '',
  ].join('\n');
}

function liveE2eEvalPack() {
  return {
    schema_version: 'evalpack.v1',
    id: 'live-e2e-profile-behavior',
    name: 'Live E2E Profile Behavior',
    description: 'Fixture matching the live E2E profile behavior checks.',
    scenarios: [
      'challenge-weak-assumptions',
      'state-uncertainty',
      'ask-before-irreversible-public-actions',
      'compress-on-fatigue',
    ].map(id => ({
      scenario_id: id,
      name: id,
      description: `Check ${id}`,
      setup: { inputs: { response: 'challenge uncertainty approval fatigue evidence' } },
      expected: {
        rubrics: [id],
        thresholds: { [id]: 0.5 },
        required_outputs: ['response'],
      },
    })),
    judging: {
      output_format: 'json',
      rules: [
        { rule_id: 'challenge', type: 'regex', pattern: 'challenge', weight: 1 },
        { rule_id: 'uncertainty', type: 'regex', pattern: 'uncertainty', weight: 1 },
        { rule_id: 'approval', type: 'regex', pattern: 'approval', weight: 1 },
        { rule_id: 'fatigue', type: 'regex', pattern: 'fatigue', weight: 1 },
      ],
    },
  };
}

function driftTraceJsonl() {
  return [
    traceEvent('approval_response', { approved: false, reason: 'agreed too quickly' }),
    traceEvent('approval_response', { approved: false, reason: 'agreed too quickly' }),
    traceEvent('error', { output: 'unsupported claim' }, { error: 'unsupported claim' }),
  ].map(event => JSON.stringify(event)).join('\n') + '\n';
}

function cleanReplayTraceJsonl() {
  return `${JSON.stringify(traceEvent('tool_result', {
    output: 'I will state assumptions, ask before public action, and compress on fatigue.',
  }))}\n`;
}

function traceEvent(eventType, data, overrides = {}) {
  return {
    schema_version: 'trace_event.v1',
    run_id: 'live-e2e-test-trace',
    timestamp: '2026-05-17T12:00:00.000Z',
    actor: eventType === 'approval_response' ? 'user' : 'system',
    event_type: eventType,
    data,
    ...overrides,
  };
}

function currentCheckoutStamp() {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  return {
    package_version: packageJson.version,
    git_commit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout.trim(),
    git_dirty: spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8' }).stdout.trim().length > 0,
    git_dirty_fingerprint: checkoutDirtyFingerprint(),
  };
}

function checkoutDirtyFingerprint() {
  const hash = createHash('sha256');
  for (const args of [
    ['status', '--porcelain=v1', '-z'],
    ['diff', '--binary'],
    ['diff', '--cached', '--binary'],
  ]) {
    hash.update(spawnSync('git', args, { encoding: 'utf-8' }).stdout.trim());
    hash.update('\0');
  }
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { encoding: 'utf-8' }).stdout.trim()
    .split('\0')
    .filter(Boolean)
    .sort();
  for (const path of untracked) {
    hash.update(`untracked:${path}\0`);
    try {
      hash.update(readFileSync(path));
    } catch {
      hash.update('unreadable');
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

function writeLatestPointer(path, dir, reportPath, overrides = {}) {
  writeFileSync(path, JSON.stringify({
    output_dir: dir,
    report_json: reportPath,
    report_md: join(dir, 'report.md'),
    demo_md: join(dir, 'demo.md'),
    result: 'pass',
    domain: 'general-agent',
    depth: 'Full Taste Composition',
    provider_mode: 'live',
    ...overrides,
  }), 'utf-8');
}

function writePassingReportMarkdown(dir) {
  const metadata = createPassingLiveReleaseReport(dir).metadata;
  writeFileSync(join(dir, 'report.md'), [
    '# TasteKit Live Full Taste Composition E2E Report',
    '',
    'Result: **pass**',
    '',
    '## Run Metadata',
    '',
    `- provider_mode: ${metadata.provider_mode}`,
    `- domain: ${metadata.domain}`,
    `- depth: ${metadata.depth}`,
    `- package_version: ${metadata.package_version}`,
    `- git_commit: ${metadata.git_commit}`,
    `- git_dirty: ${metadata.git_dirty}`,
    `- git_dirty_fingerprint: ${metadata.git_dirty_fingerprint}`,
    `- persona_sha256: ${metadata.persona_sha256}`,
    `- judge_rubric_sha256: ${metadata.judge_rubric_sha256}`,
    '',
  ].join('\n'), 'utf-8');
}

function writePassingJudgeFiles(dir) {
  const judge = createPassingLiveReleaseReport(dir).judge;
  writeFileSync(join(dir, 'judge-report.json'), JSON.stringify(judge, null, 2), 'utf-8');
  writeFileSync(join(dir, 'judge-report.raw.txt'), JSON.stringify(judge), 'utf-8');
}

function writePassingTranscript(dir, overrides = {}) {
  const openaiEndpoint = overrides.openaiEndpoint ?? 'https://api.openai.com/v1/chat/completions';
  const zaiEndpoint = overrides.zaiEndpoint ?? 'https://api.z.ai/api/coding/paas/v4/chat/completions';
  const turnPairs = overrides.turnPairs ?? 18;
  const events = [
    { type: 'preflight', data: { provider: 'openai', model: 'gpt-5.5', endpoint: openaiEndpoint, response_preview: 'ok' } },
    { type: 'preflight', data: { provider: 'zai', model: 'glm-5.1', endpoint: zaiEndpoint, response_preview: 'ok' } },
    {
      type: 'assertion',
      data: {
        name: 'provider-preflight',
        status: 'pass',
        severity: 'critical',
        openai_model: 'gpt-5.5',
        openai_endpoint: openaiEndpoint,
        zai_model: 'glm-5.1',
        zai_endpoint: zaiEndpoint,
      },
    },
    ...Array.from({ length: turnPairs }, (_, index) => {
      const turn = index + 1;
      return [
        { type: 'interviewer_message', data: { turn: turn - 1, message: `Question ${turn}: what kind of agent fit are we designing for?` } },
        { type: 'simulated_user_message', data: { turn, reply: `Answer ${turn}: challenge strategy without taking over, with evidence and user agency.` } },
        { type: 'state_update', data: { turn, is_complete: turn === 18, coverage_summary: { critical: { covered: turn } } } },
      ];
    }).flat(),
    { type: 'judge_score', data: createPassingLiveReleaseReport(dir).judge },
  ];
  writeFileSync(join(dir, 'transcript.jsonl'), events.map(event => JSON.stringify({
    timestamp: '2026-05-17T12:00:00.000Z',
    ...event,
  })).join('\n') + '\n', 'utf-8');
}

function writePassingDemo(dir) {
  writeFileSync(join(dir, 'demo.md'), [
    '# TasteKit Full Taste Composition Demo',
    '',
    '## What This Demonstrates',
    '- TasteKit completed an agent-native Full Taste Composition interview and turned it into durable runtime files.',
    '',
    '## Interview Shape',
    '- turn_count: 18',
    '',
    '## Extracted Taste',
    'Principles:',
    '- Challenge weak assumptions before implementation.',
    '',
    '## TasteKit Value Walkthrough',
    '- Coverage evidence: live extraction',
    '- Coverage: 1/1 dimensions',
    '',
    '### Domain Mapping Examples',
    '- `autonomy_boundaries`, covered, evidence weight 0.9: The agent should challenge weak assumptions while preserving user agency.',
    '',
    '### Runtime Guidance Produced',
    '- Challenge weak assumptions before implementation.',
    '- Ask before irreversible actions.',
    '',
    '### Safety And Portability',
    '- Canonical detail remains in constitution extensions; runtime markdown receives concise operating guidance.',
    '- Runtime markdown is checked for transcript and hidden-coverage leaks before the run can pass.',
    '',
    '## Runtime Impact',
    '- CLAUDE.md',
    '',
    '## Validation Evidence',
    '- provider-preflight: pass',
    '',
    '## Judge Read',
    '- average: 4.4',
    '',
    '## Reproduction Commands',
    '- `pnpm test:live-e2e`',
    '',
  ].join('\n'), 'utf-8');
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}
