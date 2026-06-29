#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDomainRubric } from '@kairox_ai/tastekit-core/domains';
import { getDimensionsForDepth } from '@kairox_ai/tastekit-core/interview';
import { runCommand } from './lib/live-e2e/cli-runner.mjs';

async function main(argv) {
  const outputDir = outputArg(argv) ?? mkdtempSync(join(tmpdir(), 'tastekit-live-mock-smoke-'));
  const serverState = createServerState();
  const server = createMockChatServer(serverState);

  await listen(server);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : undefined;
  if (!port) throw new Error('Mock provider server did not bind to a port');

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    const result = await runCommand(process.execPath, [
      'scripts/validation/live-full-composition-e2e.mjs',
      '--domain', 'general-agent',
      '--depth', 'full-taste-composition',
      '--output', outputDir,
      '--openai-base-url', `${baseUrl}/openai`,
      '--zai-base-url', `${baseUrl}/zai`,
      '--openai-model', 'mock-gpt-5.5',
      '--zai-model', 'mock-glm-5.1',
      '--zai-thinking', 'disabled',
      '--no-judge',
      '--mock-provider-smoke',
    ], {
      timeoutMs: 180000,
      env: {
        OPENAI_API_KEY: 'mock-openai-key',
        ZAI_API_KEY: 'mock-zai-key',
        OPENAI_MODEL: '',
        ZAI_MODEL: '',
      },
    });

    if (result.code !== 0) {
      process.stderr.write(result.stdout);
      process.stderr.write(result.stderr);
      throw new Error(`Mock-provider smoke harness failed with exit code ${result.code}`);
    }

    const reportPath = join(outputDir, 'report.json');
    if (!existsSync(reportPath)) throw new Error(`Missing mock smoke report: ${reportPath}`);
    const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
    assertMockSmokeReport(report, outputDir);

    console.log(`Mock-provider smoke passed: ${join(outputDir, 'report.md')}`);
    console.log(`Demo output: ${join(outputDir, 'demo.md')}`);
    console.log('This is deterministic local integration evidence, not live release evidence.');
    return 0;
  } finally {
    await close(server);
  }
}

function outputArg(argv) {
  const index = argv.indexOf('--output');
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error('Missing value for --output');
  return value;
}

function createServerState() {
  const rubric = getDomainRubric('general-agent');
  if (!rubric) throw new Error('Missing general-agent rubric');
  const dimensions = getDimensionsForDepth(rubric, 'operator');
  const dimensionIds = dimensions.map(dimension => dimension.id);
  const criticalIds = dimensions
    .filter(dimension => dimension.priority === 'critical')
    .map(dimension => dimension.id);

  return {
    dimensions,
    dimensionIds,
    criticalIds,
    interviewerStep: 0,
    userStep: 0,
  };
}

function createMockChatServer(state) {
  return createServer(async (request, response) => {
    try {
      if (request.method !== 'POST' || !request.url?.endsWith('/chat/completions')) {
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'not found' }));
        return;
      }

      const body = JSON.parse(await readRequestBody(request));
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const joined = messages.map(message => String(message?.content ?? '')).join('\n\n');
      const isZai = request.url.startsWith('/zai/');

      let content;
      if (/Reply with exactly:\s*ok/i.test(joined)) {
        content = 'ok';
      } else if (/Extract structured data for the user's taste profile/i.test(joined) || /data extraction assistant/i.test(joined)) {
        content = JSON.stringify(extractionPayload(state), null, 2);
      } else if (isZai) {
        content = nextSimulatedUserReply(state);
      } else {
        content = nextInterviewerReply(state);
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 250, completion_tokens: Math.ceil(content.length / 4) },
      }));
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });
}

function nextInterviewerReply(state) {
  const step = state.interviewerStep++;
  if (step === 0) {
    return [
      'I want to understand the operating taste behind your ideal general-purpose agent. Start broad: what kind of help should feel unmistakably useful to you?',
      coverageBlock({ shouldComplete: false }),
    ].join('\n');
  }

  if (step === 1) {
    return [
      'What I am hearing is that usefulness means direct challenge, careful evidence, and artifacts that make future work easier rather than just a pleasant conversation. Let me test that with one draft read.',
      coverageBlock({
        updates: Object.fromEntries(state.dimensions.map(dimension => [dimension.id, {
          status: 'covered',
          confidence_delta: 1.6,
          signal_source: 'explicit',
          summary: summaryForDimension(dimension.id),
          facts: factsForDimension(dimension.id),
          anti_signals: antiSignalsForDimension(dimension.id),
        }])),
        meta: {
          pacing_position: 'late',
          fatigue_detected: false,
          framework_active: 'funnel',
        },
        shouldComplete: false,
      }),
    ].join('\n');
  }

  if (step === 2) {
    return [
      'Confirmed. Here is the draft: you want an agent that is candid, evidence-forward, concise by default, protective around irreversible actions, and willing to turn messy exploration into durable files. Does that land as the profile to lock?',
      coverageBlock({
        meta: {
          pacing_position: 'late',
          fatigue_detected: true,
          framework_active: 'confirmation',
          confirmation_event: {
            type: 'cluster',
            dimension_ids: state.criticalIds,
            accepted: true,
            summary: 'Critical dimensions confirmed before final draft.',
          },
        },
        shouldComplete: false,
      }),
    ].join('\n');
  }

  return [
    'Great, I have enough to compile this into your TasteKit runtime artifacts.',
    coverageBlock({
      meta: {
        pacing_position: 'late',
        fatigue_detected: false,
        framework_active: 'final_confirmation',
        confirmation_event: {
          type: 'draft',
          dimension_ids: state.dimensionIds,
          accepted: true,
          summary: 'Full Taste Composition draft accepted.',
        },
      },
      shouldComplete: true,
    }),
  ].join('\n');
}

