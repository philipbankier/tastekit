import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { buildChatCompletionsUrl, createChatClient, isExactOkPreflightResponse, redactSecrets } from '../lib/live-e2e/chat-client.mjs';
import { createEventWriter, readJsonl, summarizeTranscriptForJudge } from '../lib/live-e2e/events.mjs';
import {
  assertExpectedExportArtifacts,
  countManagedRegions,
  detectRuntimeMarkdownLeaks,
  assertExtensionPresence,
  assertManagedRegionFiles,
  assertRuntimeMarkdown,
  expectedExportArtifactPaths,
} from '../lib/live-e2e/artifacts.mjs';
import {
  classifyExitCode,
  extractJsonObject,
  REQUIRED_JUDGE_DIMENSIONS,
  renderDemoMarkdown,
  renderReportMarkdown,
  selectReleaseInterpretation,
  summarizeDriftResult,
  summarizeCommandResult,
  summarizeSkillsGraphResult,
  summarizeValidatorResult,
  validateJudgeReport,
  writeReports,
} from '../lib/live-e2e/report.mjs';
import { createRunDirectory, writeCleanReplayTrace, writeEvalPack } from '../lib/live-e2e/workspace.mjs';
import {
  fullCompositionCompletionGaps,
  shouldWarnMissingFatigueEvent,
  transcriptHasFatigueSignal,
} from '../lib/live-e2e/interview-assertions.mjs';

test('buildChatCompletionsUrl appends chat path without adding /v1', () => {
  assert.equal(
    buildChatCompletionsUrl('https://api.z.ai/api/coding/paas/v4'),
    'https://api.z.ai/api/coding/paas/v4/chat/completions',
  );
  assert.equal(
    buildChatCompletionsUrl('https://api.z.ai/api/coding/paas/v4/chat/completions'),
    'https://api.z.ai/api/coding/paas/v4/chat/completions',
  );
});

test('preflight response must be exactly ok after trimming', () => {
  assert.equal(isExactOkPreflightResponse('ok'), true);
  assert.equal(isExactOkPreflightResponse(' OK \n'), true);
  assert.equal(isExactOkPreflightResponse('ok, ready'), false);
  assert.equal(isExactOkPreflightResponse('sure'), false);
});

test('redactSecrets removes known API keys from nested content', () => {
  const redacted = redactSecrets(
    {
      authorization: 'Bearer sk-test-secret',
      nested: ['zai-secret-value', { text: 'OPENAI_API_KEY=sk-test-secret' }],
    },
    ['sk-test-secret', 'zai-secret-value'],
  );
  assert.equal(JSON.stringify(redacted).includes('sk-test-secret'), false);
  assert.equal(JSON.stringify(redacted).includes('zai-secret-value'), false);
  assert.equal(JSON.stringify(redacted).includes('[REDACTED]'), true);
});

