import { describe, it, expect } from 'vitest';
import { compileConstitution } from '../constitution-compiler.js';
import { compileGuardrails } from '../guardrails-compiler.js';
import { compileMemoryPolicy } from '../memory-compiler.js';
import { ConstitutionV1Schema } from '../../schemas/constitution.js';
import { GuardrailsV1Schema } from '../../schemas/guardrails.js';
import { MemoryV1Schema } from '../../schemas/memory.js';
import { SessionState } from '../../schemas/workspace.js';

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    session_id: 'test-session',
    started_at: '2026-01-15T10:00:00.000Z',
    last_updated_at: '2026-01-15T10:05:00.000Z',
    depth: 'guided',
    current_step: 'done',
    completed_steps: ['intro', 'goals', 'tone', 'tradeoffs'],
    answers: {
      goals: {
        primary_goal: 'Help with code reviews',
        key_principles: 'Be thorough, Explain reasoning, Suggest improvements',
      },
      tone: {
        voice_keywords: ['professional', 'friendly'],
        forbidden_phrases: 'as an AI, I cannot',
      },
      tradeoffs: {
        accuracy_vs_speed: 0.8,
        autonomy_level: 0.3,
      },
    },
    ...overrides,
  };
}

// ─── Constitution Compiler ───

describe('compileConstitution', () => {
  it('produces valid constitution schema', () => {
    const session = makeSession();
    const constitution = compileConstitution(session, '0.5.0');
    const result = ConstitutionV1Schema.safeParse(constitution);
    expect(result.success).toBe(true);
  });

  it('includes primary goal as first principle', () => {
    const session = makeSession();
    const constitution = compileConstitution(session, '0.5.0');
    expect(constitution.principles[0].statement).toContain('Help with code reviews');
    expect(constitution.principles[0].priority).toBe(1);
  });

  it('splits key_principles by comma', () => {
    const session = makeSession();
    const constitution = compileConstitution(session, '0.5.0');
    // primary_goal + 3 comma-separated principles
    expect(constitution.principles.length).toBe(4);
    expect(constitution.principles[1].statement).toBe('Be thorough');
  });

  it('uses default tradeoffs when none provided', () => {
    const session = makeSession({
      answers: { goals: {}, tone: {} },
    });
    const constitution = compileConstitution(session, '0.5.0');
    expect(constitution.tradeoffs.accuracy_vs_speed).toBe(0.5);
    expect(constitution.tradeoffs.autonomy_level).toBe(0.5);
  });

  it('maps voice_keywords to tone', () => {
    const session = makeSession();
    const constitution = compileConstitution(session, '0.5.0');
    expect(constitution.tone.voice_keywords).toEqual(['professional', 'friendly']);
  });

  it('splits forbidden_phrases by comma', () => {
    const session = makeSession();
    const constitution = compileConstitution(session, '0.5.0');
    expect(constitution.tone.forbidden_phrases).toContain('as an AI');
    expect(constitution.tone.forbidden_phrases).toContain('I cannot');
  });

  it('sets generator_version from parameter', () => {
    const session = makeSession();
    const constitution = compileConstitution(session, '1.0.0');
    expect(constitution.generator_version).toBe('1.0.0');
  });

  it('handles empty goals gracefully', () => {
    const session = makeSession({ answers: {} });
    const constitution = compileConstitution(session, '0.5.0');
    expect(constitution.principles.length).toBe(0);
  });
});

// ─── Guardrails Compiler ───

