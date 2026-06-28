import { describe, expect, it } from 'vitest';
import { compileConstitution } from '../constitution-compiler.js';
import type { SessionState } from '../../schemas/workspace.js';

function makeSession(overrides?: Partial<SessionState>): SessionState {
  return {
    schema_version: 'workspace.v1',
    session_id: 'test-session-123',
    domain_id: 'development-agent',
    depth: 'quick',
    status: 'completed',
    llm_provider: { name: 'ollama' },
    answers: {},
    ...overrides,
  } as SessionState;
}

function makeStructuredAnswers() {
  return {
    principles: [
      {
        statement: 'Clarity over completeness',
        priority: 1,
        rationale: 'Quick understanding matters',
        applies_to: ['*'],
        examples_good: ['Short, clear sentences'],
        examples_bad: ['Long, convoluted paragraphs'],
        source_dimension: 'communication',
      },
    ],
    tone: {
      voice_keywords: ['conversational', 'expert'],
      forbidden_phrases: ['synergy'],
      formatting_rules: ['Short paragraphs'],
      source_dimensions: ['voice'],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.8,
      cost_sensitivity: 0.3,
      autonomy_level: 0.4,
      source_dimensions: ['workflow'],
    },
    evidence_policy: {
      require_citations_for: ['statistics'],
      uncertainty_language_rules: ['Use "likely" not "definitely"'],
      source_dimensions: ['evidence'],
    },
    taboos: {
      never_do: ['Delete production data'],
      must_escalate: ['Security incidents'],
      source_dimensions: ['safety'],
    },
    domain_specific: {},
  };
}

