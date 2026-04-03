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

  it('handles empty session answers gracefully', () => {
    const session = makeSession({ answers: {} });
    const result = compileConstitution(session, '1.0.0');

    expect(result.schema_version).toBe('constitution.v1');
    expect(result.principles).toBeDefined();
    expect(result.tone).toBeDefined();
    expect(result.tradeoffs).toBeDefined();
  });
});