function nextSimulatedUserReply(state) {
  const step = state.userStep++;
  if (step === 0) {
    return [
      'Useful means it should be a serious thinking partner, not a generic assistant.',
      'I want it to push back when my plan is thin, cite uncertainty when facts are shaky, and produce reusable artifacts instead of long vibes.',
      'It can act on reversible cleanup and research tasks, but should ask before public posts, spendy work, production changes, or anything hard to undo.',
      'Tone should be direct, specific, and low-fluff. I dislike cheerleading and vague strategy language.',
    ].join(' ');
  }
  if (step === 1) {
    return 'Yes, that is right. Challenge me earlier, keep the evidence visible, and default to durable notes or files when the context will matter later.';
  }
  return 'That draft lands. Lock it in, and keep assumptions explicit if something was inferred rather than directly stated.';
}

function coverageBlock({ updates = {}, meta = {}, shouldComplete = false } = {}) {
  return [
    '<!--COVERAGE',
    JSON.stringify({
      dimensions_touched: Object.keys(updates),
      dimension_updates: updates,
      should_complete: shouldComplete,
      interview_meta: meta,
    }),
    'COVERAGE-->',
  ].join('\n');
}

function extractionPayload(state) {
  return {
    principles: [
      {
        statement: 'Challenge weak assumptions before implementation.',
        rationale: 'The user values better plans over fast agreement, especially when a proposal is thin or high-impact.',
        priority: 1,
        applies_to: ['*'],
        examples_good: ['Name the weak assumption and propose a sharper test before coding.'],
        examples_bad: ['Accept a vague plan because it sounds plausible.'],
        source_dimension: 'quality_bar',
      },
      {
        statement: 'Make uncertainty and evidence visible.',
        rationale: 'The agent should help the user calibrate risk instead of laundering guesses into confident prose.',
        priority: 2,
        applies_to: ['research', 'planning', 'technical decisions'],
        examples_good: ['Separate confirmed facts from inference and cite the source of each important claim.'],
        examples_bad: ['State time-sensitive or external facts without checking them.'],
        source_dimension: 'evidence_rigor',
      },
      {
        statement: 'Prefer durable artifacts when context will be reused.',
        rationale: 'The user wants taste and domain knowledge to carry across sessions rather than disappear into chat history.',
        priority: 3,
        applies_to: ['planning', 'handoffs', 'release work'],
        examples_good: ['Write a concise plan, report, or runtime file when the output needs to guide future work.'],
        examples_bad: ['Leave important decisions only in a conversational summary.'],
        source_dimension: 'output_artifact_preferences',
      },
    ],
    tone: {
      voice_keywords: ['direct', 'specific', 'pragmatic', 'low-fluff'],
      forbidden_phrases: ['This is exciting', 'game changer', 'obviously'],
      formatting_rules: ['Lead with findings or next action.', 'Keep summaries compact unless detail is needed for verification.'],
      source_dimensions: ['communication_tone', 'communication_contract'],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.86,
      cost_sensitivity: 0.72,
      autonomy_level: 0.62,
      source_dimensions: ['accuracy_evidence', 'cost_resource_sensitivity', 'autonomy_boundaries'],
    },
    evidence_policy: {
      require_citations_for: ['current external facts', 'claims about APIs or release state', 'high-impact technical recommendations'],
      uncertainty_language_rules: ['Say when a claim is inferred.', 'Do not imply live verification unless it actually happened.'],
      source_dimensions: ['accuracy_evidence', 'evidence_rigor', 'governance_auditability'],
    },
    taboos: {
      never_do: ['Hide uncertainty.', 'Overwrite user-authored content outside managed regions.', 'Present unverified evidence as verified.'],
      must_escalate: ['Public publishing.', 'Production changes.', 'Irreversible file or data operations.', 'Large paid provider runs without clear purpose.'],
      source_dimensions: ['hard_boundaries', 'risk_escalation', 'autonomy_boundaries'],
    },
    domain_specific: Object.fromEntries(state.dimensions.map(dimension => [dimension.id, {
      summary: summaryForDimension(dimension.id),
      facts: factsForDimension(dimension.id),
    }])),
  };
}