describe('compileGuardrails', () => {
  it('produces valid guardrails schema', () => {
    const session = makeSession();
    const guardrails = compileGuardrails(session);
    const result = GuardrailsV1Schema.safeParse(guardrails);
    expect(result.success).toBe(true);
  });

  it('adds approve_all_writes for low autonomy (< 0.3)', () => {
    const session = makeSession({
      answers: { tradeoffs: { autonomy_level: 0.2 } },
    });
    const guardrails = compileGuardrails(session);
    const writeRule = guardrails.approvals.find(a => a.rule_id === 'approve_all_writes');
    expect(writeRule).toBeDefined();
    expect(writeRule!.action).toBe('require_approval');
  });

  it('adds approve_writes_and_deletes for low-medium autonomy (0.3-0.5)', () => {
    const session = makeSession({
      answers: { tradeoffs: { autonomy_level: 0.35 } },
    });
    const guardrails = compileGuardrails(session);
    const writesDeletesRule = guardrails.approvals.find(a => a.rule_id === 'approve_writes_and_deletes');
    expect(writesDeletesRule).toBeDefined();
    const allWritesRule = guardrails.approvals.find(a => a.rule_id === 'approve_all_writes');
    expect(allWritesRule).toBeUndefined();
  });

  it('adds approve_destructive for medium autonomy (0.5-0.7)', () => {
    const session = makeSession({
      answers: { tradeoffs: { autonomy_level: 0.5 } },
    });
    const guardrails = compileGuardrails(session);
    const destructiveRule = guardrails.approvals.find(a => a.rule_id === 'approve_destructive');
    expect(destructiveRule).toBeDefined();
    const writeRule = guardrails.approvals.find(a => a.rule_id === 'approve_all_writes');
    expect(writeRule).toBeUndefined();
  });

  it('only has high-risk rule for high autonomy (>= 0.7)', () => {
    const session = makeSession({
      answers: { tradeoffs: { autonomy_level: 0.9 } },
    });
    const guardrails = compileGuardrails(session);
    expect(guardrails.approvals.length).toBe(1);
    expect(guardrails.approvals[0].rule_id).toBe('approve_high_risk');
  });

  it('always includes approve_high_risk rule', () => {
    for (const level of [0.1, 0.5, 0.9]) {
      const session = makeSession({
        answers: { tradeoffs: { autonomy_level: level } },
      });
      const guardrails = compileGuardrails(session);
      const highRisk = guardrails.approvals.find(a => a.rule_id === 'approve_high_risk');
      expect(highRisk).toBeDefined();
    }
  });

  it('includes default rate limit', () => {
    const session = makeSession();
    const guardrails = compileGuardrails(session);
    expect(guardrails.rate_limits.length).toBe(1);
    expect(guardrails.rate_limits[0].tool_ref).toBe('*:*');
    expect(guardrails.rate_limits[0].limit).toBe(100);
  });
});

// ─── Memory Policy Compiler ───

describe('compileMemoryPolicy', () => {
  it('produces valid memory schema', () => {
    const session = makeSession();
    const memory = compileMemoryPolicy(session);
    const result = MemoryV1Schema.safeParse(memory);
    expect(result.success).toBe(true);
  });

  it('has default store', () => {
    const session = makeSession();
    const memory = compileMemoryPolicy(session);
    expect(memory.stores.length).toBe(1);
    expect(memory.stores[0].store_id).toBe('default');
  });

  it('includes salience rules for preferences, corrections, feedback', () => {
    const session = makeSession();
    const memory = compileMemoryPolicy(session);
    const ruleIds = memory.write_policy.salience_rules.map(r => r.rule_id);
    expect(ruleIds).toContain('user_preferences');
    expect(ruleIds).toContain('corrections');
    expect(ruleIds).toContain('feedback');
  });

  it('corrections have highest salience', () => {
    const session = makeSession();
    const memory = compileMemoryPolicy(session);
    const corrections = memory.write_policy.salience_rules.find(r => r.rule_id === 'corrections');
    expect(corrections!.score).toBe(0.95);
  });

  it('uses revise mode for low autonomy', () => {
    const session = makeSession();
    const memory = compileMemoryPolicy(session);
    // autonomy_level 0.3 → revise (conservative; consolidate requires >= 0.6)
    expect(memory.write_policy.update_mode).toBe('revise');
  });

  it('uses consolidate mode for high autonomy', () => {
    const session = makeSession({
      answers: {
        goals: { primary_goal: 'Help with code', key_principles: 'Be fast' },
        tone: { voice_keywords: ['casual'], forbidden_phrases: '' },
        tradeoffs: { accuracy_vs_speed: 0.5, autonomy_level: 0.8 },
      },
    });
    const memory = compileMemoryPolicy(session);
    expect(memory.write_policy.update_mode).toBe('consolidate');
  });

  it('sets 90-day TTL with least_salient pruning', () => {
    const session = makeSession();
    const memory = compileMemoryPolicy(session);
    expect(memory.retention_policy.ttl_days).toBe(90);
    expect(memory.retention_policy.prune_strategy).toBe('least_salient');
  });
});
