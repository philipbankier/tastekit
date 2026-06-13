#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildChatCompletionsUrl } from './lib/live-e2e/chat-client.mjs';
import { DEFAULT_JUDGE_PATH, DEFAULT_OPENAI_BASE_URL, DEFAULT_PERSONA_PATH, DEFAULT_ZAI_BASE_URL } from './lib/live-e2e/options.mjs';
import { validateJudgeReport } from './lib/live-e2e/report.mjs';
import { expectedExportArtifactPaths } from './lib/live-e2e/artifacts.mjs';

const DEFAULT_LATEST_PATH = 'docs/validation/live/latest-run.json';
const OFFICIAL_OPENAI_CHAT_ENDPOINT = buildChatCompletionsUrl(DEFAULT_OPENAI_BASE_URL);
const OFFICIAL_ZAI_CHAT_ENDPOINT = buildChatCompletionsUrl(DEFAULT_ZAI_BASE_URL);
const REQUIRED_ASSERTIONS = [
  'provider-preflight',
  'live-interview-complete',
  'constitution-extensions',
  'validator',
  'export-artifacts-present',
  'runtime-markdown-safe',
  'managed-region-rerun-balanced',
  'managed-region-manual-content-preserved',
];
const REQUIRED_DOWNSTREAM = ['skills graph', 'trust audit', 'drift detect', 'eval run', 'eval replay'];
const REQUIRED_ARTIFACT_PATTERNS = [
  /\.tastekit\/constitution\.v1\.json$/,
  /\/CLAUDE\.md$/,
  /\/SOUL\.md$/,
  /\/AGENTS\.md$/,
];
const REQUIRED_WORKSPACE_ARTIFACTS = [
  '.tastekit/session.json',
  '.tastekit/constitution.v1.json',
  'CLAUDE.md',
  'SOUL.md',
  'AGENTS.md',
  '.tastekit/evals/live-e2e-evalpack.json',
  '.tastekit/traces/live-e2e-drift.trace.v1.jsonl',
  '.tastekit/traces/live-e2e-clean-replay.trace.v1.jsonl',
];
const REQUIRED_RUNTIME_MARKDOWN = ['CLAUDE.md', 'SOUL.md', 'AGENTS.md'];
const HIDDEN_RUNTIME_TERMS = [
  'transcript.jsonl',
  'dimension_updates',
  'policy reason codes',
  '<!--COVERAGE',
  'COVERAGE-->',
  'coverage_summary',
  'policy_decisions',
  'confirmation_checkpoints',
  'source_turns',
  'x-tastekit-metacognition',
  'x-tastekit-composition',
  'dimension_coverage',
  'structured_answers',
  'raw transcript',
  'Facts:',
  'facts:',
];

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage());
    return 1;
  }

  if (options.help) {
    console.log(usage());
    return 0;
  }

  let reportPath;
  try {
    const reportInput = resolveReportInput(options);
    reportPath = reportInput.reportPath;
    const report = readJson(reportPath);
    const result = validateLiveReleaseEvidence(report, { reportPath, latest: reportInput.latest });
    if (options.json) {
      console.log(JSON.stringify({ ok: true, report_json: reportPath, ...result }, null, 2));
    } else {
      console.log(`live release evidence passed: ${reportPath}`);
      console.log(`provider_mode=${result.provider_mode} turn_count=${result.turn_count} judge_average=${result.judge_average}`);
    }
    return 0;
  } catch (error) {
    const failures = error instanceof EvidenceError ? error.failures : [error instanceof Error ? error.message : String(error)];
    if (options?.json) {
      console.log(JSON.stringify({ ok: false, report_json: reportPath, failures }, null, 2));
    } else {
      console.log('live release evidence failed');
      for (const failure of failures) console.log(`- ${failure}`);
    }
    return 1;
  }
}

