import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { redactSecrets } from './chat-client.mjs';

export const REQUIRED_JUDGE_DIMENSIONS = [
  'Depth',
  'Specificity',
  'Tension capture',
  'Autonomy boundaries',
  'Challenge style',
  'Evidence behavior',
  'Metacognition',
  'Runtime usability',
  'Drift/eval readiness',
];

const REQUIRED_JUDGE_DIMENSION_KEYS = new Set(REQUIRED_JUDGE_DIMENSIONS.map(normalizeJudgeDimension));

export function classifyExitCode({ failures, judgePassed, judgeAvailable, judgeRequired = false }) {
  if (failures.some(failure => failure.severity === 'critical')) return 1;
  if (judgeRequired && !judgeAvailable) return 2;
  if (judgeAvailable && judgePassed === false) return 2;
  return 0;
}

export function extractJsonObject(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('No JSON content found');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON object found in command output');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function summarizeCommandResult(name, result) {
  if (result.code !== 0) {
    return {
      name,
      status: 'fail',
      summary: `exit=${result.code}`,
    };
  }

  try {
    const json = extractJsonObject(result.stdout || result.stderr || '');
    if (Array.isArray(json.results)) {
      const results = json.results;
      const passedCount = results.filter(item => item?.passed === true).length;
      const failedCount = results.filter(item => item?.passed === false).length;
      const allResultsHavePassState = results.every(item => typeof item?.passed === 'boolean');
      const scores = results
        .map(item => typeof item?.score === 'number' ? item.score : undefined)
        .filter(score => score !== undefined);
      const averageScore = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : undefined;
      return {
        name,
        status: allResultsHavePassState && failedCount === 0 && results.length > 0 ? 'pass' : 'fail',
        summary: [
          `results=${results.length}`,
          `passed=${passedCount}`,
          failedCount > 0 ? `failed=${failedCount}` : undefined,
          averageScore !== undefined ? `avg=${averageScore.toFixed(2)}/1.00` : undefined,
        ].filter(Boolean).join(' '),
      };
    }
    if (typeof json.passed !== 'boolean') {
      return {
        name,
        status: 'fail',
        summary: 'missing boolean passed field',
      };
    }
    const status = json.passed === false ? 'fail' : 'pass';
    const summaryParts = [];
    if (typeof json.passed === 'boolean') summaryParts.push(`passed=${json.passed}`);
    if (json.overall_score !== undefined) summaryParts.push(`score=${json.overall_score}`);
    if (Array.isArray(json.violations)) summaryParts.push(`violations=${json.violations.length}`);
    return {
      name,
      status,
      summary: summaryParts.join(' ') || 'json parsed',
    };
  } catch {
    return {
      name,
      status: 'fail',
      summary: 'missing parseable JSON pass state',
    };
  }
}

export function summarizeValidatorResult(result) {
  if (result.code !== 0) {
    return {
      name: 'validator',
      status: 'fail',
      summary: `exit=${result.code}`,
    };
  }

  try {
    const json = extractJsonObject(result.stdout || result.stderr || '');
    if (typeof json.ok !== 'boolean') {
      return {
        name: 'validator',
        status: 'fail',
        summary: 'missing boolean ok field',
      };
    }
    const issueCount = Array.isArray(json.issues) ? json.issues.length : 0;
    return {
      name: 'validator',
      status: json.ok ? 'pass' : 'fail',
      summary: `ok=${json.ok} issues=${issueCount}`,
    };
  } catch {
    return {
      name: 'validator',
      status: 'fail',
      summary: 'missing parseable JSON ok state',
    };
  }
}

export function summarizeSkillsGraphResult(result) {
  if (result.code !== 0) {
    return {
      name: 'skills graph',
      status: 'fail',
      summary: `exit=${result.code}`,
    };
  }
  try {
    const json = extractJsonObject(result.stdout || result.stderr || '');
    const nodeCount = Number(json.node_count ?? json.graph?.node_count ?? 0);
    const edgeCount = Number(json.edge_count ?? json.graph?.edge_count ?? 0);
    const missingRefs = Array.isArray(json.missing_refs)
      ? json.missing_refs
      : Array.isArray(json.graph?.missing_refs) ? json.graph.missing_refs : [];
    if (nodeCount <= 0) {
      return { name: 'skills graph', status: 'fail', summary: 'node_count=0' };
    }
    if (missingRefs.length > 0) {
      return { name: 'skills graph', status: 'fail', summary: `missing_refs=${missingRefs.length}` };
    }
    return { name: 'skills graph', status: 'pass', summary: `nodes=${nodeCount} edges=${edgeCount} missing_refs=0` };
  } catch {
    return {
      name: 'skills graph',
      status: 'fail',
      summary: 'missing parseable JSON graph state',
    };
  }
}

