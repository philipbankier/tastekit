import { describe, it, expect } from 'vitest';
import { compileGuardrails } from '../guardrails-compiler.js';
import { GuardrailsV1Schema } from '../../schemas/guardrails.js';
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
    principles: [
      {
        statement: 'Be helpful',
        rationale: 'Core principle',
        priority: 1,
        applies_to: ['*'],
        source_dimension: 'core-values',
      },
    ],
    tone: {
      voice_keywords: ['professional'],
      forbidden_phrases: [],
      formatting_rules: [],
      source_dimensions: [],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.7,
      cost_sensitivity: 0.5,
      autonomy_level: 0.5,
      source_dimensions: [],
    },
    evidence_policy: {
      require_citations_for: ['facts'],
      uncertainty_language_rules: [],
      source_dimensions: [],
    },
    taboos: {
      never_do: [],
      must_escalate: [],
      source_dimensions: [],
    },
    domain_specific: {},
    ...overrides,
  };
}

// ─── Schema Validation ───

describe('compileGuardrails', () => {
  it('produces valid schema from legacy session', () => {
    const session = makeSession();
    const result = compileGuardrails(session);
    expect(GuardrailsV1Schema.safeParse(result).success).toBe(true);
  });

  it('produces valid schema from structured answers', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({
      structured_answers: sa,
      domain_id: 'content-agent',
    });
    const result = compileGuardrails(session);
    expect(GuardrailsV1Schema.safeParse(result).success).toBe(true);
  });

  // ─── Autonomy Levels ───

  it('low autonomy requires approval for all writes', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.2, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileGuardrails(session);
    const writeApproval = result.approvals.find(a => a.rule_id === 'approve_all_writes');
    expect(writeApproval).toBeDefined();
    expect(writeApproval!.action).toBe('require_approval');
  });

  it('medium autonomy only requires approval for destructive actions', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileGuardrails(session);
    // autonomy 0.5 is >= 0.5 so falls to the < 0.7 tier: approve_destructive
    const destructiveApproval = result.approvals.find(a => a.rule_id === 'approve_destructive');
    expect(destructiveApproval).toBeDefined();
  });

  it('high autonomy skips domain-specific approval rules', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.9, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileGuardrails(session);
    const publishApproval = result.approvals.find(a => a.rule_id === 'approve_publish');
    expect(publishApproval).toBeUndefined();
  });

  it('always includes high-risk approval rule', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.9, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileGuardrails(session);
    const highRisk = result.approvals.find(a => a.rule_id === 'approve_high_risk');
    expect(highRisk).toBeDefined();
  });

  // ─── Domain-Specific ───

  it('content-agent gets publish approval and content permissions', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileGuardrails(session);
    expect(result.permissions.some(p => p.scope_id === 'content_publish')).toBe(true);
    expect(result.approvals.some(a => a.rule_id === 'approve_publish')).toBe(true);
  });

  it('sales-agent gets CRM and outreach permissions', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'sales-agent' });
    const result = compileGuardrails(session);
    expect(result.permissions.some(p => p.scope_id === 'crm_read')).toBe(true);
    expect(result.permissions.some(p => p.scope_id === 'outreach')).toBe(true);
  });

  it('development-agent gets code read/write/execute permissions', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'development-agent' });
    const result = compileGuardrails(session);
    expect(result.permissions.some(p => p.scope_id === 'code_read')).toBe(true);
    expect(result.permissions.some(p => p.scope_id === 'code_execute')).toBe(true);
  });

  // ─── Taboo Integration ───

  it('taboos generate block rules', () => {
    const sa = makeStructuredAnswers({
      taboos: {
        never_do: ['share personal data'],
        must_escalate: ['financial decisions'],
        source_dimensions: [],
      },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileGuardrails(session);
    const blockRule = result.approvals.find(a => a.action === 'block');
    expect(blockRule).toBeDefined();
    expect(blockRule!.rule_id).toContain('block_taboo');
  });

  it('must_escalate items generate approval rules', () => {
    const sa = makeStructuredAnswers({
      taboos: {
        never_do: [],
        must_escalate: ['financial transactions'],
        source_dimensions: [],
      },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileGuardrails(session);
    const escalationRule = result.approvals.find(a => a.rule_id.startsWith('escalate_'));
    expect(escalationRule).toBeDefined();
    expect(escalationRule!.action).toBe('require_approval');
  });

  // ─── Rate Limits ───

  it('high cost sensitivity reduces rate limits', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.9, autonomy_level: 0.5, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileGuardrails(session);
    const globalLimit = result.rate_limits.find(r => r.tool_ref === '*:*');
    expect(globalLimit!.limit).toBeLessThan(100);
  });

  it('low autonomy adds per-operation rate limits', () => {
    const sa = makeStructuredAnswers({
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.3, source_dimensions: [] },
    });
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileGuardrails(session);
    expect(result.rate_limits.length).toBeGreaterThan(1);
    expect(result.rate_limits.some(r => r.tool_ref === '*:delete')).toBe(true);
  });

  // ─── Rollback ───

  it('content-agent includes rollback playbook', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'content-agent' });
    const result = compileGuardrails(session);
    expect(result.rollback).toBeDefined();
    expect(result.rollback!.playbook_ref).toBe('content-rollback');
  });

  it('general-agent has no rollback playbook', () => {
    const sa = makeStructuredAnswers();
    const session = makeSession({ structured_answers: sa, domain_id: 'general-agent' });
    const result = compileGuardrails(session);
    expect(result.rollback).toBeUndefined();
  });

  // ─── Legacy Path ───

  it('legacy session uses domain presets', () => {
    const session = makeSession({ domain_id: 'sales-agent' });
    const result = compileGuardrails(session);
    expect(result.permissions.some(p => p.scope_id === 'crm_read')).toBe(true);
  });
});