describe('compileConstitution', () => {
  it('compiles from structured answers with principles', () => {
    const session = makeSession({
      structured_answers: makeStructuredAnswers(),
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.schema_version).toBe('constitution.v1');
    expect(result.generator_version).toBe('1.0.0');
    expect(result.principles).toHaveLength(1);
    expect(result.principles[0].statement).toBe('Clarity over completeness');
    expect(result.principles[0].rationale).toBe('Quick understanding matters');
  });

  it('compiles tone from structured answers', () => {
    const session = makeSession({
      structured_answers: makeStructuredAnswers(),
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.tone.voice_keywords).toContain('conversational');
    expect(result.tone.forbidden_phrases).toContain('synergy');
    expect(result.tone.formatting_rules).toContain('Short paragraphs');
  });

  it('compiles tradeoffs from structured answers', () => {
    const session = makeSession({
      structured_answers: makeStructuredAnswers(),
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.tradeoffs.autonomy_level).toBe(0.4);
    expect(result.tradeoffs.accuracy_vs_speed).toBe(0.8);
    expect(result.tradeoffs.cost_sensitivity).toBe(0.3);
  });

  it('compiles taboos from structured answers', () => {
    const session = makeSession({
      structured_answers: makeStructuredAnswers(),
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.taboos.never_do).toContain('Delete production data');
    expect(result.taboos.must_escalate).toContain('Security incidents');
  });

  it('compiles evidence policy from structured answers', () => {
    const session = makeSession({
      structured_answers: makeStructuredAnswers(),
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.evidence_policy.require_citations_for).toContain('statistics');
  });

  it('includes trace_map with session metadata', () => {
    const session = makeSession({
      structured_answers: makeStructuredAnswers(),
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.trace_map).toBeDefined();
    expect(result.trace_map!._session_id).toBe('test-session-123');
    expect(result.trace_map!._domain_id).toBe('development-agent');
  });

  it('preserves structured composition under the extension bag without adding top-level domain_specific', () => {
    const session = makeSession({
      structured_answers: {
        ...makeStructuredAnswers(),
        domain_specific: {
          code_review: {
            preferred_focus: 'Lead with correctness and regression risk.',
            review_depth: 'thorough',
          },
          deployment_safety: ['Confirm production deploys before acting.'],
        },
      },
      interview: {
        transcript: [
          {
            turn_number: 1,
            role: 'user',
            content: 'Raw transcript should not be copied into the extension.',
            timestamp: '2026-05-10T12:00:00.000Z',
          },
        ],
        dimension_coverage: [
          {
            dimension_id: 'code_review',
            status: 'covered',
            confidence: 1.8,
            confidence_threshold: 1.5,
            signals: [
              {
                weight: 1,
                source: 'explicit',
                turn_number: 1,
                excerpt: 'This raw excerpt should not be copied.',
              },
            ],
            anti_signals: ['Do not bury risk behind praise.'],
            summary: 'User wants risk-first code review.',
            extracted_facts: ['Lead with correctness issues.', 'Keep summaries brief.'],
            relevant_turns: [1, 2],
          },
          {
            dimension_id: 'deployment_safety',
            status: 'in_progress',
            confidence: 0.7,
            confidence_threshold: 1.5,
            signals: [],
            anti_signals: [],
            summary: 'Production changes need confirmation.',
            extracted_facts: ['Ask before deploying to prod.'],
            relevant_turns: [3],
          },
        ],
        is_complete: true,
        turn_count: 3,
      },
    });

    const result = compileConstitution(session, '1.0.0');

    expect((result as Record<string, unknown>).domain_specific).toBeUndefined();
    const composition = result.extensions?.['x-tastekit-composition'] as any;
    expect(composition).toMatchObject({
      schema_version: 'tastekit.composition.v1',
      mode: 'quick',
      domain_id: 'development-agent',
      domain_specific: {
        code_review: {
          preferred_focus: 'Lead with correctness and regression risk.',
          review_depth: 'thorough',
        },
        deployment_safety: ['Confirm production deploys before acting.'],
      },
    });
    expect(composition.dimensions.code_review).toEqual({
      dimension_id: 'code_review',
      status: 'covered',
      summary: 'User wants risk-first code review.',
      facts: ['Lead with correctness issues.', 'Keep summaries brief.'],
      anti_signals: ['Do not bury risk behind praise.'],
      confidence: 1.8,
      confidence_threshold: 1.5,
      source_turns: [1, 2],
    });
    expect(JSON.stringify(composition)).not.toContain('Raw transcript should not be copied');
    expect(JSON.stringify(composition)).not.toContain('This raw excerpt should not be copied');
    expect(result.trace_map?._domain_specific).toEqual({
      source_dimensions: ['code_review', 'deployment_safety'],
    });
  });

  it('preserves sanitized metacognitive state under the extension bag', () => {
    const session = makeSession({
      depth: 'operator',
      structured_answers: makeStructuredAnswers(),
      interview: {
        transcript: [
          {
            turn_number: 1,
            role: 'user',
            content: 'This raw metacognitive transcript should not be copied.',
            timestamp: '2026-05-10T12:00:00.000Z',
          },
        ],
        dimension_coverage: [],
        is_complete: true,
        turn_count: 12,
        metacognition: {
          schema_version: 'tastekit.metacognition.v1',
          depth: 'operator',
          public_depth_label: 'Full Taste Composition',
          domain_id: 'development-agent',
          coverage_summary: {
            critical: { total: 1, covered: 1, confirmed: 1, inferred: 0 },
            important: { total: 1, covered: 0, confirmed: 0, inferred: 1 },
            nice_to_have: { total: 0, covered: 0, confirmed: 0, inferred: 0 },
            inferable: { total: 0, covered: 0, confirmed: 0, inferred: 0 },
            total_dimensions: 2,
            covered_dimensions: 1,
          },
          unresolved_assumptions: [
            {
              id: 'inferred-style',
              dimension_id: 'style',
              summary: 'Likely prefers concise progress updates.',
              source: 'inferred',
              turn_number: 4,
            },
          ],
          conflicts: [],
          confirmation_checkpoints: [
            {
              id: 'draft-1',
              turn_number: 10,
              type: 'draft',
              dimension_ids: ['core'],
              accepted: true,
              summary: 'Draft accepted.',
            },
          ],
          fatigue_events: [
            {
              turn_number: 8,
              signal: 'terse replies',
              action: 'summarize',
            },
          ],
          policy_decisions: [
            {
              turn_number: 9,
              action: 'draft',
              target_dimension_ids: ['core', 'style'],
              reason_codes: ['full_draft_checkpoint_required'],
            },
          ],
          confirmed_dimension_ids: ['core'],
        },
      },
    });

    const result = compileConstitution(session, '0.2.0');
    const metacognition = result.extensions?.['x-tastekit-metacognition'] as any;

    expect(metacognition).toMatchObject({
      schema_version: 'tastekit.metacognition.v1',
      depth: 'operator',
      public_depth_label: 'Full Taste Composition',
      domain_id: 'development-agent',
    });
    expect(metacognition.unresolved_assumptions[0].summary).toBe('Likely prefers concise progress updates.');
    expect(metacognition.confirmation_checkpoints[0].accepted).toBe(true);
    expect(JSON.stringify(metacognition)).not.toContain('This raw metacognitive transcript should not be copied');
  });

  it('falls back to legacy flat answers', () => {
    const session = makeSession({
      answers: {
        goals: {
          primary_goal: 'Build great software',
          key_principles: 'Test everything, Keep it simple',
        },
        tone: {
          voice_keywords: ['direct'],
          forbidden_phrases: 'jargon, hype',
        },
        tradeoffs: {
          autonomy_level: 0.3,
          accuracy_vs_speed: 0.7,
        },
      },
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.principles.length).toBeGreaterThan(0);
    expect(result.principles[0].statement).toContain('Build great software');
    expect(result.tone.voice_keywords).toContain('direct');
  });

  it('synthesizes a fallback principle when legacy session is empty (so artifact validates)', () => {
    const session = makeSession({ answers: {} });
    const result = compileConstitution(session, '1.0.0');

    expect(result.schema_version).toBe('constitution.v1');
    expect(result.principles).toHaveLength(1);
    expect(result.principles[0].id).toBe('apply_user_taste');
    expect(result.principles[0].priority).toBe(1);
    expect(result.principles[0].statement).toBeTruthy();
  });

  it('Bug 3 (legacy path): legacy compiler also uses slug IDs, not numeric', () => {
    const session = makeSession({
      answers: {
        goals: {
          primary_goal: 'Build great software',
          key_principles: 'Test everything, Keep it simple',
        },
      },
    });
    const result = compileConstitution(session, '1.0.0');

    for (const p of result.principles) {
      expect(p.id).not.toMatch(/^principle_\d+$/);
    }
  });

  it('normalizes LLM priorities to 1..N by array order (defends against extraction bugs)', () => {
    const session = makeSession({
      structured_answers: {
        ...makeStructuredAnswers(),
        principles: [
          { statement: 'First', priority: 7, rationale: 'r1', applies_to: ['*'], source_dimension: 'd1' },
          { statement: 'Second', priority: 7, rationale: 'r2', applies_to: ['*'], source_dimension: 'd2' },
          { statement: 'Third', priority: 99, rationale: 'r3', applies_to: ['*'], source_dimension: 'd3' },
        ],
      },
    });
    const result = compileConstitution(session, '1.0.0');
    expect(result.principles.map(p => p.priority)).toEqual([1, 2, 3]);
  });

  it('synthesizes a fallback principle when structured extraction returns no principles', () => {
    const session = makeSession({
      structured_answers: {
        ...makeStructuredAnswers(),
        principles: [],
      },
    });

    const result = compileConstitution(session, '1.0.0');

    expect(result.principles).toHaveLength(1);
    expect(result.principles[0]).toMatchObject({
      id: 'apply_user_taste',
      priority: 1,
      applies_to: ['*'],
    });
    expect(result.trace_map?.apply_user_taste).toEqual({
      source_dimension: 'fallback_empty_principles',
    });
  });

  it('Bug 3: principle IDs are slugs of statement, not numeric indices', () => {
    const session = makeSession({
      structured_answers: {
        ...makeStructuredAnswers(),
        principles: [
          {
            statement: 'Clarity over completeness',
            priority: 1,
            rationale: 'r1',
            applies_to: ['*'],
            source_dimension: 'd1',
          },
          {
            statement: 'Show, don\'t tell',
            priority: 2,
            rationale: 'r2',
            applies_to: ['*'],
            source_dimension: 'd2',
          },
        ],
      },
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.principles[0].id).toBe('clarity_over_completeness');
    expect(result.principles[1].id).toBe('show_don_t_tell');
    expect(result.principles[0].id).not.toMatch(/^principle_\d+$/);
  });

  it('Bug 3: slug collisions get numeric suffix', () => {
    const session = makeSession({
      structured_answers: {
        ...makeStructuredAnswers(),
        principles: [
          { statement: 'Be clear', priority: 1, rationale: 'r1', applies_to: ['*'], source_dimension: 'd1' },
          { statement: 'be clear', priority: 2, rationale: 'r2', applies_to: ['*'], source_dimension: 'd2' },
          { statement: 'BE CLEAR!', priority: 3, rationale: 'r3', applies_to: ['*'], source_dimension: 'd3' },
        ],
      },
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.principles[0].id).toBe('be_clear');
    expect(result.principles[1].id).toBe('be_clear_2');
    expect(result.principles[2].id).toBe('be_clear_3');
  });

  it('Bug 3: non-alphanumeric statement falls back to a non-numeric ID (never `principle_N`)', () => {
    const session = makeSession({
      structured_answers: {
        ...makeStructuredAnswers(),
        principles: [
          { statement: '???', priority: 1, rationale: 'r1', applies_to: ['*'], source_dimension: 'd1' },
        ],
      },
    });
    const result = compileConstitution(session, '1.0.0');

    expect(result.principles[0].id).toBe('unnamed_principle_0');
    expect(result.principles[0].id).not.toMatch(/^principle_\d+$/);
  });
});
