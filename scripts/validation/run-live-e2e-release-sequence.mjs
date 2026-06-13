#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findEnvFileArg, parseEnvFile } from './lib/live-e2e/env-file.mjs';

const DEFAULT_LATEST_PATH = 'docs/validation/live/latest-run.json';
const RELEASE_UNSAFE_FLAGS = new Set(['--no-judge', '--mock-provider-smoke', '--preflight-only']);
const RELEASE_FIXED_OPTIONS = new Map([
  ['--openai-base-url', 'https://api.openai.com/v1'],
  ['--openai-model', 'gpt-5.5'],
  ['--zai-base-url', 'https://api.z.ai/api/coding/paas/v4'],
  ['--zai-model', 'glm-5.1'],
  ['--zai-thinking', 'disabled'],
]);
const RELEASE_DEPTHS = new Set(['full', 'full-taste-composition', 'operator']);
const RELEASE_PROMPT_FLAGS = new Set(['--persona', '--judge']);
const RELEASE_PROXY_ENV_NAMES = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
  'GLOBAL_AGENT_HTTP_PROXY',
  'GLOBAL_AGENT_HTTPS_PROXY',
];
const RELEASE_FIXED_ENV = new Map([
  ['OPENAI_BASE_URL', RELEASE_FIXED_OPTIONS.get('--openai-base-url')],
  ['OPENAI_MODEL', RELEASE_FIXED_OPTIONS.get('--openai-model')],
  ['ZAI_BASE_URL', RELEASE_FIXED_OPTIONS.get('--zai-base-url')],
  ['ZAI_MODEL', RELEASE_FIXED_OPTIONS.get('--zai-model')],
  ['ZAI_THINKING', RELEASE_FIXED_OPTIONS.get('--zai-thinking')],
]);

function main(argv) {
  let plan;
  try {
    plan = buildSequencePlan(argv, process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(usage());
    return 1;
  }

  if (plan.help) {
    console.log(usage());
    return 0;
  }

  for (const [index, step] of plan.steps.entries()) {
    console.log(`\n[${index + 1}/${plan.steps.length}] ${step.label}`);
    console.log(`$ ${formatCommand(process.execPath, step.args)}`);
    const result = spawnSync(process.execPath, step.args, {
      stdio: 'inherit',
      env: plan.childEnv,
    });
    if (result.error) {
      console.error(`${step.label} failed to start: ${result.error.message}`);
      return 1;
    }
    if (result.status !== 0) {
      console.error(`${step.label} failed with exit code ${result.status ?? 'unknown'}`);
      return result.status ?? 1;
    }
  }

  printLatestEvidence(plan.latestPath);
  return 0;
}

export function buildSequencePlan(argv, env = process.env) {
  const parsed = parseSequenceArgs(argv, env);
  if (parsed.help) return { help: true, steps: [], latestPath: parsed.latestPath, childEnv: env };
  assertNoReleaseInvalidEnvOverrides(argv, env);

  const childEnv = { ...env };
  delete childEnv.LIVE_E2E_OUTPUT_DIR;
  childEnv.OPENAI_BASE_URL = RELEASE_FIXED_OPTIONS.get('--openai-base-url');
  childEnv.OPENAI_MODEL = RELEASE_FIXED_OPTIONS.get('--openai-model');
  childEnv.ZAI_BASE_URL = RELEASE_FIXED_OPTIONS.get('--zai-base-url');
  childEnv.ZAI_MODEL = RELEASE_FIXED_OPTIONS.get('--zai-model');
  childEnv.ZAI_THINKING = RELEASE_FIXED_OPTIONS.get('--zai-thinking');

  const preflightArgs = [
    'scripts/validation/live-full-composition-e2e.mjs',
    ...parsed.forwardedArgs,
    '--preflight-only',
    ...parsed.preflightOutputArgs,
  ];
  const liveArgs = [
    'scripts/validation/live-full-composition-e2e.mjs',
    ...parsed.forwardedArgs,
    ...parsed.liveOutputArgs,
  ];
  const assertArgs = [
    'scripts/validation/assert-live-e2e-release-evidence.mjs',
    ...parsed.assertLatestArgs,
  ];

  return {
    help: false,
    latestPath: parsed.latestPath,
    childEnv,
    steps: [
      {
        label: 'Provider diagnostics',
        args: ['scripts/validation/live-provider-diagnostics.mjs', ...parsed.forwardedArgs],
      },
      {
        label: 'Provider preflight report',
        args: preflightArgs,
      },
      {
        label: 'Full live GPT-5.5 + GLM-5.1 interview',
        args: liveArgs,
      },
      {
        label: 'Release evidence assertion',
        args: assertArgs,
      },
    ],
  };
}

function parseSequenceArgs(argv, env) {
  const forwardedArgs = [];
  let outputBase = env.LIVE_E2E_OUTPUT_DIR || undefined;
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (RELEASE_UNSAFE_FLAGS.has(arg)) {
      throw new Error(`${arg} is not supported by the release sequence because release evidence requires the full live run and GPT-5.5 judge report.`);
    }
    if (RELEASE_PROMPT_FLAGS.has(arg)) {
      throw new Error(`${arg} is not supported by the release sequence because release evidence must use the canonical persona and judge rubric prompts.`);
    }
    if (RELEASE_FIXED_OPTIONS.has(arg)) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      if (value !== RELEASE_FIXED_OPTIONS.get(arg)) {
        throw new Error(`${arg}=${value} is not supported by the release sequence; release evidence requires ${arg}=${RELEASE_FIXED_OPTIONS.get(arg)}.`);
      }
      forwardedArgs.push(arg, value);
      i += 1;
      continue;
    }
    if (arg === '--depth') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing value for --depth');
      if (!RELEASE_DEPTHS.has(value)) {
        throw new Error(`Release sequence only supports Full Taste Composition depth; got --depth ${value}.`);
      }
      forwardedArgs.push(arg, value);
      i += 1;
      continue;
    }
    if (arg === '--output') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing value for --output');
      outputBase = value;
      i += 1;
      continue;
    }
    forwardedArgs.push(arg);
  }

  if (!outputBase) {
    return {
      help,
      forwardedArgs,
      preflightOutputArgs: [],
      liveOutputArgs: [],
      assertLatestArgs: [],
      latestPath: DEFAULT_LATEST_PATH,
    };
  }

  const base = resolve(outputBase);
  return {
    help,
    forwardedArgs,
    preflightOutputArgs: ['--output', join(base, 'preflight')],
    liveOutputArgs: ['--output', join(base, 'live')],
    assertLatestArgs: ['--latest', join(base, 'latest-run.json')],
    latestPath: join(base, 'latest-run.json'),
  };
}