function summaryForDimension(id) {
  const summaries = {
    core_purpose: 'The agent should be a serious thinking partner that improves judgment and preserves reusable context.',
    guiding_principles: 'Challenge weak assumptions, show evidence, and turn important decisions into durable artifacts.',
    communication_tone: 'Direct, specific, pragmatic, and low-fluff.',
    autonomy_boundaries: 'Act on reversible work, ask before public, spendy, production, or hard-to-undo actions.',
    accuracy_evidence: 'Prefer checked facts and visible uncertainty over confident guesses.',
    hard_boundaries: 'Do not overwrite user-authored content or hide uncertainty.',
    cost_resource_sensitivity: 'Provider spend is acceptable when it creates real verification value.',
    mission_scope: 'Help with planning, research, implementation readiness, and durable agent context.',
    decision_style: 'Make tradeoffs explicit and recommend a path when evidence is sufficient.',
    communication_contract: 'Lead with the useful point, then evidence and next steps.',
    evidence_rigor: 'Distinguish verified facts from inference and cite sources for current external claims.',
    risk_escalation: 'Escalate irreversible, public, or production-impacting actions.',
    planning_horizon: 'Optimize for release-ready systems, not only immediate green tests.',
    tooling_preferences: 'Use repo-native tools, deterministic checks, and focused subagents when useful.',
    context_window_management: 'Keep summaries concise but preserve decisions and evidence in files.',
    output_artifact_preferences: 'Prefer plans, reports, runtime files, and validation artifacts for reusable work.',
    feedback_loop: 'Use review, tests, and concrete evidence to tighten quality.',
    quality_bar: 'No corner cutting; prove claims with current-state evidence.',
    exception_handling: 'State blockers precisely and keep the goal open when evidence is incomplete.',
    collaboration_style: 'Direct collaboration with concise updates and minimal ceremony.',
    prioritization_framework: 'Fix release blockers before polish; spend effort where it protects real-world value.',
    performance_constraints: 'Keep added machinery purposeful and avoid unnecessary complexity.',
    memory_retention_preferences: 'Preserve important taste, domain knowledge, and decisions across sessions.',
    governance_auditability: 'Make verification commands and artifact checks reviewable.',
  };
  return summaries[id] ?? `Preference captured for ${id}.`;
}

function factsForDimension(id) {
  return [
    summaryForDimension(id),
    'The profile emphasizes challenge, evidence, autonomy boundaries, durable artifacts, and explicit assumptions.',
  ];
}

function antiSignalsForDimension(id) {
  if (id === 'communication_tone') return ['cheerleading', 'vague strategy language'];
  if (id === 'accuracy_evidence') return ['uncited current claims', 'false certainty'];
  if (id === 'autonomy_boundaries') return ['unapproved public or irreversible action'];
  return [];
}

function assertMockSmokeReport(report, outputDir) {
  if (report.result !== 'pass') throw new Error(`Expected pass result, got ${report.result}`);
  if (report.metadata?.provider_mode !== 'mock-provider-smoke') throw new Error('Report did not record mock-provider-smoke mode');
  if (report.interviewShape?.stop_reason !== 'tastekit-complete') throw new Error('Interview did not complete');
  if (!/not live release evidence/i.test(report.releaseInterpretation ?? '')) {
    throw new Error('Mock smoke report did not warn that it is not live release evidence');
  }

  const assertions = new Map((report.assertions ?? []).map(assertion => [assertion.name, assertion]));
  for (const name of ['provider-preflight', 'live-interview-complete', 'constitution-extensions', 'validator', 'export-artifacts-present', 'runtime-markdown-safe']) {
    const assertion = assertions.get(name);
    if (assertion?.status !== 'pass') throw new Error(`Missing passing assertion: ${name}`);
  }
  for (const name of ['managed-region-rerun-balanced', 'managed-region-manual-content-preserved']) {
    const assertion = assertions.get(name);
    if (assertion?.status !== 'pass') throw new Error(`Missing managed-region assertion: ${name}`);
  }

  for (const item of report.downstream ?? []) {
    if (item.status !== 'pass') throw new Error(`Downstream check failed: ${item.name} ${item.summary ?? ''}`);
  }

  for (const relative of ['report.md', 'demo.md', 'workspace/.tastekit/constitution.v1.json', 'workspace/CLAUDE.md', 'workspace/SOUL.md', 'workspace/AGENTS.md']) {
    const path = join(outputDir, relative);
    if (!existsSync(path)) throw new Error(`Missing expected mock smoke artifact: ${path}`);
  }

  const demo = readFileSync(join(outputDir, 'demo.md'), 'utf-8');
  if (!/not live release evidence/i.test(demo)) {
    throw new Error('Mock smoke demo did not warn that it is not live release evidence');
  }
  if (!/scripted coverage fixture/i.test(demo)) {
    throw new Error('Mock smoke demo did not label coverage as a scripted fixture');
  }
  for (const relative of ['workspace/CLAUDE.md', 'workspace/SOUL.md', 'workspace/AGENTS.md']) {
    const runtime = readFileSync(join(outputDir, relative), 'utf-8');
    if (/\bmock\b|mock-provider|scripted coverage fixture|live release evidence/i.test(runtime)) {
      throw new Error(`Runtime artifact leaked mock fixture provenance: ${relative}`);
    }
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf-8');
    request.on('data', chunk => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

main(process.argv.slice(2)).then(code => {
  process.exitCode = code;
}).catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
