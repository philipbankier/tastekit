#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { findEnvFileArg, loadEnvFile } from './lib/live-e2e/env-file.mjs';
import {
  DEFAULT_JUDGE_PATH,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_PERSONA_PATH,
  DEFAULT_ZAI_BASE_URL,
  parseArgs,
  publicDepthLabel,
  resolveMaxTurns,
  resolveProviderKeys,
  usage,
} from './lib/live-e2e/options.mjs';
import { createChatClient, preflightChatClient, redactSecrets } from './lib/live-e2e/chat-client.mjs';
import { createEventWriter, readJsonl, summarizeTranscriptForJudge } from './lib/live-e2e/events.mjs';
import {
  fullCompositionCompletionGaps,
  shouldWarnMissingFatigueEvent,
} from './lib/live-e2e/interview-assertions.mjs';
import { createRunDirectory, writeCleanReplayTrace, writeEvalPack, writeSyntheticDriftTrace } from './lib/live-e2e/workspace.mjs';
import {
  classifyExitCode,
  selectReleaseInterpretation,
  summarizeCommandResult,
  summarizeDriftResult,
  summarizeSkillsGraphResult,
  summarizeValidatorResult,
  validateJudgeReport,
  writeReports,
} from './lib/live-e2e/report.mjs';
import {
  assertExtensionPresence,
  assertExpectedExportArtifacts,
  assertFile,
  assertManagedRegionFiles,
  assertRuntimeMarkdown,
  expectedExportArtifactPaths,
  readJson,
} from './lib/live-e2e/artifacts.mjs';
import { runTastekit, runValidator } from './lib/live-e2e/cli-runner.mjs';

async function main(argv) {
  let options;
  let envFileLoad = { path: undefined, loaded: [], skipped: [] };
  try {
    const envFile = findEnvFileArg(argv);
    if (envFile) envFileLoad = loadEnvFile(envFile);
    options = parseArgs(argv);
    options.envFileResolved = envFileLoad.path;
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
  const providerKeys = resolveProviderKeys(process.env, options);
  options.credentialStatus = describeCredentialStatus(providerKeys, envFileLoad);
  const secrets = [providerKeys.openaiKey, providerKeys.zaiKey].filter(Boolean);
  const events = createEventWriter(join(outputDir, 'transcript.jsonl'), { secrets });
  const failures = [];
  const assertions = [];

  const recordFailure = (severity, category, message, evidence = {}) => {
    const failure = {
      severity,
      category,
      message: redactSecrets(message, secrets),
      evidence: redactSecrets(evidence, secrets),
    };
    failures.push(failure);
    events.writeFailure(severity, category, failure.message, failure.evidence);
  };

  try {
    const { openaiKey, zaiKey, zaiSource } = providerKeys;
    const missingKeys = [];
    if (!openaiKey) missingKeys.push('OPENAI_API_KEY');
    if (!zaiKey) missingKeys.push('ZAI_API_KEY or Z_AI_API_KEY');
    if (missingKeys.length === 1) throw new Error(`${missingKeys[0]} is required`);
    if (missingKeys.length > 1) throw new Error('OPENAI_API_KEY and either ZAI_API_KEY or Z_AI_API_KEY are required');

    const interviewerClient = createChatClient({
      name: 'openai',
      apiKey: openaiKey,
      baseUrl: options.openaiBaseUrl,
      model: options.openaiModel,
      systemRole: options.openaiSystemRole,
    }, { eventWriter: events });
    const simulatedUserClient = createChatClient({
      name: 'zai',
      apiKey: zaiKey,
      baseUrl: options.zaiBaseUrl,
      model: options.zaiModel,
      thinking: options.zaiThinking,
    }, { eventWriter: events });

    await preflightChatClient(interviewerClient, events);
    await preflightChatClient(simulatedUserClient, events);

    assertions.push({
      name: 'provider-preflight',
      status: 'pass',
      severity: 'critical',
      evidence: `${options.openaiModel} and ${options.zaiModel} reachable`,
    });
    events.writeAssertion('provider-preflight', 'pass', 'critical', {
      openai_model: options.openaiModel,
      openai_endpoint: interviewerClient.url,
      zai_model: options.zaiModel,
      zai_key_source: zaiSource,
      zai_endpoint: simulatedUserClient.url,
    });

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
      writeReports(outputDir, report, { secrets });
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
      providerKeys,
      assertions,
      failures,
      recordFailure,
      startedAt,
      secrets,
    });

    const reportPath = join(outputDir, 'report.json');
    if (existsSync(reportPath)) {
      const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
      return classifyExitCode({
        failures: report.failures ?? failures,
        judgePassed: report.judge ? report.judge.passed === true : false,
        judgeAvailable: !!report.judge,
        judgeRequired: report.metadata?.provider_mode !== 'mock-provider-smoke',
      });
    }
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
    result: failures.some(failure => failure.severity === 'critical') ? 'fail' : 'pass-without-final-report',
  });
  writeReports(outputDir, report, { secrets });
  console.log(`Report written to ${join(outputDir, 'report.md')}`);
  return classifyExitCode({ failures, judgePassed: true, judgeAvailable: false, judgeRequired: false });
}