test('redactSecrets removes API-key-like values even without exact secret values', () => {
  const redacted = redactSecrets([
    'OPENAI_API_KEY=sk-proj-live-secret-value-that-should-not-persist',
    'ZAI_API_KEY=zai-live-secret-value-that-should-not-persist',
    'Authorization: Bearer sk-live-secret-value-that-should-not-persist',
    '"ZAI_API_KEY": "quoted-zai-secret-value-that-should-not-persist"',
    '"authorization": "Bearer quoted-bearer-secret-value-that-should-not-persist"',
  ]);
  const text = JSON.stringify(redacted);
  assert.doesNotMatch(text, /sk-proj-live-secret/);
  assert.doesNotMatch(text, /zai-live-secret/);
  assert.doesNotMatch(text, /Bearer sk-live-secret/);
  assert.doesNotMatch(text, /quoted-zai-secret/);
  assert.doesNotMatch(text, /quoted-bearer-secret/);
  assert.match(text, /\[REDACTED/);
});

test('chat client creates a fresh abort signal for each retry', async () => {
  const originalFetch = globalThis.fetch;
  const signalStates = [];
  try {
    globalThis.fetch = async (_url, init) => {
      signalStates.push(init.signal.aborted);
      if (signalStates.length === 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('simulated timeout after signal abort');
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
      };
    };
    const client = createChatClient({
      name: 'unit',
      apiKey: 'key',
      baseUrl: 'https://example.test/v1',
      model: 'model',
    });
    const result = await client.complete([{ role: 'user', content: 'hi' }], { timeoutMs: 1, retries: 1 });
    assert.equal(result.content, 'ok');
    assert.deepEqual(signalStates, [false, false]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenAI chat client uses current Chat Completions request shape', async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody;
  try {
    globalThis.fetch = async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
      };
    };
    const client = createChatClient({
      name: 'openai',
      apiKey: 'key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.5',
    });
    await client.complete([
      { role: 'system', content: 'system instructions' },
      { role: 'user', content: 'hi' },
    ], { maxTokens: 12 });
    assert.equal(capturedBody.max_tokens, undefined);
    assert.equal(capturedBody.max_completion_tokens, 12);
    assert.equal(capturedBody.messages[0].role, 'developer');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenAI-compatible proxy chat client can preserve system role', async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody;
  try {
    globalThis.fetch = async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
      };
    };
    const client = createChatClient({
      name: 'openai',
      apiKey: 'key',
      baseUrl: 'http://127.0.0.1:8317/v1',
      model: 'grok-4.3',
      systemRole: 'system',
    });
    await client.complete([
      { role: 'system', content: 'system instructions' },
      { role: 'user', content: 'hi' },
    ], { maxTokens: 12 });
    assert.equal(capturedBody.messages[0].role, 'system');
    assert.equal(capturedBody.max_completion_tokens, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chat client reports redacted response shape when content is missing', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        id: 'cmpl-test',
        choices: [{ finish_reason: 'length', message: { refusal: 'not today' } }],
        usage: { prompt_tokens: 1, completion_tokens: 0 },
      }),
    });
    const client = createChatClient({
      name: 'openai',
      apiKey: 'sk-secret-value-that-must-not-leak',
      baseUrl: 'https://example.test/v1',
      model: 'gpt-5.5',
    });
    await assert.rejects(
      () => client.complete([{ role: 'user', content: 'hi' }]),
      error => {
        assert.match(error.message, /choices\[0\]\.message\.content/);
        assert.match(error.message, /finish_reason=length/);
        assert.match(error.message, /message_keys=refusal/);
        assert.doesNotMatch(error.message, /sk-secret/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chat client retries once when provider returns a missing message content shape', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const warnings = [];
  try {
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: null, tool_calls: [] } }],
            usage: { prompt_tokens: 1, completion_tokens: 0 },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'recovered' } }],
          usage: { prompt_tokens: 2, completion_tokens: 1 },
        }),
      };
    };
    const client = createChatClient({
      name: 'zai',
      apiKey: 'key',
      baseUrl: 'https://example.test/v1',
      model: 'glm-test',
    }, {
      eventWriter: {
        write(type, data) {
          warnings.push({ type, data });
        },
      },
    });

    const result = await client.complete([{ role: 'user', content: 'hi' }]);

    assert.equal(result.content, 'recovered');
    assert.equal(calls, 2);
    assert.deepEqual(result.warnings, ['retried after provider returned missing message content']);
    assert.equal(warnings[0].type, 'provider_warning');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chat client retries transient proxy stream disconnect responses', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: false,
          status: 408,
          text: async () => '{"error":{"message":"xai stream error: stream disconnected before response.completed"}}',
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'recovered after proxy disconnect' } }],
          usage: { prompt_tokens: 2, completion_tokens: 5 },
        }),
      };
    };
    const client = createChatClient({
      name: 'openai',
      apiKey: 'key',
      baseUrl: 'http://127.0.0.1:8317/v1',
      model: 'grok-4.3',
      systemRole: 'system',
    });

    const result = await client.complete([{ role: 'user', content: 'hi' }], { retries: 1 });

    assert.equal(result.content, 'recovered after proxy disconnect');
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chat client retries once without unsupported sampling parameters', async () => {
  const originalFetch = globalThis.fetch;
  const capturedBodies = [];
  const warnings = [];
  try {
    globalThis.fetch = async (_url, init) => {
      capturedBodies.push(JSON.parse(init.body));
      if (capturedBodies.length === 1) {
        return {
          ok: false,
          status: 400,
          text: async () => 'Unsupported parameter: temperature is not supported for this model.',
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
      };
    };
    const client = createChatClient({
      name: 'openai',
      apiKey: 'key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.5',
    }, {
      eventWriter: {
        write(type, data) {
          warnings.push({ type, data });
        },
      },
    });
    const result = await client.complete([{ role: 'user', content: 'hi' }], { maxTokens: 12, temperature: 0.2 });
    assert.equal(result.content, 'ok');
    assert.deepEqual(result.warnings, ['retried without unsupported parameter(s): temperature']);
    assert.equal(capturedBodies.length, 2);
    assert.equal(capturedBodies[0].temperature, 0.2);
    assert.equal(capturedBodies[1].temperature, undefined);
    assert.equal(capturedBodies[1].max_completion_tokens, 12);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].type, 'provider_warning');
    assert.match(warnings[0].data.warning, /unsupported parameter/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('event writer stores JSONL events with redaction', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-events-'));
  try {
    const path = join(dir, 'events.jsonl');
    const writer = createEventWriter(path, { secrets: ['secret-token'] });
    writer.write('preflight', { endpoint: 'https://example.test', token: 'secret-token' });
    writer.writeAssertion('unit-check', 'pass', 'info', { detail: 'ok' });
    const events = readJsonl(path);
    assert.equal(events.length, 2);
    assert.equal(events[0].type, 'preflight');
    assert.equal(events[0].data.token, '[REDACTED]');
    assert.equal(events[1].type, 'assertion');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fatigue assertion warns only when transcript contains a fatigue signal', () => {
  const calmTranscript = [
    { type: 'simulated_user_message', data: { reply: 'This draft is good. Ship it.' } },
  ];
  const fatigueTranscript = [
    { type: 'simulated_user_message', data: { reply: 'Can we compress this? I feel like I am repeating myself.' } },
  ];
  const circlingTranscript = [
    { type: 'simulated_user_message', data: { reply: 'Honestly, I feel like we are circling the same themes. Can we get sharper?' } },
  ];

  assert.equal(transcriptHasFatigueSignal(calmTranscript), false);
  assert.equal(transcriptHasFatigueSignal(fatigueTranscript), true);
  assert.equal(transcriptHasFatigueSignal(circlingTranscript), true);
  assert.equal(shouldWarnMissingFatigueEvent({ metacognition: { fatigue_events: [] } }, calmTranscript), false);
  assert.equal(shouldWarnMissingFatigueEvent({ metacognition: { fatigue_events: [] } }, fatigueTranscript), true);
  assert.equal(shouldWarnMissingFatigueEvent({ metacognition: { fatigue_events: [{ signal: 'user_fatigue_signal' }] } }, fatigueTranscript), false);
});

test('Full composition completion gaps catch incomplete dimensions and finish-now assumptions', () => {
  const gaps = fullCompositionCompletionGaps({
    dimension_coverage: [
      {
        dimension_id: 'autonomy_boundaries',
        status: 'in_progress',
        confidence: 1.2,
        confidence_threshold: 1.5,
      },
      {
        dimension_id: 'quality_bar',
        status: 'covered',
        confidence: 1.6,
        confidence_threshold: 1.5,
      },
    ],
    metacognition: {
      unresolved_assumptions: [{
        source: 'user_finish_now',
        dimension_id: 'autonomy_boundaries',
      }],
    },
  });

  assert.deepEqual(gaps.incompleteDimensionIds, ['autonomy_boundaries']);
  assert.deepEqual(gaps.finishNowDimensionIds, ['autonomy_boundaries']);
});

test('transcript judge summary includes conversation content and compact state', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-transcript-'));
  try {
    const path = join(dir, 'transcript.jsonl');
    const writer = createEventWriter(path);
    writer.write('interviewer_message', { turn: 0, message: 'Where do agents usually overfit your preferences?' });
    writer.write('simulated_user_message', { turn: 1, reply: 'They mistake directness for impatience.' });
    writer.write('state_update', { turn: 1, policy_action: 'confirm', coverage_summary: { covered: 3 } });
    const summary = summarizeTranscriptForJudge(path);
    assert.match(summary, /Interviewer: Where do agents usually overfit/);
    assert.match(summary, /Simulated user: They mistake directness/);
    assert.match(summary, /policy=confirm/);
    assert.match(summary, /coverage/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('artifact helpers detect managed regions, extensions, and leaks', () => {
  const markdown = [
    '<!-- BEGIN TASTEKIT MANAGED REGION -->',
    '# AGENTS.md',
    'Practical guidance.',
    '<!-- END TASTEKIT MANAGED REGION -->',
    '',
  ].join('\n');
  assert.equal(countManagedRegions(markdown), 1);

  const leaks = detectRuntimeMarkdownLeaks(markdown, {
    transcriptSamples: ['raw interview answer'],
    hiddenTerms: ['<!--COVERAGE', 'policy reason codes'],
  });
  assert.deepEqual(leaks, []);
  const partialLeak = detectRuntimeMarkdownLeaks('a distinctive twelve word phrase about product taste needing sharp friction before polish', {
    transcriptSamples: ['this answer contains a distinctive twelve word phrase about product taste needing sharp friction before polish appears later'],
  });
  assert.equal(partialLeak.some(leak => leak.type === 'transcript_phrase'), true);

  const constitution = {
    extensions: {
      'x-tastekit-composition': { schema_version: 'tastekit.composition.v1' },
      'x-tastekit-metacognition': { schema_version: 'tastekit.metacognition.v1' },
    },
  };
  assert.doesNotThrow(() => assertExtensionPresence(constitution));
});

test('assertRuntimeMarkdown rejects malformed managed regions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-runtime-malformed-'));
  const malformed = [
    '<!-- BEGIN TASTEKIT MANAGED REGION -->',
    '# Runtime',
    'Practical guidance.',
    '',
  ].join('\n');
  try {
    writeFileSync(join(dir, 'CLAUDE.md'), malformed, 'utf-8');
    writeFileSync(join(dir, 'SOUL.md'), malformed, 'utf-8');
    writeFileSync(join(dir, 'AGENTS.md'), malformed, 'utf-8');
    assert.throws(() => assertRuntimeMarkdown(dir), /managed region markers/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeEvalPack judges generated profile evidence instead of seeded pass text', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-evalpack-'));
  try {
    const path = writeEvalPack(dir, 'challenge assumptions, state uncertainty from evidence, require approval before public action, compress when fatigue appears');
    const pack = JSON.parse(readFileSync(path, 'utf-8'));
    const responses = pack.scenarios.map(scenario => scenario.setup.inputs.response);
    assert.equal(responses.every(response => response.includes('challenge assumptions')), true);
    assert.equal(responses.some(response => response === 'challenge uncertainty approval irreversible public action fatigue compress evidence'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('clean replay trace contains no intentional principle violations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-clean-replay-'));
  try {
    const path = writeCleanReplayTrace(dir);
    const content = readFileSync(path, 'utf-8');
    assert.doesNotMatch(content, /"event_type":"error"/);
    assert.doesNotMatch(content, /principle_refs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('command result summarizer parses JSON pass state from stdout', () => {
  assert.equal(extractJsonObject('noise\n{"passed":false,"violations":[1]}\n').passed, false);
  assert.deepEqual(
    summarizeCommandResult('trust audit', { code: 0, stdout: '{"passed":false}', stderr: '' }),
    { name: 'trust audit', status: 'fail', summary: 'passed=false' },
  );
  assert.deepEqual(
    summarizeCommandResult('eval run', { code: 0, stdout: '{"passed":true,"overall_score":1}', stderr: '' }),
    { name: 'eval run', status: 'pass', summary: 'passed=true score=1' },
  );
  assert.deepEqual(
    summarizeCommandResult('eval run', { code: 0, stdout: '{"evalpack_id":"p","results":[{"passed":true,"score":1},{"passed":true,"score":0.5}]}', stderr: '' }),
    { name: 'eval run', status: 'pass', summary: 'results=2 passed=2 avg=0.75/1.00' },
  );
  assert.deepEqual(
    summarizeCommandResult('eval run', { code: 0, stdout: '{"evalpack_id":"p","results":[{"passed":true,"score":1},{"passed":false,"score":0}]}', stderr: '' }),
    { name: 'eval run', status: 'fail', summary: 'results=2 passed=1 failed=1 avg=0.50/1.00' },
  );
  assert.deepEqual(
    summarizeCommandResult('eval replay', { code: 0, stdout: 'Replay found 1 violation(s)', stderr: '' }),
    { name: 'eval replay', status: 'fail', summary: 'missing parseable JSON pass state' },
  );
  assert.deepEqual(
    summarizeCommandResult('trust audit', { code: 0, stdout: '{"violations":[1]}', stderr: '' }),
    { name: 'trust audit', status: 'fail', summary: 'missing boolean passed field' },
  );
});

test('validator result summarizer fails closed on non-ok JSON', () => {
  assert.deepEqual(
    summarizeValidatorResult({ code: 0, stdout: '{"ok":true,"issues":[]}', stderr: '' }),
    { name: 'validator', status: 'pass', summary: 'ok=true issues=0' },
  );
  assert.deepEqual(
    summarizeValidatorResult({ code: 0, stdout: '{"ok":false,"issues":[{"message":"bad"}]}', stderr: '' }),
    { name: 'validator', status: 'fail', summary: 'ok=false issues=1' },
  );
  assert.deepEqual(
    summarizeValidatorResult({ code: 0, stdout: '{"passed":true}', stderr: '' }),
    { name: 'validator', status: 'fail', summary: 'missing boolean ok field' },
  );
});

test('semantic downstream summaries require useful drift and skill graph evidence', () => {
  assert.deepEqual(
    summarizeSkillsGraphResult({ code: 0, stdout: '{"node_count":3,"edge_count":2,"missing_refs":[]}', stderr: '' }),
    { name: 'skills graph', status: 'pass', summary: 'nodes=3 edges=2 missing_refs=0' },
  );
  assert.deepEqual(
    summarizeSkillsGraphResult({ code: 0, stdout: '{"node_count":0,"edge_count":0}', stderr: '' }),
    { name: 'skills graph', status: 'fail', summary: 'node_count=0' },
  );
  assert.deepEqual(
    summarizeSkillsGraphResult({ code: 0, stdout: '{"node_count":1,"edge_count":0,"missing_refs":[{"skill_id":"a"}]}', stderr: '' }),
    { name: 'skills graph', status: 'fail', summary: 'missing_refs=1' },
  );
  assert.deepEqual(
    summarizeDriftResult({ code: 0, stdout: '{"proposals":[{"proposal_id":"p1","signal_type":"principle_violation","proposed_changes":{"guardrails":{"add_approval":{"rule_id":"approval","when":"public action","action":"ask"}}}},{"proposal_id":"p2","signal_type":"repeated_edit","proposed_changes":{"tone":{"add_forbidden_phrase":"overexplaining"}}}]}', stderr: '' }),
    { name: 'drift detect', status: 'pass', summary: 'proposals=2 signals=principle_violation,repeated_edit' },
  );
  assert.deepEqual(
    summarizeDriftResult({ code: 0, stdout: '{"proposals":[]}', stderr: '' }),
    { name: 'drift detect', status: 'fail', summary: 'proposals=0' },
  );
  assert.deepEqual(
    summarizeDriftResult({ code: 0, stdout: '{"proposals":[{"proposal_id":"p1","signal_type":"staleness"}]}', stderr: '' }),
    { name: 'drift detect', status: 'fail', summary: 'missing expected live drift signals' },
  );
});

test('judge report schema and release interpretation fail closed', () => {
  const validJudge = validateJudgeReport({
    passed: true,
    average: 4.4,
    scores: REQUIRED_JUDGE_DIMENSIONS.map(dimension => ({
      dimension,
      score: dimension === 'Runtime usability' ? 5 : 4,
      rationale: `${dimension} is specific and operational.`,
    })),
    critical_concerns: [],
    release_interpretation: 'Useful release evidence.',
  });
  assert.equal(validJudge.passed, true);
  const lowAverageJudge = validateJudgeReport({
    passed: true,
    average: 2.4,
    scores: REQUIRED_JUDGE_DIMENSIONS.map(dimension => ({
      dimension,
      score: 2,
      rationale: 'Shallow.',
    })),
    critical_concerns: [],
    release_interpretation: 'Incorrectly claims pass.',
  });
  assert.equal(lowAverageJudge.passed, false);
  assert.match(lowAverageJudge.release_interpretation, /Judge pass overridden/);
  const inconsistentAverageJudge = validateJudgeReport({
    passed: true,
    average: 5,
    scores: REQUIRED_JUDGE_DIMENSIONS.map(dimension => ({
      dimension,
      score: 3,
      rationale: 'Adequate but not strong.',
    })),
    critical_concerns: [],
    release_interpretation: 'Incorrectly claims pass.',
  });
  assert.equal(inconsistentAverageJudge.average, 3);
  assert.equal(inconsistentAverageJudge.passed, false);
  assert.match(inconsistentAverageJudge.release_interpretation, /Judge pass overridden/);
  const lowCriticalJudge = validateJudgeReport({
    passed: true,
    average: 4.2,
    scores: REQUIRED_JUDGE_DIMENSIONS.map(dimension => ({
      dimension,
      score: dimension === 'Metacognition' ? 2 : 5,
      rationale: dimension === 'Metacognition' ? 'No pacing.' : 'Specific.',
    })),
    critical_concerns: [],
    release_interpretation: 'Incorrectly claims pass.',
  });
  assert.equal(lowCriticalJudge.passed, false);
  assert.equal(validateJudgeReport({
    passed: true,
    average: 4.2,
    scores: REQUIRED_JUDGE_DIMENSIONS.map(dimension => ({
      dimension,
      score: dimension === 'Runtime usability' ? 3 : 5,
      rationale: 'Usable enough.',
    })),
    critical_concerns: [],
    release_interpretation: 'Pass.',
  }).passed, true);
  assert.throws(() => validateJudgeReport({
    passed: true,
    average: 5,
    scores: [{ dimension: 'Depth', score: 5, rationale: 'Incomplete but high.' }],
    critical_concerns: [],
    release_interpretation: 'Pass.',
  }), /missing required dimensions/);
  assert.throws(() => validateJudgeReport({
    passed: true,
    average: 5,
    scores: [
      ...REQUIRED_JUDGE_DIMENSIONS.map(dimension => ({ dimension, score: 5, rationale: 'Specific.' })),
      { dimension: 'Depth', score: 5, rationale: 'Duplicate.' },
    ],
    critical_concerns: [],
    release_interpretation: 'Pass.',
  }), /duplicate dimension/);
  assert.throws(() => validateJudgeReport({
    passed: true,
    average: 5,
    scores: REQUIRED_JUDGE_DIMENSIONS.map(dimension => ({ dimension, score: 4, rationale: 'ok' })),
    critical_concerns: [],
  }), /release_interpretation/);
  assert.equal(
    selectReleaseInterpretation({
      criticalFailures: [{ category: 'validator' }],
      judge: { release_interpretation: 'This looks releasable.' },
    }),
    'This run blocks release confidence because deterministic failures occurred.',
  );
});

test('report markdown includes artifact evidence and verification commands', () => {
  const markdown = renderReportMarkdown({
    result: 'pass',
    metadata: { domain: 'general-agent', depth: 'Full Taste Composition' },
    interviewShape: { turn_count: 42, stop_reason: 'tastekit-complete' },
    tasteSummary: 'Principles:\n- Challenge weak assumptions.',
    assertions: [{ name: 'validator', status: 'pass', severity: 'critical', evidence: 'ok=true issues=0' }],
    artifacts: [
      {
        path: '/tmp/workspace/CLAUDE.md',
        exists: true,
        kind: 'file',
        bytes: 1234,
        sha256: 'abc123',
        excerpt: '# CLAUDE\nUse concise, evidence-first guidance.',
      },
    ],
    downstream: [{ name: 'drift detect', status: 'pass', summary: 'proposals=2', evidence_source: 'synthetic drift trace fixture' }],
    judge: {
      average: 4.3,
      passed: true,
      scores: [{ dimension: 'Depth', score: 4, rationale: 'Operational preferences were extracted.' }],
    },
    verificationCommands: ['npx @actrun_ai/tastekit-validator .tastekit/constitution.v1.json --json'],
    releaseInterpretation: 'This run increases release confidence.',
    followUps: [],
  });
  assert.match(markdown, /sha256: abc123/);
  assert.match(markdown, /# CLAUDE/);
  assert.match(markdown, /source: synthetic drift trace fixture/);
  assert.match(markdown, /npx @actrun_ai\/tastekit-validator/);
  assert.match(markdown, /Verification Commands/);
});

test('report and demo markdown redact API-key-like values from artifact excerpts', () => {
  const report = {
    result: 'fail',
    metadata: { domain: 'general-agent', depth: 'Full Taste Composition' },
    interviewShape: { turn_count: 0, stop_reason: 'credential-check' },
    tasteSummary: '',
    assertions: [],
    artifacts: [
      {
        path: '/tmp/workspace/CLAUDE.md',
        exists: true,
        kind: 'file',
        bytes: 1234,
        sha256: 'abc123',
        excerpt: [
          '# CLAUDE',
          'OPENAI_API_KEY=sk-proj-live-secret-value-that-should-not-persist',
          'ZAI_API_KEY=zai-live-secret-value-that-should-not-persist',
          'Authorization: Bearer sk-live-secret-value-that-should-not-persist',
        ].join('\n'),
      },
    ],
    downstream: [],
    judge: null,
    verificationCommands: [],
    releaseInterpretation: 'Not release evidence.',
    followUps: [],
  };

  const markdown = `${renderReportMarkdown(report)}\n${renderDemoMarkdown(report)}`;
  assert.doesNotMatch(markdown, /sk-proj-live-secret/);
  assert.doesNotMatch(markdown, /zai-live-secret/);
  assert.doesNotMatch(markdown, /Bearer sk-live-secret/);
  assert.match(markdown, /\[REDACTED/);
});

test('writeReports creates an ignored latest-run pointer for reviewer discovery', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-latest-pointer-'));
  const outputDir = join(dir, 'full-composition-20260517-120000-test');
  try {
    mkdirSync(outputDir, { recursive: true });
    writeReports(outputDir, {
      result: 'fail',
      metadata: { domain: 'general-agent', depth: 'Full Taste Composition' },
      interviewShape: { turn_count: 0, stop_reason: 'credential-check' },
      tasteSummary: '',
      assertions: [],
      artifacts: [],
      downstream: [],
      judge: null,
      verificationCommands: ['pnpm test:live-e2e:preflight'],
      releaseInterpretation: 'Not release evidence.',
      followUps: [],
    });
    const pointer = JSON.parse(readFileSync(join(dir, 'latest-run.json'), 'utf-8'));
    assert.equal(pointer.output_dir, outputDir);
    assert.equal(pointer.report_md, join(outputDir, 'report.md'));
    assert.equal(pointer.demo_md, join(outputDir, 'demo.md'));
    assert.equal(pointer.result, 'fail');
    assert.equal(pointer.domain, 'general-agent');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeReports redacts exact provider secrets from report json and markdown outputs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-report-secret-redaction-'));
  const outputDir = join(dir, 'full-composition-20260517-120000-secrets');
  const exactSecret = 'LEAKS_RAW_SECRET_VALUE';
  try {
    mkdirSync(outputDir, { recursive: true });
    writeReports(outputDir, {
      result: 'pass',
      metadata: { domain: 'general-agent', depth: 'Full Taste Composition' },
      interviewShape: { turn_count: 1, stop_reason: 'tastekit-complete' },
      tasteSummary: '',
      assertions: [],
      artifacts: [{
        path: '/tmp/workspace/CLAUDE.md',
        exists: true,
        kind: 'file',
        bytes: 123,
        sha256: 'abc123',
        excerpt: `# CLAUDE\n${exactSecret}`,
      }],
      downstream: [],
      judge: null,
      verificationCommands: [],
      releaseInterpretation: 'Test report.',
      followUps: [`remove ${exactSecret}`],
    }, { secrets: [exactSecret] });

    assert.doesNotMatch(readFileSync(join(outputDir, 'report.json'), 'utf-8'), new RegExp(exactSecret));
    assert.doesNotMatch(readFileSync(join(outputDir, 'report.md'), 'utf-8'), new RegExp(exactSecret));
    assert.doesNotMatch(readFileSync(join(outputDir, 'demo.md'), 'utf-8'), new RegExp(exactSecret));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeReports does not fail report generation when latest pointer cannot be written', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-latest-pointer-blocked-'));
  const outputDir = join(dir, 'full-composition-20260517-120000-blocked');
  try {
    mkdirSync(outputDir, { recursive: true });
    mkdirSync(join(dir, 'latest-run.json'));
    assert.doesNotThrow(() => writeReports(outputDir, {
      result: 'fail',
      metadata: { domain: 'general-agent', depth: 'Full Taste Composition' },
      interviewShape: { turn_count: 0, stop_reason: 'credential-check' },
      tasteSummary: '',
      assertions: [],
      artifacts: [],
      downstream: [],
      judge: null,
      verificationCommands: [],
      releaseInterpretation: 'Not release evidence.',
      followUps: [],
    }));
    const reportJson = JSON.parse(readFileSync(join(outputDir, 'report.json'), 'utf-8'));
    assert.equal(reportJson.result, 'fail');
    assert.equal(reportJson.metadata.latest_run_pointer_status, 'failed');
    assert.match(reportJson.metadata.latest_run_pointer_error, /EISDIR|directory/);
    assert.equal(readFileSync(join(outputDir, 'report.md'), 'utf-8').includes('Result: **fail**'), true);
    assert.match(readFileSync(join(outputDir, 'report.md'), 'utf-8'), /latest_run_pointer_status: failed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('demo markdown turns report evidence into a reviewable walkthrough', () => {
  const demo = renderDemoMarkdown({
    result: 'pass',
    metadata: { domain: 'general-agent', depth: 'Full Taste Composition' },
    interviewShape: {
      turn_count: 42,
      stop_reason: 'tastekit-complete',
      fatigue_events: 1,
      confirmation_checkpoints: 3,
    },
    tasteSummary: 'Principles:\n- Challenge weak assumptions.',
    assertions: [{ name: 'runtime-markdown-safe', status: 'pass', evidence: '3 files' }],
    artifacts: [
      {
        path: '/tmp/workspace/CLAUDE.md',
        exists: true,
        kind: 'file',
        bytes: 1234,
        sha256: 'abc123',
        excerpt: '# CLAUDE\nChallenge weak assumptions before implementation.',
      },
      {
        path: '/tmp/workspace/.tastekit/constitution.v1.json',
        exists: true,
        kind: 'file',
        bytes: 4321,
        sha256: 'def456',
      },
    ],
    downstream: [{ name: 'eval run', status: 'pass', summary: 'passed=true score=1', evidence_source: 'generated profile eval pack' }],
    judge: {
      average: 4.3,
      passed: true,
      scores: [{ dimension: 'Runtime usability', score: 4, rationale: 'Actionable runtime guidance.' }],
    },
    verificationCommands: ['tastekit eval run --pack .tastekit/evals/live-e2e-evalpack.json --format json'],
    followUps: [],
  });
  assert.match(demo, /What This Demonstrates/);
  assert.match(demo, /Extracted Taste/);
  assert.match(demo, /Runtime Impact/);
  assert.match(demo, /Challenge weak assumptions/);
  assert.match(demo, /eval run: pass \(passed=true score=1; source: generated profile eval pack\)/);
});

test('demo markdown labels mock-provider smoke as non-release evidence', () => {
  const demo = renderDemoMarkdown({
    result: 'pass',
    metadata: { domain: 'general-agent', depth: 'Full Taste Composition', provider_mode: 'mock-provider-smoke' },
    interviewShape: { turn_count: 8, stop_reason: 'tastekit-complete' },
    tasteSummary: 'Principles:\n- Prefer direct critique.',
    assertions: [],
    artifacts: [],
    downstream: [],
    verificationCommands: [],
    followUps: [],
  });
  assert.match(demo, /mock-provider smoke/i);
  assert.match(demo, /not live release evidence/i);
  assert.match(demo, /Run the live provider E2E with judge before using this as release evidence/i);
});

test('demo markdown labels subscription-backed live demos as non-release evidence', () => {
  const demo = renderDemoMarkdown({
    result: 'pass',
    metadata: { domain: 'general-agent', depth: 'Full Taste Composition', provider_mode: 'subscription-live-demo' },
    interviewShape: { turn_count: 32, stop_reason: 'tastekit-complete' },
    tasteSummary: 'Principles:\n- Prefer direct critique.',
    assertions: [],
    artifacts: [],
    downstream: [],
    verificationCommands: [],
    followUps: [],
  });
  assert.match(demo, /subscription-backed live demo/i);
  assert.match(demo, /real-world product evidence/i);
  assert.match(demo, /official release evidence still requires/i);
});

test('demo markdown explains coverage, metacognition, and artifact safety when value walkthrough is present', () => {
  const demo = renderDemoMarkdown({
    result: 'pass',
    metadata: { domain: 'general-agent', depth: 'Full Taste Composition', provider_mode: 'live' },
    interviewShape: { turn_count: 48, stop_reason: 'tastekit-complete' },
    tasteSummary: 'Principles:\n- Challenge weak assumptions.',
    assertions: [],
    artifacts: [],
    downstream: [],
    verificationCommands: [],
    followUps: [],
    valueWalkthrough: {
      canonical_profile: '.tastekit/constitution.v1.json',
      coverage: {
        evidence_kind: 'live extraction',
        total_dimensions: 24,
        covered_dimensions: 24,
        by_priority: {
          critical: { total: 8, covered: 8, confirmed: 8, inferred: 0 },
          important: { total: 14, covered: 14, confirmed: 12, inferred: 2 },
        },
      },
      metacognition: {
        policy_path: ['ask', 'confirm', 'draft', 'stop'],
        accepted_draft_checkpoints: 1,
        fatigue_events: 2,
        unresolved_assumptions: 0,
        conflicts: 0,
      },
      runtime_guidance: [
        'Challenge weak assumptions before implementation.',
        'Ask before public or irreversible actions.',
      ],
      safety: [
        'Canonical detail remains in constitution extensions.',
        'Runtime markdown stays concise and does not include raw transcript text.',
        'Manual content preserved outside TasteKit managed regions.',
      ],
    },
  });

  assert.match(demo, /TasteKit Value Walkthrough/);
  assert.match(demo, /Coverage evidence: live extraction/);
  assert.match(demo, /Coverage: 24\/24 dimensions/);
  assert.match(demo, /critical: 8\/8 covered, 8 confirmed, 0 inferred/);
  assert.match(demo, /important: 14\/14 covered, 12 confirmed, 2 inferred/);
  assert.match(demo, /Policy path: ask -> confirm -> draft -> stop/);
  assert.match(demo, /Accepted draft checkpoints: 1/);
  assert.match(demo, /Canonical profile: `.tastekit\/constitution\.v1\.json`/);
  assert.match(demo, /Manual content preserved outside TasteKit managed regions/);
});

test('demo markdown labels scripted fixture coverage in mock walkthroughs', () => {
  const demo = renderDemoMarkdown({
    result: 'pass',
    metadata: { domain: 'general-agent', depth: 'Full Taste Composition', provider_mode: 'mock-provider-smoke' },
    interviewShape: { turn_count: 7, stop_reason: 'tastekit-complete' },
    tasteSummary: 'Principles:\n- Challenge weak assumptions.',
    assertions: [],
    artifacts: [],
    downstream: [],
    verificationCommands: [],
    followUps: [],
    valueWalkthrough: {
      coverage: {
        evidence_kind: 'scripted coverage fixture',
        total_dimensions: 24,
        covered_dimensions: 24,
      },
    },
  });

  assert.match(demo, /Coverage evidence: scripted coverage fixture/);
  assert.match(demo, /Run the live provider E2E with judge before using this as release evidence/i);
});

test('demo markdown labels dimension confidence as evidence weight', () => {
  const demo = renderDemoMarkdown({
    result: 'pass',
    metadata: { domain: 'general-agent', depth: 'Full Taste Composition', provider_mode: 'live' },
    interviewShape: { turn_count: 48, stop_reason: 'tastekit-complete' },
    tasteSummary: 'Principles:\n- Challenge weak assumptions.',
    assertions: [],
    artifacts: [],
    downstream: [],
    verificationCommands: [],
    followUps: [],
    valueWalkthrough: {
      dimension_examples: [
        {
          id: 'autonomy_boundaries',
          status: 'covered',
          confidence: 1.6,
          summary: 'Ask before public, production, or hard-to-reverse changes.',
        },
      ],
    },
  });

  assert.match(demo, /evidence weight 1\.6/);
  assert.doesNotMatch(demo, /confidence 1\.6/);
});

test('createRunDirectory rejects non-empty explicit output directories', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-output-'));
  try {
    writeFileSync(join(dir, 'report.md'), 'old report', 'utf-8');
    assert.throws(() => createRunDirectory(dir), /already exists and is not empty/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live env files are ignored by git', () => {
  const rootIgnore = readFileSync('.gitignore', 'utf-8');
  const liveIgnore = readFileSync('docs/validation/live/.gitignore', 'utf-8');
  assert.match(`${rootIgnore}\n${liveIgnore}`, /tastekit-live\.env/);
});

test('managed-region file assertion rejects rerun marker corruption', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-managed-rerun-'));
  try {
    const good = [
      'manual text',
      '<!-- BEGIN TASTEKIT MANAGED REGION -->',
      '# Runtime',
      '<!-- END TASTEKIT MANAGED REGION -->',
      '',
    ].join('\n');
    const bad = [
      'manual text',
      '<!-- BEGIN TASTEKIT MANAGED REGION -->',
      '# Runtime',
      '<!-- BEGIN TASTEKIT MANAGED REGION -->',
      '',
    ].join('\n');
    const goodPath = join(dir, 'SOUL.md');
    const badPath = join(dir, 'AGENTS.md');
    writeFileSync(goodPath, good, 'utf-8');
    writeFileSync(badPath, bad, 'utf-8');
    assert.throws(() => assertManagedRegionFiles([goodPath, badPath]), /managed region markers/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('exit classification separates deterministic failure from judge failure', () => {
  assert.equal(classifyExitCode({ failures: [], judgePassed: true, judgeAvailable: true }), 0);
  assert.equal(classifyExitCode({ failures: [], judgePassed: false, judgeAvailable: true }), 2);
  assert.equal(classifyExitCode({ failures: [{ severity: 'critical' }], judgePassed: true, judgeAvailable: true }), 1);
  assert.equal(classifyExitCode({ failures: [], judgePassed: false, judgeAvailable: false }), 0);
  assert.equal(classifyExitCode({ failures: [], judgePassed: false, judgeAvailable: false, judgeRequired: true }), 2);
});

test('assertRuntimeMarkdown requires core runtime files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-runtime-'));
  const managed = [
    '<!-- BEGIN TASTEKIT MANAGED REGION -->',
    '# Runtime',
    'Practical guidance.',
    '<!-- END TASTEKIT MANAGED REGION -->',
    '',
  ].join('\n');
  try {
    assert.throws(() => assertRuntimeMarkdown(dir), /Missing file: .*CLAUDE\.md/);
    writeFileSync(join(dir, 'CLAUDE.md'), managed, 'utf-8');
    writeFileSync(join(dir, 'SOUL.md'), managed, 'utf-8');
    writeFileSync(join(dir, 'AGENTS.md'), managed, 'utf-8');
    const results = assertRuntimeMarkdown(dir);
    assert.equal(results.length, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('assertRuntimeMarkdown rejects runtime fact dumps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-runtime-facts-'));
  const safeManaged = [
    '<!-- BEGIN TASTEKIT MANAGED REGION -->',
    '# Runtime',
    'Practical guidance.',
    '<!-- END TASTEKIT MANAGED REGION -->',
    '',
  ].join('\n');
  const leakingManaged = [
    '<!-- BEGIN TASTEKIT MANAGED REGION -->',
    '# Runtime',
    '- **autonomy_boundaries**: Useful summary. Facts: raw-ish interview detail should stay canonical only.',
    '<!-- END TASTEKIT MANAGED REGION -->',
    '',
  ].join('\n');
  try {
    writeFileSync(join(dir, 'CLAUDE.md'), leakingManaged, 'utf-8');
    writeFileSync(join(dir, 'SOUL.md'), safeManaged, 'utf-8');
    writeFileSync(join(dir, 'AGENTS.md'), safeManaged, 'utf-8');
    assert.throws(() => assertRuntimeMarkdown(dir), /Facts:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('expected export artifact assertion proves every export target file exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tastekit-live-exports-'));
  try {
    const paths = expectedExportArtifactPaths(dir);
    for (const path of paths) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, 'artifact', 'utf-8');
    }
    assert.deepEqual(assertExpectedExportArtifacts(dir), paths);
    rmSync(paths[0]);
    assert.throws(() => assertExpectedExportArtifacts(dir), /Missing file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live harness core imports are resolvable from the repo root', () => {
  assert.match(import.meta.resolve('@actrun_ai/tastekit-core/interview'), /packages\/core\/dist\/interview\/index\.js$/);
  assert.match(import.meta.resolve('@actrun_ai/tastekit-core/domains'), /packages\/core\/dist\/domains\/index\.js$/);
  assert.match(import.meta.resolve('@actrun_ai/tastekit-core/compiler'), /packages\/core\/dist\/compiler\/index\.js$/);
  assert.match(import.meta.resolve('@actrun_ai/tastekit-core/utils'), /packages\/core\/dist\/utils\/index\.js$/);
});

test('live prompt source files contain required contracts', () => {
  const persona = readFileSync('docs/validation/live/full-composition-persona.md', 'utf-8');
  const judge = readFileSync('docs/validation/live/full-composition-judge-rubric.md', 'utf-8');
  assert.match(persona, /Answer as the person/i);
  assert.match(persona, /Do not volunteer the whole profile/i);
  assert.match(persona, /fatigue/i);
  assert.match(persona, /push back/i);
  assert.match(judge, /JSON/i);
  assert.match(judge, /Autonomy boundaries/i);
  assert.match(judge, /Metacognition/i);
});