export function summarizeDriftResult(result) {
  if (result.code !== 0) {
    return {
      name: 'drift detect',
      status: 'fail',
      summary: `exit=${result.code}`,
    };
  }
  try {
    const json = extractJsonObject(result.stdout || result.stderr || '');
    if (!Array.isArray(json.proposals)) {
      return { name: 'drift detect', status: 'fail', summary: 'missing proposals array' };
    }
    const signals = new Set(json.proposals.map(proposal => proposal?.signal_type).filter(Boolean));
    const hasExpectedSignals = signals.has('principle_violation') && signals.has('repeated_edit');
    if (json.proposals.length > 0 && !hasExpectedSignals) {
      return { name: 'drift detect', status: 'fail', summary: 'missing expected live drift signals' };
    }
    return {
      name: 'drift detect',
      status: json.proposals.length > 0 ? 'pass' : 'fail',
      summary: `proposals=${json.proposals.length}${signals.size > 0 ? ` signals=${Array.from(signals).sort().join(',')}` : ''}`,
    };
  } catch {
    return {
      name: 'drift detect',
      status: 'fail',
      summary: 'missing parseable JSON drift state',
    };
  }
}

export function validateJudgeReport(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Judge report must be a JSON object');
  }
  if (typeof value.passed !== 'boolean') {
    throw new Error('Judge report missing boolean passed');
  }
  if (typeof value.average !== 'number' || !Number.isFinite(value.average)) {
    throw new Error('Judge report missing numeric average');
  }
  if (!Array.isArray(value.scores) || value.scores.length === 0) {
    throw new Error('Judge report missing non-empty scores');
  }
  const seenDimensions = new Set();
  for (const [index, score] of value.scores.entries()) {
    if (!score || typeof score !== 'object' || Array.isArray(score)) {
      throw new Error(`Judge score ${index} must be an object`);
    }
    if (typeof score.dimension !== 'string' || score.dimension.trim().length === 0) {
      throw new Error(`Judge score ${index} missing dimension`);
    }
    const dimensionKey = normalizeJudgeDimension(score.dimension);
    if (!REQUIRED_JUDGE_DIMENSION_KEYS.has(dimensionKey)) {
      throw new Error(`Judge score ${index} has unsupported dimension: ${score.dimension}`);
    }
    if (seenDimensions.has(dimensionKey)) {
      throw new Error(`Judge report has duplicate dimension: ${score.dimension}`);
    }
    seenDimensions.add(dimensionKey);
    if (typeof score.score !== 'number' || !Number.isFinite(score.score)) {
      throw new Error(`Judge score ${index} missing numeric score`);
    }
    if (score.score < 1 || score.score > 5) {
      throw new Error(`Judge score ${index} must be between 1 and 5`);
    }
    if (typeof score.rationale !== 'string' || score.rationale.trim().length === 0) {
      throw new Error(`Judge score ${index} missing rationale`);
    }
  }
  const missingDimensions = REQUIRED_JUDGE_DIMENSIONS.filter(dimension => !seenDimensions.has(normalizeJudgeDimension(dimension)));
  if (missingDimensions.length > 0) {
    throw new Error(`Judge report missing required dimensions: ${missingDimensions.join(', ')}`);
  }
  if (!Array.isArray(value.critical_concerns)) {
    throw new Error('Judge report missing critical_concerns array');
  }
  if (typeof value.release_interpretation !== 'string' || value.release_interpretation.trim().length === 0) {
    throw new Error('Judge report missing release_interpretation');
  }
  const criticalDimensions = new Set(['autonomy boundaries', 'metacognition', 'runtime usability']);
  const lowCriticalScores = value.scores.filter(score => (
    criticalDimensions.has(score.dimension.trim().toLowerCase()) && score.score < 3
  ));
  const criticalConcerns = Array.isArray(value.critical_concerns) ? value.critical_concerns.filter(Boolean) : [];
  const computedAverage = value.scores.reduce((sum, score) => sum + score.score, 0) / value.scores.length;
  const normalizedAverage = Number(computedAverage.toFixed(2));
  const normalizedValue = { ...value, average: normalizedAverage };
  const deterministicPassed = normalizedAverage >= 4 && lowCriticalScores.length === 0 && criticalConcerns.length === 0;
  if (value.passed !== deterministicPassed) {
    return {
      ...normalizedValue,
      passed: deterministicPassed,
      release_interpretation: deterministicPassed
        ? normalizedValue.release_interpretation
        : `Judge pass overridden by deterministic score thresholds. ${normalizedValue.release_interpretation}`,
    };
  }
  return normalizedValue;
}