async function runLiveE2E(ctx) {
  const {
    options,
    outputDir,
    workspaceDir,
    events,
    interviewerClient,
    simulatedUserClient,
    providerKeys,
    assertions,
    failures,
    recordFailure,
    startedAt,
    secrets,
  } = ctx;

  ensureBuiltArtifacts();

  const [
    { Interviewer, createSession, saveSession },
    { getDomainRubric },
    { compile },
    { resolveSessionPath },
  ] = await Promise.all([
    import('@actrun_ai/tastekit-core/interview'),
    import('@actrun_ai/tastekit-core/domains'),
    import('@actrun_ai/tastekit-core/compiler'),
    import('@actrun_ai/tastekit-core/utils'),
  ]);

  const persona = readFileSync(options.persona, 'utf-8');
  writeFileSync(join(outputDir, 'persona-prompt.md'), persona, 'utf-8');

  const tastekitDir = join(workspaceDir, '.tastekit');
  mkdirSync(tastekitDir, { recursive: true });
  mkdirSync(join(tastekitDir, 'skills'), { recursive: true });
  mkdirSync(join(tastekitDir, 'traces'), { recursive: true });

  const config = {
    version: readRootVersion(),
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
  const safetyTurnCeiling = resolveMaxTurns(options.maxTurns, rubric.dimensions?.length ?? 0);
  options.maxTurnsResolved = safetyTurnCeiling;
  events.write('safety_ceiling', {
    max_turns: safetyTurnCeiling,
    configured_max_turns: options.maxTurns,
    dimension_count: rubric.dimensions?.length ?? 0,
  });

  const sessionPath = resolveSessionPath(tastekitDir);
  const session = createSession(options.depth);
  session.domain_id = options.domain;
  session.llm_provider = { name: interviewerClient.name, model: interviewerClient.model };

  const simulatedHistory = [
    { role: 'system', content: persona },
  ];

  let lastInterviewerMessage = '';
  const transcriptSamples = [];
  const getStateRef = { current: null };

  const interviewer = new Interviewer({
    llm: interviewerClient,
    rubric,
    depth: options.depth,
    onInterviewerMessage: async (message) => {
      lastInterviewerMessage = message;
      const state = getStateRef.current?.() ?? { turn_count: 0 };
      events.write('interviewer_message', {
        turn: state.turn_count,
        message,
        domain: options.domain,
        depth: publicDepthLabel(options.depth),
      });
      transcriptSamples.push(message);
      if (/dimension_updates|policy reason codes|coverage_summary|<!--\s*COVERAGE/i.test(message)) {
        recordFailure('critical', 'interview_ux', 'Interviewer exposed hidden machinery', { message });
      }
    },
    getUserInput: async () => {
      const currentState = getStateRef.current?.() ?? { turn_count: 0 };
      if (currentState.turn_count >= safetyTurnCeiling) {
        throw new Error(`Live interview exceeded safety ceiling (${safetyTurnCeiling} turns) before TasteKit completed`);
      }
      simulatedHistory.push({ role: 'user', content: lastInterviewerMessage });
      const response = await simulatedUserClient.complete(simulatedHistory, {
        maxTokens: 900,
        temperature: 0.85,
      });
      const answer = response.content.trim();
      simulatedHistory.push({ role: 'assistant', content: answer });
      transcriptSamples.push(answer);
      const state = getStateRef.current?.() ?? { turn_count: 0 };
      events.write('simulated_user_message', {
        turn: state.turn_count + 1,
        reply: answer,
        model: simulatedUserClient.model,
        usage: response.usage,
        warnings: response.warnings,
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
  getStateRef.current = () => interviewer.getState();

  const structuredAnswers = await interviewer.run();
  session.structured_answers = structuredAnswers;
  session.completed_steps = ['welcome', 'interview'];
  session.current_step = 'complete';
  session.interview = interviewer.getState();
  saveSession(sessionPath, session);

  const state = interviewer.getState();
  assertions.push({
    name: 'live-interview-complete',
    status: state.is_complete ? 'pass' : 'fail',
    severity: 'critical',
    evidence: `${state.turn_count} turns`,
  });
  events.writeAssertion('live-interview-complete', state.is_complete ? 'pass' : 'fail', 'critical', {
    turn_count: state.turn_count,
  });

  if (!state.is_complete) {
    recordFailure('critical', 'interview', 'Interview did not complete');
  }
  if (!state.metacognition?.confirmation_checkpoints?.some(checkpoint => checkpoint.type === 'draft' && checkpoint.accepted)) {
    recordFailure('critical', 'interview', 'Full Taste Composition ended without an accepted draft checkpoint');
  }
  if (options.depth === 'operator') {
    const gaps = fullCompositionCompletionGaps(state);
    if (gaps.incompleteDimensionIds.length > 0) {
      recordFailure('critical', 'interview', 'Full Taste Composition ended before all rubric dimensions were covered', {
        incomplete_dimension_ids: gaps.incompleteDimensionIds,
      });
    }
    if (gaps.finishNowDimensionIds.length > 0) {
      recordFailure('critical', 'interview', 'Full Taste Composition ended with user_finish_now assumptions', {
        finish_now_dimension_ids: gaps.finishNowDimensionIds,
      });
    }
  }
  if (shouldWarnMissingFatigueEvent(state, readJsonl(events.path))) {
    recordFailure('warning', 'interview', 'Transcript contained a fatigue signal but no fatigue event was recorded');
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
    compile,
    providerKeys,
    secrets,
  });
}

async function runArtifactLifecycle(ctx) {
  const {
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
    compile,
    providerKeys,
    secrets,
  } = ctx;

  const generatorVersion = readRootVersion();
  const compileResult = await compile({
    workspacePath: tastekitDir,
    session,
    generatorVersion,
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
  const validatorSummary = summarizeValidatorResult(validatorResult);
  events.write('artifact', {
    kind: 'validator',
    code: validatorResult.code,
    stdout: validatorResult.stdout,
    stderr: validatorResult.stderr,
  });
  assertions.push({
    name: 'validator',
    status: validatorSummary.status,
    severity: 'critical',
    evidence: validatorSummary.summary,
  });
  events.writeAssertion('validator', validatorSummary.status, 'critical', { summary: validatorSummary.summary });
  if (validatorSummary.status !== 'pass') {
    recordFailure('critical', 'validator', 'tastekit-validator failed closed', {
      stdout: validatorResult.stdout,
      stderr: validatorResult.stderr,
      summary: validatorSummary.summary,
    });
  }

  const exportRoot = join(outputDir, 'exports');
  const targets = [
    ['claude-code', workspaceDir],
    ['claude-code', join(exportRoot, 'claude-code')],
    ['openclaw', join(exportRoot, 'openclaw')],
    ['manus', join(exportRoot, 'manus')],
    ['agents-md', join(exportRoot, 'agents-md')],
    ['agent-file', join(exportRoot, 'agent-file')],
  ];
  for (const [target, outDir] of targets) {
    const result = await runTastekit(['export', '--target', target, '--out', outDir], { cwd: workspaceDir });
    events.write('artifact', { kind: 'export', target, outDir, code: result.code, stdout: result.stdout, stderr: result.stderr });
    if (result.code !== 0) {
      recordFailure('critical', 'export', `Export failed for ${target}`, { stdout: result.stdout, stderr: result.stderr, outDir });
    }
  }
  try {
    const exportArtifacts = assertExpectedExportArtifacts(exportRoot);
    assertions.push({
      name: 'export-artifacts-present',
      status: 'pass',
      severity: 'critical',
      evidence: `${exportArtifacts.length} files`,
    });
    events.writeAssertion('export-artifacts-present', 'pass', 'critical', { exportArtifacts });
  } catch (error) {
    recordFailure('critical', 'export', error instanceof Error ? error.message : String(error));
  }

  assertFile(join(workspaceDir, 'CLAUDE.md'));
  assertFile(join(workspaceDir, 'SOUL.md'));
  assertFile(join(workspaceDir, 'AGENTS.md'));
  const markdownResults = assertRuntimeMarkdown(workspaceDir, transcriptSamples);
  assertions.push({ name: 'runtime-markdown-safe', status: 'pass', severity: 'critical', evidence: `${markdownResults.length} files` });
  events.writeAssertion('runtime-markdown-safe', 'pass', 'critical', { markdownResults });

  await assertManagedRegionRerun({ workspaceDir, tastekitDir, session, assertions, events, recordFailure, compile, generatorVersion });

  const importRoundtripDir = join(outputDir, 'import-roundtrip');
  mkdirSync(importRoundtripDir, { recursive: true });
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
    failures,
    events,
    recordFailure,
    startedAt,
    providerKeys,
    secrets,
  });
}

async function assertManagedRegionRerun({ workspaceDir, tastekitDir, session, assertions, events, recordFailure, compile, generatorVersion }) {
  const soulPath = join(workspaceDir, 'SOUL.md');
  const agentsPath = join(workspaceDir, 'AGENTS.md');
  const claudePath = join(workspaceDir, 'CLAUDE.md');
  const manualSoul = '# Manual Soul\n\nKeep this hand-written SOUL section.\n\n';
  const manualAgents = '# Manual Agents\n\nKeep this hand-written AGENTS section.\n\n';
  const manualClaude = '# Manual Claude\n\nKeep this hand-written CLAUDE section.\n\n';
  writeFileSync(soulPath, manualSoul + readFileSync(soulPath, 'utf-8'), 'utf-8');
  writeFileSync(agentsPath, manualAgents + readFileSync(agentsPath, 'utf-8'), 'utf-8');
  writeFileSync(claudePath, manualClaude + readFileSync(claudePath, 'utf-8'), 'utf-8');

  const rerun = await compile({
    workspacePath: tastekitDir,
    session,
    generatorVersion,
    resume: false,
  });
  events.write('artifact', { kind: 'compile-rerun', result: rerun });
  if (!rerun.success) {
    recordFailure('critical', 'compile', 'compile rerun failed during managed-region check', { errors: rerun.errors });
    return;
  }

  const claudeExport = await runTastekit(['export', '--target', 'claude-code', '--out', workspaceDir], { cwd: workspaceDir });
  events.write('artifact', { kind: 'claude-export-rerun', code: claudeExport.code, stdout: claudeExport.stdout, stderr: claudeExport.stderr });
  if (claudeExport.code !== 0) {
    recordFailure('critical', 'export', 'Claude Code export rerun failed during managed-region check', {
      stdout: claudeExport.stdout,
      stderr: claudeExport.stderr,
    });
  }

  const soul = readFileSync(soulPath, 'utf-8');
  const agents = readFileSync(agentsPath, 'utf-8');
  const claude = readFileSync(claudePath, 'utf-8');
  try {
    const managedRegionResults = assertManagedRegionFiles([soulPath, agentsPath, claudePath]);
    assertions.push({
      name: 'managed-region-rerun-balanced',
      status: 'pass',
      severity: 'critical',
      evidence: 'CLAUDE.md, SOUL.md, and AGENTS.md each have one TasteKit managed region after rerun',
    });
    events.writeAssertion('managed-region-rerun-balanced', 'pass', 'critical', { managedRegionResults });
  } catch (error) {
    recordFailure('critical', 'managed_region', error instanceof Error ? error.message : String(error));
  }
  const preservedManualContent = soul.includes('Keep this hand-written SOUL section.')
    && agents.includes('Keep this hand-written AGENTS section.')
    && claude.includes('Keep this hand-written CLAUDE section.');
  if (!soul.includes('Keep this hand-written SOUL section.')) {
    recordFailure('critical', 'managed_region', 'SOUL.md manual content was not preserved');
  }
  if (!agents.includes('Keep this hand-written AGENTS section.')) {
    recordFailure('critical', 'managed_region', 'AGENTS.md manual content was not preserved');
  }
  if (!claude.includes('Keep this hand-written CLAUDE section.')) {
    recordFailure('critical', 'managed_region', 'CLAUDE.md manual content was not preserved');
  }
  if (preservedManualContent) {
    assertions.push({
      name: 'managed-region-manual-content-preserved',
      status: 'pass',
      severity: 'critical',
      evidence: 'Manual sections outside TasteKit regions were preserved in CLAUDE.md, SOUL.md, and AGENTS.md',
    });
    events.writeAssertion('managed-region-manual-content-preserved', 'pass', 'critical', {
      files: [claudePath, soulPath, agentsPath],
    });
  }
}

async function runDownstreamChecks(ctx) {
  const {
    options,
    outputDir,
    workspaceDir,
    tastekitDir,
    constitution,
    assertions,
    failures,
    events,
    recordFailure,
    startedAt,
    providerKeys,
    secrets,
  } = ctx;

  const downstream = [];

  const skillsGraph = await runTastekit(['--json', 'skills', 'graph'], { cwd: workspaceDir });
  const skillsGraphSummary = summarizeSkillsGraphResult(skillsGraph);
  skillsGraphSummary.evidence_source = 'generated workspace skill graph';
  downstream.push(skillsGraphSummary);
  events.write('artifact', { kind: 'skills-graph', code: skillsGraph.code, stdout: skillsGraph.stdout, stderr: skillsGraph.stderr });
  if (skillsGraphSummary.status !== 'pass') recordFailure('critical', 'skills', 'skills graph failed', { stdout: skillsGraph.stdout, stderr: skillsGraph.stderr, summary: skillsGraphSummary.summary });

  const trustInit = await runTastekit(['trust', 'init'], { cwd: workspaceDir });
  events.write('artifact', { kind: 'trust-init', code: trustInit.code, stdout: trustInit.stdout, stderr: trustInit.stderr });
  if (trustInit.code !== 0) recordFailure('critical', 'trust', 'trust init failed', { stdout: trustInit.stdout, stderr: trustInit.stderr });
  const trustAudit = await runTastekit(['--json', 'trust', 'audit'], { cwd: workspaceDir });
  const trustSummary = summarizeCommandResult('trust audit', trustAudit);
  trustSummary.evidence_source = 'generated workspace trust policy';
  downstream.push(trustSummary);
  events.write('artifact', { kind: 'trust-audit', code: trustAudit.code, stdout: trustAudit.stdout, stderr: trustAudit.stderr });
  if (trustSummary.status !== 'pass') recordFailure('critical', 'trust', 'trust audit failed', { stdout: trustAudit.stdout, stderr: trustAudit.stderr });

  const tracePath = writeSyntheticDriftTrace(tastekitDir);
  const drift = await runTastekit(['--json', 'drift', 'detect'], { cwd: workspaceDir });
  const driftSummary = summarizeDriftResult(drift);
  driftSummary.evidence_source = 'synthetic drift trace fixture';
  downstream.push(driftSummary);
  events.write('artifact', { kind: 'drift-detect', tracePath, code: drift.code, stdout: drift.stdout, stderr: drift.stderr });
  if (driftSummary.status !== 'pass') recordFailure('critical', 'drift', 'drift detect failed', { stdout: drift.stdout, stderr: drift.stderr, summary: driftSummary.summary });

  const evalPackPath = writeEvalPack(tastekitDir, buildProfileEvidence(workspaceDir, constitution));
  const evalRun = await runTastekit(['eval', 'run', '--pack', evalPackPath, '--format', 'json'], { cwd: workspaceDir });
  const evalRunSummary = summarizeCommandResult('eval run', evalRun);
  evalRunSummary.evidence_source = 'generated profile eval pack';
  downstream.push(evalRunSummary);
  events.write('artifact', { kind: 'eval-run', evalPackPath, code: evalRun.code, stdout: evalRun.stdout, stderr: evalRun.stderr });
  if (evalRunSummary.status !== 'pass') recordFailure('critical', 'eval', 'eval run failed', { stdout: evalRun.stdout, stderr: evalRun.stderr });

  const cleanReplayTracePath = writeCleanReplayTrace(tastekitDir);
  const evalReplay = await runTastekit(['--json', 'eval', 'replay', '--trace', cleanReplayTracePath], { cwd: workspaceDir });
  const evalReplaySummary = summarizeCommandResult('eval replay', evalReplay);
  evalReplaySummary.evidence_source = 'clean replay trace fixture';
  downstream.push(evalReplaySummary);
  events.write('artifact', { kind: 'eval-replay', tracePath: cleanReplayTracePath, code: evalReplay.code, stdout: evalReplay.stdout, stderr: evalReplay.stderr });
  if (evalReplaySummary.status !== 'pass') recordFailure('critical', 'eval', 'eval replay failed', { stdout: evalReplay.stdout, stderr: evalReplay.stderr });

  let judge = null;
  if (!options.noJudge) {
    try {
      judge = await runJudge({ options, outputDir, workspaceDir, constitution, assertions, failures, downstream, events, providerKeys });
      if (judge.passed !== true) {
        recordFailure('warning', 'judge', 'GPT-5.5 judge did not pass the run', { judge });
      }
    } catch (error) {
      recordFailure('critical', 'judge', error instanceof Error ? error.message : String(error));
    }
  }

  const state = readJson(join(tastekitDir, 'session.json')).interview;
  const report = buildFinalReport({
    options,
    outputDir,
    workspaceDir,
    tastekitDir,
    state,
    constitution,
    assertions,
    failures,
    downstream,
    judge,
    startedAt,
    secrets,
  });
  writeReports(outputDir, report, { secrets });
}

function buildProfileEvidence(workspaceDir, constitution) {
  const runtimeEvidence = ['CLAUDE.md', 'SOUL.md', 'AGENTS.md']
    .map(name => join(workspaceDir, name))
    .filter(path => existsSync(path))
    .map(path => readFileSync(path, 'utf-8'))
    .join('\n\n');

  const extensionEvidence = JSON.stringify({
    principles: constitution.principles,
    guardrails: constitution.guardrails,
    composition: constitution.extensions?.['x-tastekit-composition'],
    metacognition: constitution.extensions?.['x-tastekit-metacognition'],
  }, null, 2);

  return `${runtimeEvidence}\n\n${extensionEvidence}`.slice(0, 60000);
}

async function runJudge({ options, outputDir, workspaceDir, constitution, assertions, failures, downstream, events, providerKeys }) {
  const judgePrompt = readFileSync(options.judge, 'utf-8');
  const persona = readFileSync(options.persona, 'utf-8');
  const session = readFileSync(join(workspaceDir, '.tastekit', 'session.json'), 'utf-8');
  const transcriptExcerpt = summarizeTranscriptForJudge(events.path, { maxChars: 24000, maxEvents: 90 });
  const runtimeFiles = ['CLAUDE.md', 'SOUL.md', 'AGENTS.md']
    .map(name => ({ name, path: join(workspaceDir, name) }))
    .filter(file => existsSync(file.path))
    .map(file => `## ${file.name}\n\n${readFileSync(file.path, 'utf-8').slice(0, 12000)}`)
    .join('\n\n');

  const judgeClient = createChatClient({
    name: 'openai-judge',
    apiKey: providerKeys?.openaiKey ?? process.env.OPENAI_API_KEY,
    baseUrl: options.openaiBaseUrl,
    model: options.openaiModel,
    systemRole: options.openaiSystemRole,
  }, { eventWriter: events });

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
        '# Transcript Excerpts',
        transcriptExcerpt || 'No transcript events were available.',
        '# Downstream Checks',
        JSON.stringify(downstream, null, 2),
        '# Deterministic Assertions',
        JSON.stringify(assertions, null, 2),
        '# Failures',
        JSON.stringify(failures, null, 2),
        '# Transcript Event Log Path',
        events.path,
      ].join('\n\n'),
    },
  ], { temperature: 0.2, maxTokens: 1800 });

  writeFileSync(join(outputDir, 'judge-report.raw.txt'), response.content, 'utf-8');
  const json = validateJudgeReport(parseJsonObject(response.content));
  writeFileSync(join(outputDir, 'judge-report.json'), JSON.stringify(json, null, 2), 'utf-8');
  events.write('judge_score', json);
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

function buildFinalReport({ options, outputDir, workspaceDir, tastekitDir, state, constitution, assertions, failures, downstream, judge, startedAt, secrets = [] }) {
  const metacognition = constitution.extensions?.['x-tastekit-metacognition'];
  const composition = constitution.extensions?.['x-tastekit-composition'];
  const scoreList = judge?.scores ?? [];
  const judgePassed = judge ? judge.passed === true : false;
  const criticalFailures = failures.filter(failure => failure.severity === 'critical');
  const currentProviderMode = providerMode(options);
  const missingRequiredLiveJudge = currentProviderMode !== 'mock-provider-smoke' && options.noJudge && !judge;

  return {
    result: criticalFailures.length > 0
      ? 'fail'
      : missingRequiredLiveJudge
        ? 'deterministic-pass-without-judge'
        : judge && !judgePassed
          ? 'judge-fail'
          : 'pass',
    metadata: {
      output_dir: outputDir,
      workspace_dir: workspaceDir,
      domain: options.domain,
      depth: publicDepthLabel(options.depth),
      internal_depth: options.depth,
      openai_model: options.openaiModel,
      zai_model: options.zaiModel,
      persona_path: options.persona,
      persona_sha256: sha256File(options.persona),
      judge_rubric_path: options.judge,
      judge_rubric_sha256: sha256File(options.judge),
      canonical_persona_sha256: sha256File(DEFAULT_PERSONA_PATH),
      canonical_judge_rubric_sha256: sha256File(DEFAULT_JUDGE_PATH),
      provider_mode: currentProviderMode,
      ...releaseCheckoutMetadata(),
      ...credentialMetadata(options),
      max_turns: options.maxTurnsResolved ?? options.maxTurns,
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
    valueWalkthrough: buildValueWalkthrough({ options, composition, metacognition, constitution }),
    assertions,
    failures,
    artifacts: buildArtifactInventory([
      join(tastekitDir, 'session.json'),
      join(tastekitDir, 'constitution.v1.json'),
      join(tastekitDir, 'evals/live-e2e-evalpack.json'),
      join(tastekitDir, 'traces/live-e2e-drift.trace.v1.jsonl'),
      join(tastekitDir, 'traces/live-e2e-clean-replay.trace.v1.jsonl'),
      join(workspaceDir, 'CLAUDE.md'),
      join(workspaceDir, 'SOUL.md'),
      join(workspaceDir, 'AGENTS.md'),
      ...expectedExportArtifactPaths(join(outputDir, 'exports')),
      join(outputDir, 'exports'),
    ], secrets),
    downstream,
    judge,
    verificationCommands: [
      options.mockProviderSmoke
        ? 'pnpm test:live-e2e:mock'
        : currentProviderMode === 'subscription-live-demo'
          ? 'pnpm test:live-e2e:subscription-demo'
          : 'pnpm test:live-e2e',
      'npx @actrun_ai/tastekit-validator .tastekit/constitution.v1.json --json',
      'tastekit export --target claude-code --out .',
      'tastekit export --target openclaw --out exports/openclaw',
      'tastekit export --target manus --out exports/manus',
      'tastekit skills graph --json',
      'tastekit trust audit --json',
      'tastekit drift detect --json',
      'tastekit eval run --pack .tastekit/evals/live-e2e-evalpack.json --format json',
      'tastekit eval replay --trace .tastekit/traces/live-e2e-clean-replay.trace.v1.jsonl --json',
    ],
    releaseInterpretation: releaseInterpretation({ providerMode: currentProviderMode, criticalFailures, judge }),
    followUps: [
      ...(currentProviderMode === 'mock-provider-smoke' ? ['Run the live provider E2E with judge before using this as release evidence.'] : []),
      ...(currentProviderMode === 'subscription-live-demo' ? ['Subscription-backed live demos are real-world evidence, but not official release evidence. Run `pnpm test:live-e2e:release` with official provider keys before publishing.'] : []),
      ...failures.map(failure => `${failure.category}: ${failure.message}`),
      ...(missingRequiredLiveJudge ? ['Live release evidence requires the GPT-5.5 judge; rerun without --no-judge.'] : []),
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

function buildValueWalkthrough({ options, composition, metacognition, constitution }) {
  const policyDecisions = Array.isArray(metacognition?.policy_decisions) ? metacognition.policy_decisions : [];
  const confirmationCheckpoints = Array.isArray(metacognition?.confirmation_checkpoints)
    ? metacognition.confirmation_checkpoints
    : [];
  const acceptedDraftCheckpoints = confirmationCheckpoints.filter(checkpoint => (
    checkpoint?.type === 'draft' && checkpoint.accepted === true
  )).length;
  const dimensions = composition?.dimensions && typeof composition.dimensions === 'object'
    ? Object.values(composition.dimensions)
    : [];

  return {
    canonical_profile: '.tastekit/constitution.v1.json',
    coverage: {
      evidence_kind: options.mockProviderSmoke ? 'scripted coverage fixture' : 'live extraction',
      total_dimensions: metacognition?.coverage_summary?.total_dimensions ?? dimensions.length,
      covered_dimensions: metacognition?.coverage_summary?.covered_dimensions
        ?? dimensions.filter(dimension => dimension?.status === 'covered' || dimension?.status === 'inferred').length,
      by_priority: buildPriorityCoverage(metacognition?.coverage_summary),
    },
    metacognition: {
      policy_path: policyDecisions.map(decision => decision?.action).filter(Boolean),
      accepted_draft_checkpoints: acceptedDraftCheckpoints,
      fatigue_events: Array.isArray(metacognition?.fatigue_events) ? metacognition.fatigue_events.length : 0,
      unresolved_assumptions: Array.isArray(metacognition?.unresolved_assumptions) ? metacognition.unresolved_assumptions.length : 0,
      conflicts: Array.isArray(metacognition?.conflicts) ? metacognition.conflicts.length : 0,
    },
    dimension_examples: dimensions
      .filter(dimension => dimension?.summary)
      .slice(0, 8)
      .map(dimension => ({
        id: dimension.dimension_id,
        status: dimension.status,
        confidence: typeof dimension.confidence === 'number' ? Number(dimension.confidence.toFixed(2)) : undefined,
        summary: dimension.summary,
      })),
    runtime_guidance: buildRuntimeGuidance(constitution),
    safety: [
      'Canonical detail remains in constitution extensions; runtime markdown receives concise operating guidance.',
      'Runtime markdown is checked for transcript and hidden-coverage leaks before the run can pass.',
      'Reruns preserve manual content outside TasteKit managed regions in CLAUDE.md, SOUL.md, and AGENTS.md.',
      options.mockProviderSmoke
        ? 'Mock coverage is labeled as a scripted fixture and is not treated as live release evidence.'
        : 'Live extraction evidence is separated from deterministic validation and qualitative judge evidence.',
    ],
  };
}

function buildPriorityCoverage(coverageSummary) {
  const byPriority = {};
  for (const priority of ['critical', 'important', 'nice_to_have', 'inferable']) {
    const item = coverageSummary?.[priority];
    if (!item || typeof item !== 'object') continue;
    byPriority[priority] = {
      total: item.total ?? 0,
      covered: item.covered ?? 0,
      confirmed: item.confirmed ?? 0,
      inferred: item.inferred ?? 0,
    };
  }
  return byPriority;
}

function buildRuntimeGuidance(constitution) {
  const guidance = [];
  for (const principle of constitution.principles ?? []) {
    if (principle?.statement) guidance.push(principle.statement);
    if (guidance.length >= 3) break;
  }
  for (const guardrail of constitution.guardrails ?? []) {
    if (guardrail?.rule) guidance.push(guardrail.rule);
    if (guidance.length >= 5) break;
  }
  return guidance;
}

function buildMinimalReport({ options, outputDir, workspaceDir, startedAt, failures, assertions, result }) {
  const reportAssertions = assertions.length > 0 ? assertions : credentialPreflightAssertions(failures);
  const verificationCommands = credentialFailure(failures) ? ['pnpm test:live-e2e:preflight'] : [];
  return {
    result,
    metadata: {
      output_dir: outputDir,
      workspace_dir: workspaceDir,
      domain: options.domain,
      depth: publicDepthLabel(options.depth),
      internal_depth: options.depth,
      openai_model: options.openaiModel,
      zai_model: options.zaiModel,
      persona_path: options.persona,
      persona_sha256: sha256File(options.persona),
      judge_rubric_path: options.judge,
      judge_rubric_sha256: sha256File(options.judge),
      canonical_persona_sha256: sha256File(DEFAULT_PERSONA_PATH),
      canonical_judge_rubric_sha256: sha256File(DEFAULT_JUDGE_PATH),
      provider_mode: providerMode(options),
      ...releaseCheckoutMetadata(),
      ...credentialMetadata(options),
      max_turns: options.maxTurnsResolved ?? options.maxTurns,
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
    },
    interviewShape: {
      turn_count: 0,
      stop_reason: result,
    },
    tasteSummary: '',
    assertions: reportAssertions,
    failures,
    artifacts: [],
    downstream: [],
    judge: null,
    verificationCommands,
    releaseInterpretation: failures.length > 0
      ? 'This run does not increase release confidence because deterministic failures occurred.'
      : options.mockProviderSmoke
        ? 'Mock-provider preflight succeeded; run the full mock smoke for local integration evidence, then the live harness for release evidence.'
        : providerMode(options) === 'subscription-live-demo'
          ? 'Subscription-backed provider preflight succeeded. Run the full subscription demo for real-world evidence; official release evidence still requires `pnpm test:live-e2e:release`.'
          : 'Provider preflight succeeded. Run the full harness for release evidence.',
    followUps: [
      ...failures.map(failure => `${failure.category}: ${failure.message}`),
      ...credentialRecoveryFollowUps(failures),
    ],
  };
}

function releaseCheckoutMetadata() {
  return {
    package_version: JSON.parse(readFileSync('package.json', 'utf-8')).version,
    git_commit: runGit(['rev-parse', 'HEAD']),
    git_dirty: runGit(['status', '--porcelain']).trim().length > 0,
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
    hash.update(runGit(args));
    hash.update('\0');
  }
  const untracked = runGit(['ls-files', '--others', '--exclude-standard', '-z'])
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

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function runGit(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf-8', maxBuffer: 128 * 1024 * 1024 }).trim();
  } catch (error) {
    const code = error && typeof error === 'object' && 'status' in error ? error.status : 'unknown';
    return `__git_error_${code}__`;
  }
}

function credentialPreflightAssertions(failures) {
  const failure = credentialFailure(failures);
  if (!failure) return [];
  return [{
    name: 'credential-preflight',
    status: 'fail',
    severity: 'critical',
    evidence: credentialFailureEvidence(failure.message),
  }];
}

function credentialFailure(failures) {
  return failures.find(failure => (
    failure.category === 'harness'
    && /OPENAI_API_KEY|ZAI_API_KEY|Z_AI_API_KEY/.test(failure.message)
  ));
}

function credentialFailureEvidence(message) {
  if (/OPENAI_API_KEY and either ZAI_API_KEY or Z_AI_API_KEY/.test(message)) {
    return 'OPENAI_API_KEY and ZAI_API_KEY or Z_AI_API_KEY missing';
  }
  if (/OPENAI_API_KEY/.test(message)) return 'OPENAI_API_KEY missing';
  if (/ZAI_API_KEY|Z_AI_API_KEY/.test(message)) return 'ZAI_API_KEY or Z_AI_API_KEY missing';
  return 'provider credentials missing';
}

function describeCredentialStatus(providerKeys, envFileLoad) {
  return {
    env_file: envFileLoad?.path ?? 'none',
    env_file_loaded_keys: safeCredentialKeys(envFileLoad?.loaded).join(',') || 'none',
    env_file_skipped_keys: safeCredentialKeys(envFileLoad?.skipped).join(',') || 'none',
    openai_key: providerKeys.openaiKey ? 'present' : 'missing',
    openai_key_source: providerKeys.openaiSource ?? 'none',
    zai_key: providerKeys.zaiKey ? 'present' : 'missing',
    zai_key_source: providerKeys.zaiSource ?? 'none',
  };
}

function credentialMetadata(options) {
  const status = options.credentialStatus ?? {};
  return {
    credential_env_file: status.env_file ?? 'none',
    credential_env_file_loaded_keys: status.env_file_loaded_keys ?? 'none',
    credential_env_file_skipped_keys: status.env_file_skipped_keys ?? 'none',
    credential_openai_key: status.openai_key ?? 'unknown',
    credential_openai_key_source: status.openai_key_source ?? 'none',
    credential_zai_key: status.zai_key ?? 'unknown',
    credential_zai_key_source: status.zai_key_source ?? 'none',
  };
}

function safeCredentialKeys(keys = []) {
  const allowed = new Set([
    'OPENAI_API_KEY',
    'OPENAI_API_KEY_FILE',
    'ZAI_API_KEY',
    'ZAI_API_KEY_FILE',
    'Z_AI_API_KEY',
    'Z_AI_API_KEY_FILE',
    'OPENAI_BASE_URL',
    'OPENAI_MODEL',
    'ZAI_BASE_URL',
    'ZAI_MODEL',
    'ZAI_THINKING',
  ]);
  return keys.filter(key => allowed.has(key)).sort();
}

function providerMode(options) {
  if (options.mockProviderSmoke) return 'mock-provider-smoke';
  const releaseProvider =
    options.openaiBaseUrl === DEFAULT_OPENAI_BASE_URL
    && options.openaiModel === 'gpt-5.5'
    && options.zaiBaseUrl === DEFAULT_ZAI_BASE_URL
    && options.zaiModel === 'glm-5.1'
    && options.zaiThinking === 'disabled';
  return releaseProvider ? 'live' : 'subscription-live-demo';
}

function releaseInterpretation({ providerMode, criticalFailures, judge }) {
  if (providerMode === 'mock-provider-smoke') {
    return 'Deterministic mock-provider smoke passed; this is local integration evidence, not live release evidence.';
  }
  if (providerMode === 'subscription-live-demo') {
    if (criticalFailures.length > 0) return selectReleaseInterpretation({ criticalFailures, judge });
    if (judge && judge.passed === true) {
      return 'Subscription-backed live demo passed with qualitative judge evidence. This is real-world harness evidence, but official release evidence still requires the strict GPT-5.5 + GLM-5.1 release sequence.';
    }
    return 'Subscription-backed live demo completed deterministic checks, but official release evidence still requires the strict GPT-5.5 + GLM-5.1 release sequence.';
  }
  return selectReleaseInterpretation({ criticalFailures, judge });
}

function credentialRecoveryFollowUps(failures) {
  const hasCredentialFailure = failures.some(failure => (
    failure.category === 'harness'
    && /OPENAI_API_KEY|ZAI_API_KEY|Z_AI_API_KEY/.test(failure.message)
  ));
  if (!hasCredentialFailure) return [];
  return [
    'Run `cp docs/validation/live/tastekit-live.env.example docs/validation/live/tastekit-live.env`.',
    'Fill OPENAI_API_KEY and ZAI_API_KEY in docs/validation/live/tastekit-live.env; use Z_AI_API_KEY instead of ZAI_API_KEY only for legacy Z.ai setups.',
    'Re-run `pnpm test:live-e2e:preflight`, then `pnpm test:live-e2e` once preflight passes.',
  ];
}

function buildArtifactInventory(paths, secrets = []) {
  return paths.map(path => {
    const item = { path, exists: existsSync(path) };
    if (!item.exists) return item;
    const stats = statSync(path);
    item.kind = stats.isDirectory() ? 'directory' : 'file';
    if (stats.isFile()) {
      const content = readFileSync(path);
      item.bytes = stats.size;
      item.sha256 = createHash('sha256').update(content).digest('hex');
      const excerpt = safeArtifactExcerpt(path, content.toString('utf-8'), secrets);
      if (excerpt) item.excerpt = excerpt;
    }
    return item;
  });
}

function safeArtifactExcerpt(path, content, secrets = []) {
  if (!/\.(md|txt)$/i.test(path)) return '';
  return redactSecrets(content, secrets)
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .slice(0, 12)
    .join('\n')
    .slice(0, 1200);
}

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

function readRootVersion() {
  try {
    return JSON.parse(readFileSync('package.json', 'utf-8')).version ?? '0.2.0';
  } catch {
    return '0.2.0';
  }
}

function ensureBuiltArtifacts() {
  const required = [
    'packages/cli/dist/cli.js',
    'packages/validator/dist/cli.js',
    'packages/core/dist/interview/index.js',
  ];
  const missing = required.filter(path => !existsSync(path));
  if (missing.length > 0) {
    throw new Error(`Built packages are missing (${missing.join(', ')}). Run pnpm -r build before the full live E2E.`);
  }
}

main(process.argv.slice(2)).then(code => {
  process.exitCode = code;
});