function assertNoReleaseInvalidEnvOverrides(argv, env) {
  for (const name of RELEASE_PROXY_ENV_NAMES) {
    if (hasNonEmptyEnvValue(env[name])) {
      throw new Error(`${name} is not supported by the release sequence; release evidence must call official provider endpoints without proxy routing.`);
    }
  }

  for (const [name, expected] of RELEASE_FIXED_ENV.entries()) {
    const value = env[name];
    if (value !== undefined && value !== expected) {
      throw new Error(`${name}=${value} is not supported by the release sequence; release evidence requires ${name}=${expected}.`);
    }
  }

  const envFile = findEnvFileArg(argv, env);
  if (!envFile) return;
  if (!existsSync(envFile)) throw new Error(`Env file not found: ${envFile}`);
  const parsed = parseEnvFile(readFileSync(envFile, 'utf-8'));
  for (const name of RELEASE_PROXY_ENV_NAMES) {
    if (hasNonEmptyEnvValue(parsed[name])) {
      throw new Error(`${name} in ${envFile} is not supported by the release sequence; release evidence must call official provider endpoints without proxy routing.`);
    }
  }

  for (const [name, expected] of RELEASE_FIXED_ENV.entries()) {
    const value = parsed[name];
    if (value !== undefined && value !== expected) {
      throw new Error(`${name}=${value} in ${envFile} is not supported by the release sequence; release evidence requires ${name}=${expected}.`);
    }
  }
}

function hasNonEmptyEnvValue(value) {
  return value !== undefined && String(value).trim() !== '';
}

function printLatestEvidence(latestPath) {
  if (!existsSync(latestPath)) {
    console.log(`\nRelease sequence finished, but latest-run pointer was not found: ${latestPath}`);
    return;
  }

  const latest = JSON.parse(readFileSync(latestPath, 'utf-8'));
  const reportDir = latest.report_json ? dirname(latest.report_json) : latest.output_dir;
  console.log('\nLive release evidence accepted.');
  console.log(`latest-run: ${latestPath}`);
  console.log(`report: ${latest.report_json ?? join(reportDir, 'report.json')}`);
  console.log(`report_md: ${latest.report_md ?? join(reportDir, 'report.md')}`);
  console.log(`demo: ${latest.demo_md ?? join(reportDir, 'demo.md')}`);
  console.log(`transcript: ${join(reportDir, 'transcript.jsonl')}`);
}

function usage() {
  return [
    'Usage: node scripts/validation/run-live-e2e-release-sequence.mjs [live harness options]',
    '',
    'Runs the full live release evidence path in order:',
    '  1. node scripts/validation/live-provider-diagnostics.mjs',
    '  2. node scripts/validation/live-full-composition-e2e.mjs --preflight-only',
    '  3. node scripts/validation/live-full-composition-e2e.mjs',
    '  4. node scripts/validation/assert-live-e2e-release-evidence.mjs',
    '',
    'Forwarded options include --env-file, --domain, --depth full/full-taste-composition/operator, and --max-turns.',
    'Use --output <dir> to place preflight evidence in <dir>/preflight, live evidence in <dir>/live, and latest-run.json in <dir>.',
    '',
    'Rejected for release evidence: --no-judge, --mock-provider-smoke, --preflight-only, custom provider endpoints/models, custom prompt paths, proxy routing env vars, and non-Full depths.',
  ].join('\n');
}

function formatCommand(command, args) {
  return [command, ...args].map(quoteShellArg).join(' ');
}

function quoteShellArg(value) {
  const stringValue = String(value);
  return /^[A-Za-z0-9_./:@=-]+$/.test(stringValue) ? stringValue : `'${stringValue.replace(/'/g, "'\\''")}'`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