function normalizeJudgeDimension(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function selectReleaseInterpretation({ criticalFailures = [], judge = null }) {
  if (criticalFailures.length > 0) {
    return 'This run blocks release confidence because deterministic failures occurred.';
  }
  return judge?.release_interpretation ?? 'Deterministic checks passed; judge was disabled or unavailable.';
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
    if (typeof artifact === 'string') {
      lines.push(`- ${artifact}`);
      continue;
    }
    lines.push(`- ${artifact.path}`);
    if (artifact.bytes !== undefined || artifact.sha256) {
      lines.push(`  - bytes: ${artifact.bytes ?? 'unknown'}`);
      lines.push(`  - sha256: ${artifact.sha256 ?? 'unknown'}`);
    }
    if (artifact.excerpt) {
      lines.push('  - excerpt:');
      for (const line of redactSecrets(artifact.excerpt).split('\n')) {
        lines.push(`    ${line}`);
      }
    }
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
    lines.push(`- ${item.name}: ${item.status}${formatSummaryAndSource(item, ' - ')}`);
  }
  lines.push('');
  lines.push('## Verification Commands');
  lines.push('');
  if (report.verificationCommands?.length) {
    for (const command of report.verificationCommands) lines.push(`- \`${command}\``);
  } else {
    lines.push('- None for this run stage.');
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

export function renderDemoMarkdown(report) {
  const lines = [];
  lines.push('# TasteKit Full Taste Composition Demo');
  lines.push('');
  lines.push(`Run result: **${report.result}**`);
  lines.push(`Domain: ${report.metadata?.domain ?? 'unknown'}`);
  lines.push(`Depth: ${report.metadata?.depth ?? 'unknown'}`);
  lines.push('');
  lines.push('## What This Demonstrates');
  lines.push('');
  if (report.metadata?.provider_mode === 'mock-provider-smoke') {
    lines.push('- This deterministic mock-provider smoke exercises local harness wiring, compile/export/validate, managed-region safety, and downstream checks.');
    lines.push('- It is not live release evidence and does not replace the GPT-5.5 interviewer plus GLM-5.1 simulated-human run.');
  } else if (report.metadata?.provider_mode === 'subscription-live-demo') {
    lines.push('- This subscription-backed live demo exercises the real harness with live LLMs and local provider routing.');
    lines.push('- It is real-world product evidence, but official release evidence still requires the strict GPT-5.5 plus GLM-5.1 release sequence.');
  } else if (report.result === 'pass') {
    lines.push('- TasteKit completed an agent-native Full Taste Composition interview and turned it into durable runtime files.');
    lines.push('- The generated constitution kept rich composition and metacognitive state in structured extensions instead of leaking raw transcript into markdown.');
    lines.push('- Runtime artifacts were validated, exported, checked for managed-region safety, and exercised through trust, drift, skills, and eval workflows.');
  } else {
    lines.push('- This run is not valid release evidence yet. Use the follow-ups below before treating it as a demo.');
  }
  lines.push('');
  lines.push('## Interview Shape');
  lines.push('');
  for (const [key, value] of Object.entries(report.interviewShape ?? {})) {
    lines.push(`- ${key}: ${String(value)}`);
  }
  lines.push('');
  lines.push('## Extracted Taste');
  lines.push('');
  lines.push(report.tasteSummary || 'No taste summary was available for this run.');
  lines.push('');
  renderValueWalkthrough(lines, report.valueWalkthrough);
  lines.push('');
  lines.push('## Runtime Impact');
  lines.push('');
  const runtimeArtifacts = (report.artifacts ?? []).filter(artifact => {
    const path = typeof artifact === 'string' ? artifact : artifact.path;
    return /(?:CLAUDE|SOUL|AGENTS)\.md$/.test(path ?? '');
  });
  if (runtimeArtifacts.length === 0) {
    lines.push('- No runtime markdown artifacts were available.');
  } else {
    for (const artifact of runtimeArtifacts) {
      const path = typeof artifact === 'string' ? artifact : artifact.path;
      lines.push(`- ${path}`);
      if (typeof artifact === 'object' && artifact.sha256) lines.push(`  - sha256: ${artifact.sha256}`);
      if (typeof artifact === 'object' && artifact.excerpt) {
        lines.push('  - excerpt:');
        for (const line of redactSecrets(artifact.excerpt).split('\n').slice(0, 8)) lines.push(`    ${line}`);
      }
    }
  }
  lines.push('');
  lines.push('## Validation Evidence');
  lines.push('');
  for (const assertion of report.assertions ?? []) {
    lines.push(`- ${assertion.name}: ${assertion.status}${assertion.evidence ? ` (${assertion.evidence})` : ''}`);
  }
  for (const item of report.downstream ?? []) {
    lines.push(`- ${item.name}: ${item.status}${formatSummaryAndSource(item, 'paren')}`);
  }
  if ((report.assertions ?? []).length === 0 && (report.downstream ?? []).length === 0) {
    lines.push('- No deterministic validation evidence was available.');
  }
  lines.push('');
  lines.push('## Judge Read');
  lines.push('');
  if (report.judge) {
    lines.push(`- average: ${report.judge.average}`);
    lines.push(`- passed: ${report.judge.passed}`);
    for (const score of report.judge.scores ?? []) {
      lines.push(`- ${score.dimension}: ${score.score} - ${score.rationale}`);
    }
  } else {
    lines.push('- No qualitative judge report was available.');
  }
  lines.push('');
  lines.push('## Reproduction Commands');
  lines.push('');
  if (report.verificationCommands?.length) {
    for (const command of report.verificationCommands) lines.push(`- \`${command}\``);
  } else {
    lines.push('- No reproduction commands were recorded for this run stage.');
  }
  lines.push('');
  lines.push('## Follow-Ups');
  lines.push('');
  const followUps = demoFollowUps(report);
  if (followUps.length > 0) {
    for (const item of followUps) lines.push(`- ${item}`);
  } else {
    lines.push('- None.');
  }
  lines.push('');
  return lines.join('\n');
}

function formatSummaryAndSource(item, mode) {
  const parts = [
    item.summary,
    item.evidence_source ? `source: ${item.evidence_source}` : undefined,
  ].filter(Boolean);
  if (parts.length === 0) return '';
  if (mode === 'paren') return ` (${parts.join('; ')})`;
  return `${mode}${parts.join('; ')}`;
}

function renderValueWalkthrough(lines, walkthrough) {
  if (!walkthrough || typeof walkthrough !== 'object') return;

  lines.push('## TasteKit Value Walkthrough');
  lines.push('');
  if (walkthrough.canonical_profile) {
    lines.push(`- Canonical profile: \`${walkthrough.canonical_profile}\``);
  }

  const coverage = walkthrough.coverage;
  if (coverage && typeof coverage === 'object') {
    if (coverage.evidence_kind) {
      lines.push(`- Coverage evidence: ${coverage.evidence_kind}`);
    }
    const covered = coverage.covered_dimensions ?? 'unknown';
    const total = coverage.total_dimensions ?? 'unknown';
    lines.push(`- Coverage: ${covered}/${total} dimensions`);
    const byPriority = coverage.by_priority && typeof coverage.by_priority === 'object'
      ? coverage.by_priority
      : {};
    for (const [priority, item] of Object.entries(byPriority)) {
      if (!item || typeof item !== 'object') continue;
      lines.push(`  - ${priority}: ${item.covered ?? 0}/${item.total ?? 0} covered, ${item.confirmed ?? 0} confirmed, ${item.inferred ?? 0} inferred`);
    }
  }

  const metacognition = walkthrough.metacognition;
  if (metacognition && typeof metacognition === 'object') {
    if (Array.isArray(metacognition.policy_path) && metacognition.policy_path.length > 0) {
      lines.push(`- Policy path: ${metacognition.policy_path.join(' -> ')}`);
    }
    if (metacognition.accepted_draft_checkpoints !== undefined) {
      lines.push(`- Accepted draft checkpoints: ${metacognition.accepted_draft_checkpoints}`);
    }
    if (metacognition.fatigue_events !== undefined) {
      lines.push(`- Fatigue events handled: ${metacognition.fatigue_events}`);
    }
    if (metacognition.unresolved_assumptions !== undefined) {
      lines.push(`- Unresolved assumptions: ${metacognition.unresolved_assumptions}`);
    }
    if (metacognition.conflicts !== undefined) {
      lines.push(`- Conflicts remaining: ${metacognition.conflicts}`);
    }
  }

  if (Array.isArray(walkthrough.dimension_examples) && walkthrough.dimension_examples.length > 0) {
    lines.push('');
    lines.push('### Domain Mapping Examples');
    lines.push('');
    for (const item of walkthrough.dimension_examples) {
      if (!item || typeof item !== 'object') continue;
      const status = item.status ? `, ${item.status}` : '';
      const confidence = item.confidence !== undefined ? `, evidence weight ${item.confidence}` : '';
      lines.push(`- \`${item.id ?? 'unknown'}\`${status}${confidence}: ${item.summary ?? 'No summary.'}`);
    }
  }

  if (Array.isArray(walkthrough.runtime_guidance) && walkthrough.runtime_guidance.length > 0) {
    lines.push('');
    lines.push('### Runtime Guidance Produced');
    lines.push('');
    for (const item of walkthrough.runtime_guidance) lines.push(`- ${item}`);
  }

  if (Array.isArray(walkthrough.safety) && walkthrough.safety.length > 0) {
    lines.push('');
    lines.push('### Safety And Portability');
    lines.push('');
    for (const item of walkthrough.safety) lines.push(`- ${item}`);
  }
}

function demoFollowUps(report) {
  const followUps = Array.isArray(report.followUps) ? [...report.followUps] : [];
  if (report.metadata?.provider_mode === 'mock-provider-smoke') {
    const liveFollowUp = 'Run the live provider E2E with judge before using this as release evidence.';
    if (!followUps.some(item => item === liveFollowUp)) followUps.push(liveFollowUp);
  }
  return followUps;
}

export function writeReports(outputDir, report, { secrets = [] } = {}) {
  const safeReport = redactSecrets(report, secrets);
  writeFileSync(join(outputDir, 'report.json'), JSON.stringify(safeReport, null, 2), 'utf-8');
  writeFileSync(join(outputDir, 'report.md'), renderReportMarkdown(safeReport), 'utf-8');
  writeFileSync(join(outputDir, 'demo.md'), renderDemoMarkdown(safeReport), 'utf-8');
  const pointer = writeLatestRunPointer(outputDir, safeReport);
  if (pointer.status === 'failed') {
    safeReport.metadata = {
      ...(safeReport.metadata ?? {}),
      latest_run_pointer_status: 'failed',
      latest_run_pointer_error: pointer.error,
    };
    writeFileSync(join(outputDir, 'report.json'), JSON.stringify(safeReport, null, 2), 'utf-8');
    writeFileSync(join(outputDir, 'report.md'), renderReportMarkdown(safeReport), 'utf-8');
    writeFileSync(join(outputDir, 'demo.md'), renderDemoMarkdown(safeReport), 'utf-8');
  }
}

function writeLatestRunPointer(outputDir, report) {
  const parent = dirname(outputDir);
  const pointerPath = join(parent, 'latest-run.json');
  const tempPath = join(parent, `.latest-run.${process.pid}.${Date.now()}.tmp`);
  const payload = JSON.stringify({
    output_dir: outputDir,
    report_json: join(outputDir, 'report.json'),
    report_md: join(outputDir, 'report.md'),
    demo_md: join(outputDir, 'demo.md'),
    result: report.result,
    domain: report.metadata?.domain,
    depth: report.metadata?.depth,
    provider_mode: report.metadata?.provider_mode,
    updated_at: new Date().toISOString(),
  }, null, 2);

  try {
    writeFileSync(tempPath, payload, 'utf-8');
    renameSync(tempPath, pointerPath);
    return { status: 'written', path: pointerPath };
  } catch (error) {
    rmSync(tempPath, { force: true });
    return {
      status: 'failed',
      path: pointerPath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
