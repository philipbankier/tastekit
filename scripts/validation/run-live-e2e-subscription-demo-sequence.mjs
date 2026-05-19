#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_CLIPROXY_KEY_FILE, DEFAULT_CLIPROXY_OPENAI_BASE_URL } from './lib/live-e2e/options.mjs';

const DEFAULT_LATEST_PATH = 'docs/validation/live/latest-run.json';
const UNSAFE_FLAGS = new Set(['--no-judge', '--mock-provider-smoke', '--preflight-only']);

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

  const childEnv = { ...env };
  delete childEnv.LIVE_E2E_OUTPUT_DIR;
  childEnv.OPENAI_BASE_URL = env.CLIPROXY_OPENAI_BASE_URL || DEFAULT_CLIPROXY_OPENAI_BASE_URL;
  childEnv.OPENAI_MODEL = env.CLIPROXY_OPENAI_MODEL || env.OPENAI_MODEL || 'grok-4.3';
  childEnv.OPENAI_API_KEY_FILE = env.CLIPROXY_API_KEY_FILE || env.OPENAI_API_KEY_FILE || DEFAULT_CLIPROXY_KEY_FILE;

  const sharedArgs = [
    '--cliproxy-openai',
    ...parsed.forwardedArgs,
  ];
  const preflightArgs = [
    'scripts/validation/live-full-composition-e2e.mjs',
    ...sharedArgs,
    '--preflight-only',
    ...parsed.preflightOutputArgs,
  ];
  const liveArgs = [
    'scripts/validation/live-full-composition-e2e.mjs',
    ...sharedArgs,
    ...parsed.liveOutputArgs,
  ];

  return {
    help: false,
    latestPath: parsed.latestPath,
    childEnv,
    steps: [
      {
        label: 'Subscription provider diagnostics',
        args: ['scripts/validation/live-provider-diagnostics.mjs', ...sharedArgs],
      },
      {
        label: 'Subscription provider preflight report',
        args: preflightArgs,
      },
      {
        label: 'Full subscription-backed live interview',
        args: liveArgs,
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
    if (arg === '--') {
      continue;
    }
    if (UNSAFE_FLAGS.has(arg)) {
      throw new Error(`${arg} is not supported by the subscription demo sequence because the demo requires the full live run and judge report.`);
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
      latestPath: DEFAULT_LATEST_PATH,
    };
  }

  const base = resolve(outputBase);
  return {
    help,
    forwardedArgs,
    preflightOutputArgs: ['--output', join(base, 'preflight')],
    liveOutputArgs: ['--output', join(base, 'live')],
    latestPath: join(base, 'latest-run.json'),
  };
}

function printLatestEvidence(latestPath) {
  if (!existsSync(latestPath)) {
    console.log(`\nSubscription demo finished, but latest-run pointer was not found: ${latestPath}`);
    return;
  }

  const latest = JSON.parse(readFileSync(latestPath, 'utf-8'));
  const reportDir = latest.report_json ? dirname(latest.report_json) : latest.output_dir;
  console.log('\nSubscription-backed live demo finished.');
  console.log(`latest-run: ${latestPath}`);
  console.log(`report: ${latest.report_json ?? join(reportDir, 'report.json')}`);
  console.log(`report_md: ${latest.report_md ?? join(reportDir, 'report.md')}`);
  console.log(`demo: ${latest.demo_md ?? join(reportDir, 'demo.md')}`);
  console.log(`transcript: ${join(reportDir, 'transcript.jsonl')}`);
}

function usage() {
  return [
    'Usage: node scripts/validation/run-live-e2e-subscription-demo-sequence.mjs [live harness options]',
    '',
    'Runs a subscription-backed real-world live demo through local CLIProxyAPI for the interviewer/judge and Z.ai GLM-5.1 for the simulated human:',
    '  1. node scripts/validation/live-provider-diagnostics.mjs --cliproxy-openai',
    '  2. node scripts/validation/live-full-composition-e2e.mjs --cliproxy-openai --preflight-only',
    '  3. node scripts/validation/live-full-composition-e2e.mjs --cliproxy-openai',
    '',
    'Defaults:',
    `  CLIPROXY_OPENAI_BASE_URL=${DEFAULT_CLIPROXY_OPENAI_BASE_URL}`,
    '  CLIPROXY_OPENAI_MODEL=grok-4.3',
    `  CLIPROXY_API_KEY_FILE=${DEFAULT_CLIPROXY_KEY_FILE}`,
    '',
    'Forwarded options include --env-file, --domain, --depth full/full-taste-composition/operator, --max-turns, Z.ai endpoint/model flags, and prompt paths.',
    'Use --output <dir> to place preflight evidence in <dir>/preflight and live evidence in <dir>/live.',
    '',
    'This is not official release evidence. Official release evidence still requires pnpm test:live-e2e:release.',
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