function parseArgs(argv) {
  const options = {
    latest: DEFAULT_LATEST_PATH,
    report: undefined,
    json: false,
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
      case '--latest':
        options.latest = readValue();
        break;
      case '--report':
        options.report = readValue();
        break;
      case '--json':
        options.json = true;
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

function usage() {
  return [
    'Usage: node scripts/validation/assert-live-e2e-release-evidence.mjs [options]',
    '',
    'Options:',
    '  --latest <path>  latest-run.json pointer, default docs/validation/live/latest-run.json',
    '  --report <path>  report.json path; overrides --latest',
    '  --json           Emit machine-readable result',
    '  --help           Print this help',
  ].join('\n');
}

function resolveReportInput(options) {
  if (options.report) return { reportPath: options.report, latest: null };
  if (!existsSync(options.latest)) throw new Error(`latest-run pointer missing: ${options.latest}`);
  const latest = readJson(options.latest);
  if (typeof latest.report_json !== 'string' || latest.report_json.trim().length === 0) {
    throw new Error(`latest-run pointer missing report_json: ${options.latest}`);
  }
  return { reportPath: latest.report_json, latest };
}

function readJson(path) {
  if (!existsSync(path)) throw new Error(`JSON file missing: ${path}`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function validateLiveReleaseEvidence(report, { reportPath, latest = null } = {}) {
  const failures = [];
  const metadata = report?.metadata ?? {};
  const interviewShape = report?.interviewShape ?? {};
  const assertions = Array.isArray(report?.assertions) ? report.assertions : [];
  const downstream = Array.isArray(report?.downstream) ? report.downstream : [];
  const artifacts = Array.isArray(report?.artifacts) ? report.artifacts : [];
  const judge = report?.judge;

  if (report?.result !== 'pass') failures.push('report.result must be pass');
  if (metadata.provider_mode !== 'live') failures.push('metadata.provider_mode must be live');
  if (metadata.depth !== 'Full Taste Composition') failures.push('metadata.depth must be Full Taste Composition');
  if (metadata.internal_depth !== 'operator') failures.push('metadata.internal_depth must be operator');
  if (metadata.credential_openai_key !== 'present') failures.push('OpenAI credential status must be present');
  if (metadata.credential_zai_key !== 'present') failures.push('Z.ai credential status must be present');
  if (metadata.openai_model !== 'gpt-5.5') failures.push('metadata.openai_model must be gpt-5.5');
  if (metadata.zai_model !== 'glm-5.1') failures.push('metadata.zai_model must be glm-5.1');
  validateCanonicalPromptHashes(metadata, failures);
  validateCurrentCheckoutStamp(metadata, failures);
  validateLatestPointer(latest, report, reportPath, failures);
  validateReportCompanionFiles(report, reportPath, failures);
  validateTranscriptProvenance(report, reportPath, failures);

  if (!Number.isFinite(interviewShape.turn_count) || interviewShape.turn_count <= 0) {
    failures.push('interviewShape.turn_count must be positive');
  }
  if (interviewShape.stop_reason !== 'tastekit-complete') {
    failures.push('interviewShape.stop_reason must be tastekit-complete');
  }

  const criticalFailures = Array.isArray(report?.failures)
    ? report.failures.filter(failure => failure?.severity === 'critical')
    : [];
  if (criticalFailures.length > 0) failures.push(`report.failures must not contain critical failures (${criticalFailures.length} found)`);

  for (const name of REQUIRED_ASSERTIONS) {
    const assertion = assertions.find(item => item?.name === name);
    if (!assertion) failures.push(`missing assertion: ${name}`);
    else if (assertion.status !== 'pass') failures.push(`assertion must pass: ${name}`);
  }
  const failedCriticalAssertions = assertions.filter(item => item?.severity === 'critical' && item?.status !== 'pass');
  if (failedCriticalAssertions.length > 0) {
    failures.push(`critical assertions must all pass (${failedCriticalAssertions.length} failed)`);
  }

  for (const name of REQUIRED_DOWNSTREAM) {
    const item = downstream.find(entry => entry?.name === name);
    if (!item) failures.push(`missing downstream check: ${name}`);
    else if (item.status !== 'pass') failures.push(`downstream check must pass: ${name}`);
  }

  for (const pattern of REQUIRED_ARTIFACT_PATTERNS) {
    const artifact = artifacts.find(item => typeof item?.path === 'string' && pattern.test(normalizeArtifactPath(item.path)));
    if (!artifact) failures.push(`missing artifact matching ${pattern}`);
    else if (artifact.exists !== true || !isSha256(artifact.sha256)) failures.push(`artifact must exist with sha256: ${artifact.path}`);
    else validateArtifactOnDisk(artifact, failures);
  }
  validateExpectedArtifacts(report, failures);

  if (!judge || typeof judge !== 'object') {
    failures.push('judge report must be present');
  } else {
    try {
      const validatedJudge = validateJudgeReport(judge);
      if (validatedJudge.passed !== true) failures.push('judge.passed must be true');
      if (validatedJudge.average < 4) failures.push('judge.average must be at least 4');
      if (validatedJudge.critical_concerns.length > 0) failures.push('judge.critical_concerns must be empty');
    } catch (error) {
      failures.push(`judge.scores must include required dimensions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!Array.isArray(report?.verificationCommands) || !report.verificationCommands.includes('pnpm test:live-e2e')) {
    failures.push('verificationCommands must include pnpm test:live-e2e');
  }

  const demoPath = join(dirname(reportPath ?? ''), 'demo.md');
  if (reportPath && existsSync(demoPath)) {
    const demo = readFileSync(demoPath, 'utf-8');
    if (/mock-provider smoke|not live release evidence/i.test(demo)) failures.push('demo.md must not be mock-provider evidence');
    validateDemoMarkdown(demo, failures);
  } else if (reportPath) {
    failures.push('demo.md must exist next to report.json');
  }

  if (failures.length > 0) throw new EvidenceError(failures);
  return {
    provider_mode: metadata.provider_mode,
    domain: metadata.domain,
    depth: metadata.depth,
    turn_count: interviewShape.turn_count,
    judge_average: judge.average,
  };
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function validateReportValueWalkthrough(walkthrough, failures, { constitutionDimensionIds = null } = {}) {
  if (!walkthrough || typeof walkthrough !== 'object') {
    failures.push('report.valueWalkthrough must be present');
    return;
  }
  const coverage = walkthrough.coverage;
  if (!coverage || typeof coverage !== 'object') {
    failures.push('report.valueWalkthrough coverage must be present');
  } else {
    if (coverage.evidence_kind !== 'live extraction') {
      failures.push('report.valueWalkthrough coverage.evidence_kind must be live extraction');
    }
    if (!positiveNumber(coverage.covered_dimensions) || !positiveNumber(coverage.total_dimensions)) {
      failures.push('report.valueWalkthrough coverage must show positive live covered and total dimensions');
    }
  }
  const dimensionExamples = Array.isArray(walkthrough.dimension_examples) ? walkthrough.dimension_examples : [];
  if (!dimensionExamples.some(isConcreteDimensionExample)) {
    failures.push('report.valueWalkthrough dimension_examples must include at least one concrete mapping');
  } else if (constitutionDimensionIds instanceof Set && constitutionDimensionIds.size > 0) {
    const unknown = dimensionExamples
      .map(item => (typeof item?.id === 'string' ? item.id.trim() : ''))
      .filter(Boolean)
      .filter(id => !constitutionDimensionIds.has(id));
    if (unknown.length > 0) {
      failures.push(`report.valueWalkthrough dimension_examples include IDs not present in constitution: ${[...new Set(unknown)].join(', ')}`);
    }
  }
  if (!hasNonEmptyStringItem(walkthrough.runtime_guidance)) {
    failures.push('report.valueWalkthrough runtime_guidance must include at least one item');
  }
  if (!hasNonEmptyStringItem(walkthrough.safety)) {
    failures.push('report.valueWalkthrough safety must include at least one item');
  }
}

function isConcreteDimensionExample(item) {
  return item
    && typeof item === 'object'
    && typeof item.id === 'string'
    && item.id.trim().length > 0
    && typeof item.summary === 'string'
    && item.summary.trim().length > 0;
}

function hasNonEmptyStringItem(value) {
  return Array.isArray(value) && value.some(item => typeof item === 'string' && item.trim().length > 0);
}

function positiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function validateArtifactOnDisk(artifact, failures) {
  if (!existsSync(artifact.path)) {
    failures.push(`artifact file missing: ${artifact.path}`);
    return;
  }
  const stat = statSync(artifact.path);
  if (!stat.isFile()) {
    failures.push(`artifact path is not a file: ${artifact.path}`);
    return;
  }
  const actual = createHash('sha256').update(readFileSync(artifact.path)).digest('hex');
  if (actual !== artifact.sha256) {
    failures.push(`artifact sha256 mismatch: ${artifact.path}`);
  }
}

function normalizeArtifactPath(path) {
  return String(path).replace(/\\/g, '/');
}

function validateCanonicalPromptHashes(metadata, failures) {
  const expectedPersona = sha256File(DEFAULT_PERSONA_PATH, failures, 'canonical persona prompt');
  const expectedJudge = sha256File(DEFAULT_JUDGE_PATH, failures, 'canonical judge rubric');
  if (metadata.persona_path !== DEFAULT_PERSONA_PATH) {
    failures.push(`metadata.persona_path must be ${DEFAULT_PERSONA_PATH}`);
  }
  if (metadata.judge_rubric_path !== DEFAULT_JUDGE_PATH) {
    failures.push(`metadata.judge_rubric_path must be ${DEFAULT_JUDGE_PATH}`);
  }
  if (metadata.persona_sha256 !== expectedPersona) {
    failures.push('metadata.persona_sha256 must match the canonical persona prompt');
  }
  if (metadata.judge_rubric_sha256 !== expectedJudge) {
    failures.push('metadata.judge_rubric_sha256 must match the canonical judge rubric');
  }
}

function sha256File(path, failures, label) {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch (error) {
    failures.push(`${label} could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

function validateExpectedArtifacts(report, failures) {
  const metadata = report?.metadata ?? {};
  const artifacts = Array.isArray(report?.artifacts) ? report.artifacts : [];
  const workspaceDir = metadata.workspace_dir;
  const outputDir = metadata.output_dir;
  if (typeof workspaceDir !== 'string' || workspaceDir.length === 0) {
    failures.push('metadata.workspace_dir must be present for artifact validation');
    return;
  }
  if (typeof outputDir !== 'string' || outputDir.length === 0) {
    failures.push('metadata.output_dir must be present for artifact validation');
    return;
  }

  const requiredPaths = [
    ...REQUIRED_WORKSPACE_ARTIFACTS.map(path => join(workspaceDir, path)),
    ...expectedExportArtifactPaths(join(outputDir, 'exports')),
  ];
  for (const path of requiredPaths) {
    const artifact = artifacts.find(item => item?.path === path);
    if (!artifact) {
      failures.push(`missing exact artifact: ${path}`);
      continue;
    }
    if (artifact.exists !== true || !isSha256(artifact.sha256)) {
      failures.push(`exact artifact must exist with sha256: ${path}`);
      continue;
    }
    validateArtifactOnDisk(artifact, failures);
  }

  validateSessionContent(join(workspaceDir, '.tastekit/session.json'), failures, report);
  const constitutionDimensionIds = validateConstitutionContent(join(workspaceDir, '.tastekit/constitution.v1.json'), metadata, failures);
  validateReportValueWalkthrough(report?.valueWalkthrough, failures, { constitutionDimensionIds });
  for (const name of REQUIRED_RUNTIME_MARKDOWN) {
    validateManagedRuntimeMarkdown(join(workspaceDir, name), failures);
  }
  validateEvalPackContent(join(workspaceDir, '.tastekit/evals/live-e2e-evalpack.json'), failures);
  validateTraceContent(join(workspaceDir, '.tastekit/traces/live-e2e-drift.trace.v1.jsonl'), {
    label: 'drift trace',
    requiredEventTypes: ['approval_response', 'error'],
    forbiddenEventTypes: [],
  }, failures);
  validateTraceContent(join(workspaceDir, '.tastekit/traces/live-e2e-clean-replay.trace.v1.jsonl'), {
    label: 'clean replay trace',
    requiredEventTypes: ['tool_result'],
    forbiddenEventTypes: ['error', 'approval_response'],
  }, failures);
  for (const [path, label] of [
    [join(outputDir, 'exports/claude-code/CLAUDE.md'), 'export CLAUDE.md'],
    [join(outputDir, 'exports/openclaw/SOUL.md'), 'export SOUL.md'],
    [join(outputDir, 'exports/openclaw/AGENTS.md'), 'export AGENTS.md'],
    [join(outputDir, 'exports/agents-md/AGENTS.md'), 'export AGENTS.md'],
  ]) {
    validateManagedRuntimeMarkdown(path, failures, { label });
  }
}

function validateSessionContent(path, failures, report) {
  try {
    const session = readJson(path);
    if (session?.depth !== 'operator') failures.push('session.json depth must be operator for Full Taste Composition release evidence');
    if (session?.domain_id !== report?.metadata?.domain) failures.push('session.json domain_id must match report metadata domain');
    if (session?.current_step !== 'complete') failures.push('session.json current_step must be complete');
    if (!Array.isArray(session?.completed_steps) || !session.completed_steps.includes('interview')) {
      failures.push('session.json must include completed interview step');
    }
    if (session?.interview?.is_complete !== true) failures.push('session.json interview.is_complete must be true');
    if (session?.interview?.turn_count !== report?.interviewShape?.turn_count) {
      failures.push('session.json interview.turn_count must match reported turn_count');
    }
    const structuredAnswers = session?.structured_answers;
    if (!structuredAnswers || typeof structuredAnswers !== 'object' || Object.keys(structuredAnswers).length === 0) {
      failures.push('session.json structured_answers must be non-empty');
    }
  } catch (error) {
    failures.push(`session.json must be readable JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateConstitutionContent(path, metadata, failures) {
  let constitution;
  try {
    constitution = readJson(path);
  } catch (error) {
    failures.push(`constitution must be readable JSON: ${error instanceof Error ? error.message : String(error)}`);
    return new Set();
  }
  if (constitution?.schema_version !== 'constitution.v1') failures.push('constitution schema_version must be constitution.v1');
  const composition = constitution?.extensions?.['x-tastekit-composition'];
  const metacognition = constitution?.extensions?.['x-tastekit-metacognition'];
  if (!composition || typeof composition !== 'object') {
    failures.push('constitution must include x-tastekit-composition');
  } else {
    if (composition.schema_version !== 'tastekit.composition.v1') {
      failures.push('x-tastekit-composition schema_version must be tastekit.composition.v1');
    }
    if (composition.domain_id !== metadata.domain) {
      failures.push('x-tastekit-composition domain_id must match report metadata domain');
    }
    if (!composition.dimensions || typeof composition.dimensions !== 'object' || Object.keys(composition.dimensions).length === 0) {
      failures.push('x-tastekit-composition dimensions must be non-empty');
    }
  }
  if (!metacognition || typeof metacognition !== 'object') {
    failures.push('constitution must include x-tastekit-metacognition');
  } else {
    if (metacognition.schema_version !== 'tastekit.metacognition.v1') {
      failures.push('x-tastekit-metacognition schema_version must be tastekit.metacognition.v1');
    }
    if (!metacognition.coverage_summary || typeof metacognition.coverage_summary !== 'object') {
      failures.push('x-tastekit-metacognition coverage_summary must be present');
    }
    const checkpoints = Array.isArray(metacognition.confirmation_checkpoints)
      ? metacognition.confirmation_checkpoints
      : [];
    if (!checkpoints.some(checkpoint => checkpoint?.type === 'draft' && checkpoint.accepted === true)) {
      failures.push('x-tastekit-metacognition must include an accepted draft confirmation checkpoint');
    }
    const finishNowAssumptions = Array.isArray(metacognition.unresolved_assumptions)
      ? metacognition.unresolved_assumptions.filter(assumption => assumption?.source === 'user_finish_now')
      : [];
    if (isFullTasteComposition(metadata, composition) && finishNowAssumptions.length > 0) {
      failures.push('Full Taste Composition release evidence cannot contain user_finish_now assumptions');
    }
  }
  if (isFullTasteComposition(metadata, composition) && composition?.dimensions && typeof composition.dimensions === 'object') {
    for (const [dimensionId, dimension] of Object.entries(composition.dimensions)) {
      if (!isCompositionDimensionCovered(dimension)) {
        failures.push(`Full Taste Composition dimension ${dimensionId} is not covered`);
      }
    }
  }
  return composition?.dimensions && typeof composition.dimensions === 'object'
    ? new Set(Object.keys(composition.dimensions))
    : new Set();
}

function isFullTasteComposition(metadata, composition) {
  return metadata?.depth === 'Full Taste Composition'
    || metadata?.internal_depth === 'operator'
    || composition?.mode === 'operator'
    || composition?.mode === 'full_taste_composition';
}

function isCompositionDimensionCovered(dimension) {
  if (!dimension || typeof dimension !== 'object') return false;
  if (dimension.status === 'covered') return true;
  const confidence = typeof dimension.confidence === 'number' ? dimension.confidence : 0;
  const threshold = typeof dimension.confidence_threshold === 'number' ? dimension.confidence_threshold : 1.5;
  return confidence >= threshold;
}

function validateEvalPackContent(path, failures) {
  let evalPack;
  try {
    evalPack = readJson(path);
  } catch (error) {
    failures.push(`eval pack must be readable JSON: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (evalPack?.schema_version !== 'evalpack.v1') failures.push('eval pack schema_version must be evalpack.v1');
  const scenarios = Array.isArray(evalPack?.scenarios) ? evalPack.scenarios : [];
  if (scenarios.length < 4) failures.push('eval pack must contain at least four scenarios');
  const scenarioIds = new Set(scenarios.map(scenario => scenario?.scenario_id).filter(Boolean));
  for (const id of ['challenge-weak-assumptions', 'state-uncertainty', 'ask-before-irreversible-public-actions', 'compress-on-fatigue']) {
    if (!scenarioIds.has(id)) failures.push(`eval pack missing scenario: ${id}`);
  }
  const rules = Array.isArray(evalPack?.judging?.rules) ? evalPack.judging.rules : [];
  if (rules.length < 4) failures.push('eval pack judging rules must contain at least four rules');
}

function validateTraceContent(path, { label, requiredEventTypes, forbiddenEventTypes }, failures) {
  const events = readJsonl(path, label, failures);
  if (events.length === 0) return;
  for (const event of events) {
    if (event?.schema_version !== 'trace_event.v1') failures.push(`${label} events must use schema_version trace_event.v1`);
  }
  const eventTypes = new Set(events.map(event => event?.event_type).filter(Boolean));
  const missing = requiredEventTypes.filter(type => !eventTypes.has(type));
  if (missing.length > 0) failures.push(`${label} must contain ${requiredEventTypes.join(' and ')} events`);
  const forbidden = forbiddenEventTypes.filter(type => eventTypes.has(type));
  if (forbidden.length > 0) failures.push(`${label} must not contain ${forbidden.join(' or ')} events`);
}

function readJsonl(path, label, failures) {
  try {
    const content = readFileSync(path, 'utf-8').trim();
    if (!content) {
      failures.push(`${label} must contain JSONL events`);
      return [];
    }
    return content.split('\n').map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        failures.push(`${label} line ${index + 1} must be valid JSON`);
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    failures.push(`${label} must be readable: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function validateManagedRuntimeMarkdown(path, failures, { label = basename(path) } = {}) {
  try {
    const markdown = readFileSync(path, 'utf-8');
    const beginCount = (markdown.match(/BEGIN TASTEKIT MANAGED REGION/g) ?? []).length;
    const endCount = (markdown.match(/END TASTEKIT MANAGED REGION/g) ?? []).length;
    if (beginCount !== 1 || endCount !== 1) {
      failures.push(`${label} must contain exactly one TasteKit managed region`);
    }
    const region = extractManagedRegion(markdown);
    if (region.trim().length < 80) {
      failures.push(`${label} managed region must contain non-empty runtime guidance`);
    }
    const leakedTerms = HIDDEN_RUNTIME_TERMS.filter(term => markdown.toLowerCase().includes(term.toLowerCase()));
    if (leakedTerms.length > 0) {
      failures.push(`${label} must not expose hidden interview machinery or raw transcript references (${leakedTerms.join(', ')})`);
    }
  } catch (error) {
    failures.push(`runtime markdown must be readable: ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function extractManagedRegion(markdown) {
  const match = markdown.match(/<!-- BEGIN TASTEKIT MANAGED REGION -->([\s\S]*?)<!-- END TASTEKIT MANAGED REGION -->/);
  return match ? match[1] : '';
}

function validateCurrentCheckoutStamp(metadata, failures) {
  const current = currentCheckoutStamp();
  if (current.git_errors.length > 0) {
    failures.push(`current git checkout metadata could not be read: ${current.git_errors.join('; ')}`);
  }
  if (!/^[a-f0-9]{40}$/i.test(String(metadata.git_commit ?? ''))) {
    failures.push('metadata.git_commit must be a full 40-character git commit sha');
  }
  if (!isSha256(metadata.git_dirty_fingerprint)) {
    failures.push('metadata.git_dirty_fingerprint must be a sha256 hash');
  }
  if (metadata.package_version !== current.package_version) {
    failures.push('metadata.package_version must match current package.json version');
  }
  if (metadata.git_commit !== current.git_commit) {
    failures.push('metadata.git_commit must match current HEAD');
  }
  if (metadata.git_dirty !== current.git_dirty) {
    failures.push('metadata.git_dirty must match current checkout dirty state');
  }
  if (metadata.git_dirty_fingerprint !== current.git_dirty_fingerprint) {
    failures.push('metadata.git_dirty_fingerprint must match current checkout dirty fingerprint');
  }
}

function currentCheckoutStamp() {
  const gitErrors = [];
  return {
    package_version: readJson('package.json').version,
    git_commit: execGit(['rev-parse', 'HEAD'], gitErrors),
    git_dirty: execGit(['status', '--porcelain'], gitErrors).trim().length > 0,
    git_dirty_fingerprint: checkoutDirtyFingerprint(gitErrors),
    git_errors: gitErrors,
  };
}

function checkoutDirtyFingerprint(gitErrors = []) {
  const hash = createHash('sha256');
  for (const args of [
    ['status', '--porcelain=v1', '-z'],
    ['diff', '--binary'],
    ['diff', '--cached', '--binary'],
  ]) {
    hash.update(execGit(args, gitErrors));
    hash.update('\0');
  }
  const untracked = execGit(['ls-files', '--others', '--exclude-standard', '-z'], gitErrors)
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

function execGit(args, gitErrors = []) {
  try {
    return execFileSync('git', args, { encoding: 'utf-8', maxBuffer: 128 * 1024 * 1024 }).trim();
  } catch (error) {
    const command = args.join(' ');
    const code = error && typeof error === 'object' && 'status' in error ? error.status : 'unknown';
    gitErrors.push(`git ${command} failed with ${code}`);
    return `__git_error_${code}__`;
  }
}

function validateReportCompanionFiles(report, reportPath, failures) {
  if (!reportPath) return;
  const reportDir = dirname(reportPath);
  const reportMdPath = join(reportDir, 'report.md');
  if (!existsSync(reportMdPath)) {
    failures.push('report.md must exist next to report.json');
  } else {
    validateReportMarkdownContent(readFileSync(reportMdPath, 'utf-8'), report, failures);
  }

  const judgeJsonPath = join(reportDir, 'judge-report.json');
  const judgeRawPath = join(reportDir, 'judge-report.raw.txt');
  if (!existsSync(judgeJsonPath)) failures.push('judge-report.json must exist next to report.json');
  if (!existsSync(judgeRawPath)) failures.push('judge-report.raw.txt must exist next to report.json');
  if (!existsSync(judgeJsonPath) || !report?.judge) return;

  try {
    const judgeFile = validateJudgeReport(readJson(judgeJsonPath));
    const reportJudge = validateJudgeReport(report.judge);
    if (JSON.stringify(judgeFile) !== JSON.stringify(reportJudge)) {
      failures.push('judge-report.json must match report.judge');
    }
  } catch (error) {
    failures.push(`judge-report.json must be a valid judge report: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateReportMarkdownContent(reportMarkdown, report, failures) {
  if (!reportMarkdown.includes(`Result: **${report?.result}**`)) {
    failures.push('report.md result must match report.json');
  }
  const metadata = report?.metadata ?? {};
  for (const key of [
    'provider_mode',
    'domain',
    'depth',
    'package_version',
    'git_commit',
    'git_dirty',
    'git_dirty_fingerprint',
    'persona_sha256',
    'judge_rubric_sha256',
  ]) {
    if (!reportMarkdown.includes(`- ${key}: ${String(metadata[key])}`)) {
      failures.push(`report.md must include metadata ${key}`);
    }
  }
}

function validateTranscriptProvenance(report, reportPath, failures) {
  if (!reportPath) return;
  const transcriptPath = join(dirname(reportPath), 'transcript.jsonl');
  const events = readTranscriptEvents(transcriptPath, failures);
  validateTranscriptPreflight(events, 'openai', 'gpt-5.5', OFFICIAL_OPENAI_CHAT_ENDPOINT, failures);
  validateTranscriptPreflight(events, 'zai', 'glm-5.1', OFFICIAL_ZAI_CHAT_ENDPOINT, failures);
  validateTranscriptProviderAssertion(events, failures);
  validateTranscriptConversation(events, report, failures);
  validateTranscriptJudge(events, report, failures);
}

function readTranscriptEvents(transcriptPath, failures) {
  if (!existsSync(transcriptPath)) {
    failures.push('transcript.jsonl must exist next to report.json');
    return [];
  }
  try {
    const content = readFileSync(transcriptPath, 'utf-8').trim();
    if (!content) {
      failures.push('transcript.jsonl must contain run events');
      return [];
    }
    return content.split('\n').map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        failures.push(`transcript.jsonl line ${index + 1} must be valid JSON`);
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    failures.push(`transcript.jsonl could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function validateTranscriptPreflight(events, provider, model, endpoint, failures) {
  const preflight = events.find(event => (
    event?.type === 'preflight'
    && event.data?.provider === provider
    && event.data?.model === model
  ));
  if (!preflight) {
    failures.push(`missing transcript preflight: ${provider} ${model}`);
    return;
  }
  if (preflight.data?.endpoint !== endpoint) {
    failures.push(`${provider} preflight endpoint must be ${endpoint}`);
  }
  if (String(preflight.data?.response_preview ?? '').trim().toLowerCase() !== 'ok') {
    failures.push(`${provider} preflight response must be ok`);
  }
}

function validateTranscriptProviderAssertion(events, failures) {
  const assertion = events.find(event => (
    event?.type === 'assertion'
    && event.data?.name === 'provider-preflight'
    && event.data?.status === 'pass'
    && event.data?.severity === 'critical'
  ));
  if (!assertion) {
    failures.push('transcript must include passing provider-preflight assertion');
    return;
  }
  if (assertion.data?.openai_model !== 'gpt-5.5') failures.push('provider-preflight assertion must record gpt-5.5');
  if (assertion.data?.zai_model !== 'glm-5.1') failures.push('provider-preflight assertion must record glm-5.1');
  if (assertion.data?.openai_endpoint !== OFFICIAL_OPENAI_CHAT_ENDPOINT) {
    failures.push(`provider-preflight assertion openai endpoint must be ${OFFICIAL_OPENAI_CHAT_ENDPOINT}`);
  }
  if (assertion.data?.zai_endpoint !== OFFICIAL_ZAI_CHAT_ENDPOINT) {
    failures.push(`provider-preflight assertion zai endpoint must be ${OFFICIAL_ZAI_CHAT_ENDPOINT}`);
  }
}

function validateTranscriptConversation(events, report, failures) {
  const interviewerTurns = events.filter(event => event?.type === 'interviewer_message');
  const userTurns = events.filter(event => event?.type === 'simulated_user_message');
  if (interviewerTurns.length === 0) failures.push('transcript must include interviewer_message events');
  if (userTurns.length === 0) failures.push('transcript must include simulated_user_message events');
  const reportedTurns = report?.interviewShape?.turn_count;
  if (Number.isFinite(reportedTurns) && reportedTurns > 0) {
    if (interviewerTurns.length !== reportedTurns) {
      failures.push('transcript interviewer_message count must equal reported turn_count');
    }
    if (userTurns.length !== reportedTurns) {
      failures.push('transcript simulated_user_message count must equal reported turn_count');
    }
    const completedState = events.find(event => (
      event?.type === 'state_update'
      && event.data?.is_complete === true
      && event.data?.turn === reportedTurns
    ));
    if (!completedState) {
      failures.push('transcript must include completed state_update matching reported turn_count');
    }
  }
}

function validateTranscriptJudge(events, report, failures) {
  if (!report?.judge) return;
  const judgeEvent = events.find(event => event?.type === 'judge_score');
  if (!judgeEvent) failures.push('transcript must include judge_score event');
}

function validateLatestPointer(latest, report, reportPath, failures) {
  if (!latest) return;
  const metadata = report?.metadata ?? {};
  const checks = [
    ['result', latest.result, report?.result],
    ['provider_mode', latest.provider_mode, metadata.provider_mode],
    ['output_dir', latest.output_dir, metadata.output_dir],
    ['depth', latest.depth, metadata.depth],
    ['domain', latest.domain, metadata.domain],
  ];
  for (const [field, actual, expected] of checks) {
    if (actual !== expected) failures.push(`latest-run ${field} does not match report metadata`);
  }
  if (latest.report_json !== reportPath) failures.push('latest-run report_json does not match selected report');
  const expectedReportMdPath = reportPath ? join(dirname(reportPath), 'report.md') : undefined;
  if (latest.report_md !== expectedReportMdPath) failures.push('latest-run report_md does not match report directory');
  if (expectedReportMdPath && !existsSync(expectedReportMdPath)) failures.push('latest-run report_md file does not exist');
  const expectedDemoPath = reportPath ? join(dirname(reportPath), 'demo.md') : undefined;
  if (latest.demo_md !== expectedDemoPath) failures.push('latest-run demo_md does not match report directory');
}

function validateDemoMarkdown(demo, failures) {
  const requiredSnippets = [
    '# TasteKit Full Taste Composition Demo',
    'TasteKit completed an agent-native Full Taste Composition interview',
    '## Extracted Taste',
    '## TasteKit Value Walkthrough',
    'Coverage evidence: live extraction',
    '### Domain Mapping Examples',
    '### Runtime Guidance Produced',
    '### Safety And Portability',
    '## Runtime Impact',
    '## Validation Evidence',
    '## Judge Read',
    '## Reproduction Commands',
  ];
  const missing = requiredSnippets.filter(snippet => !demo.includes(snippet));
  if (missing.length > 0) failures.push(`demo.md missing required live walkthrough content: ${missing.join(', ')}`);
  const coverageMatch = demo.match(/^- Coverage:\s+(\d+)\/(\d+)\s+dimensions\s*$/m);
  if (!coverageMatch || Number(coverageMatch[1]) <= 0 || Number(coverageMatch[2]) <= 0) {
    failures.push('demo.md Coverage line must show positive covered and total dimensions');
  }
  for (const heading of ['Domain Mapping Examples', 'Runtime Guidance Produced', 'Safety And Portability']) {
    if (!sectionHasBullet(demo, `### ${heading}`)) {
      failures.push(`demo.md ${heading} section must include at least one bullet`);
    }
  }
  if (/No taste summary was available|No deterministic validation evidence|No qualitative judge report|No reproduction commands/i.test(demo)) {
    failures.push('demo.md contains placeholder missing-evidence text');
  }
}

function sectionHasBullet(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start === -1) return false;
  const rest = markdown.slice(start + heading.length);
  const nextHeading = rest.search(/\n#{2,3}\s+/);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  return section.split(/\r?\n/).some(line => /^-\s+\S/.test(line.trim()));
}

class EvidenceError extends Error {
  constructor(failures) {
    super(failures.join('; '));
    this.failures = failures;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
