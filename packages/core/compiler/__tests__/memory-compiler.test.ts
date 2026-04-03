import { describe, it, expect } from 'vitest';
import { compileMemoryPolicy } from '../memory-compiler.js';
import { MemoryV1Schema } from '../../schemas/memory.js';
import { SessionState } from '../../schemas/workspace.js';
import { StructuredAnswers } from '../../interview/interviewer.js';

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    session_id: 'test-session',
    started_at: '2026-01-15T10:00:00.000Z',
    last_updated_at: '2026-01-15T10:05:00.000Z',
    depth: 'guided',
    current_step: 'done',
    completed_steps: ['intro', 'goals', 'tone', 'tradeoffs'],
    answers: {
      tradeoffs: { autonomy_level: 0.5 },
    },
    ...overrides,
  };
}

function makeStructuredAnswers(overrides: Partial<StructuredAnswers> = {}): StructuredAnswers {
  return {
    principles: [],
    tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [], source_dimensions: [] },
    tradeoffs: {
      accuracy_vs_speed: 0.5,
      cost_sensitivity: 0.5,
      autonomy_level: 0.5,
      source_dimensions: [],
    },
    evidence_policy: { require_citations_for: [], uncertainty_language_rules: [], source_dimensions: [] },
    taboos: { never_do: [], must_escalate: [], source_dimensions: [] },
    domain_specific: {},
    ...overrides,
  };
}

// ─── Schema Validation ───

describe('compileMemoryPolicy', () => {
  it('produces valid schema from legacy session', () => {
    const session = makeSession();
    const result = compileMemoryPolicy(session);
    expect(MemoryV1Schema.safeParse(result).success).toBe(true);
  });

  it('produces valid schema from structured answers', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileMemoryPolicy(session);
    expect(MemoryV1Schema.safeParse(result).success).toBe(true);
  });

  // ─── Shared Rules ───

  it('always includes shared salience rules', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileMemoryPolicy(session);
    const ruleIds = result.write_policy.salience_rules.map(r => r.rule_id);
    expect(ruleIds).toContain('user_preferences');
    expect(ruleIds).toContain('corrections');
    expect(ruleIds).toContain('feedback');
  });

  // ─── Domain-Specific Salience ───

  it('content-agent includes brand voice salience rules', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileMemoryPolicy(session);
    const ruleIds = result.write_policy.salience_rules.map(r => r.rule_id);
    expect(ruleIds).toContain('brand_voice');
    expect(ruleIds).toContain('audience_signals');
  });

  it('sales-agent includes deal and relationship rules', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'sales-agent' });
    const result = compileMemoryPolicy(session);
    const ruleIds = result.write_policy.salience_rules.map(r => r.rule_id);
    expect(ruleIds).toContain('deal_context');
    expect(ruleIds).toContain('customer_relationship');
  });

  it('development-agent includes code and bug context rules', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'development-agent' });
    const result = compileMemoryPolicy(session);
    const ruleIds = result.write_policy.salience_rules.map(r => r.rule_id);
    expect(ruleIds).toContain('code_patterns');
    expect(ruleIds).toContain('bug_context');
  });

  it('research-agent includes source quality and methodology rules', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'research-agent' });
    const result = compileMemoryPolicy(session);
    const ruleIds = result.write_policy.salience_rules.map(r => r.rule_id);
    expect(ruleIds).toContain('source_quality');
    expect(ruleIds).toContain('methodology');
  });

  // ─── PII Handling ───

  it('sales-agent enables PII redaction by default', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'sales-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.write_policy.pii_handling.redact).toBe(true);
    expect(result.write_policy.pii_handling.store_separately).toBe(true);
  });

  it('development-agent does not redact PII by default', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'development-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.write_policy.pii_handling.redact).toBe(false);
  });

  it('PII taboos trigger redaction even for non-sensitive domains', () => {
    const sa = makeStructuredAnswers({
      taboos: {
        never_do: ['Share personal information without consent'],
        must_escalate: [],
        source_dimensions: [],
      },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.write_policy.pii_handling.redact).toBe(true);
  });

  // ─── Retention ───

  it('high cost sensitivity shortens retention', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.9, autonomy_level: 0.5, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.retention_policy.ttl_days!).toBeLessThan(90);
  });

  it('low cost sensitivity extends retention', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.1, autonomy_level: 0.5, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.retention_policy.ttl_days!).toBeGreaterThan(90);
  });

  it('research-agent has longer default retention than content-agent', () => {
    const sa = makeStructuredAnswers();
    const contentSession = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const researchSession = makeSession({ structured_answers: sa, domain_id: 'research-agent' });
    const contentResult = compileMemoryPolicy(contentSession);
    const researchResult = compileMemoryPolicy(researchSession);
    expect(researchResult.retention_policy.ttl_days!).toBeGreaterThan(contentResult.retention_policy.ttl_days!);
  });

  // ─── Update Mode ───

  it('high autonomy uses consolidate mode', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.8, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.write_policy.update_mode).toBe('consolidate');
  });

  it('low autonomy uses revise mode', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.3, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.write_policy.update_mode).toBe('revise');
  });

  // ─── Domain-Specific Revisit Triggers ───

  it('content-agent includes brand_drift trigger', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.write_policy.revisit_triggers).toContain('brand_drift');
  });

  it('support-agent includes escalation trigger', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'support-agent' });
    const result = compileMemoryPolicy(session);
    expect(result.write_policy.revisit_triggers).toContain('escalation');
  });

  // ─── Legacy Path ───

  it('legacy session uses domain defaults', () => {
    const session = makeSession({ domain_id: 'sales-agent' });
    const result = compileMemoryPolicy(session);
    const ruleIds = result.write_policy.salience_rules.map(r => r.rule_id);
    expect(ruleIds).toContain('deal_context');
    expect(result.write_policy.pii_handling.redact).toBe(true);
  });
});
