import { describe, expect, it } from 'vitest';
import { validateStructuredAnswers, formatIssuesForRetryPrompt } from '../extraction-validator.js';
import type { StructuredAnswers } from '../interviewer.js';

function clean(): StructuredAnswers {
  return {
    principles: [
      {
        statement: 'Clarity over completeness',
        rationale: 'Quick understanding lets the user act',
        priority: 1,
        applies_to: ['*'],
        examples_good: ['Short bullet lists when summarizing'],
        examples_bad: ['Walls of unbroken prose'],
        source_dimension: 'communication_style',
      },
      {
        statement: 'Cite sources for factual claims',
        rationale: 'Trust comes from being able to verify',
        priority: 2,
        applies_to: ['research'],
        examples_good: ['Inline links for stats'],
        examples_bad: ['Unattributed numbers'],
        source_dimension: 'evidence_policy',
      },
    ],
    tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [], source_dimensions: [] },
    tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5, source_dimensions: [] },
    evidence_policy: { require_citations_for: [], uncertainty_language_rules: [], source_dimensions: [] },
    taboos: { never_do: [], must_escalate: [], source_dimensions: [] },
    domain_specific: {},
  };
}

describe('validateStructuredAnswers', () => {
  it('returns no issues for a clean extraction', () => {
    expect(validateStructuredAnswers(clean())).toEqual([]);
  });

  it('Bug 2: flags duplicate principle rationale', () => {
    const sa = clean();
    sa.principles[1].rationale = sa.principles[0].rationale;
    const issues = validateStructuredAnswers(sa);
    expect(issues.some(i => i.code === 'duplicate_principle_rationale')).toBe(true);
  });

  it('Bug 2: case- and whitespace-insensitive duplicate detection', () => {
    const sa = clean();
    sa.principles[0].rationale = '  Trust comes from verification  ';
    sa.principles[1].rationale = 'TRUST COMES FROM VERIFICATION';
    expect(validateStructuredAnswers(sa).some(i => i.code === 'duplicate_principle_rationale')).toBe(true);
  });

  it('Bug 4: flags literal "dim_id" placeholder', () => {
    const sa = clean();
    sa.principles[0].source_dimension = 'dim_id';
    const issues = validateStructuredAnswers(sa);
    expect(issues.some(i => i.code === 'literal_dim_id_placeholder')).toBe(true);
  });

  it('Bug 4: real dimension ids pass', () => {
    const sa = clean();
    sa.principles[0].source_dimension = 'communication_style';
    expect(validateStructuredAnswers(sa).find(i => i.code === 'literal_dim_id_placeholder')).toBeUndefined();
  });

  it('Bug 5: flags escalation language landing in never_do with empty must_escalate', () => {
    const sa = clean();
    sa.taboos.never_do = ['Ask before deploying to production'];
    sa.taboos.must_escalate = [];
    const issues = validateStructuredAnswers(sa);
    expect(issues.some(i => i.code === 'escalation_in_never_do')).toBe(true);
  });

  it('Bug 5: detects "require approval" / "escalate" / "check with" hints', () => {
    for (const phrase of [
      'Require approval for refunds',
      'Escalate any data deletion request',
      'Check with the user before posting publicly',
    ]) {
      const sa = clean();
      sa.taboos.never_do = [phrase];
      sa.taboos.must_escalate = [];
      const issues = validateStructuredAnswers(sa);
      expect(issues.some(i => i.code === 'escalation_in_never_do')).toBe(true);
    }
  });

  it('Bug 5: flags escalation language in never_do even when must_escalate is non-empty', () => {
    const sa = clean();
    sa.taboos.never_do = ['Hard delete production data', 'Ask before deploying to prod'];
    sa.taboos.must_escalate = ['Production deploys'];
    const issues = validateStructuredAnswers(sa);
    expect(issues.some(i => i.code === 'escalation_in_never_do')).toBe(true);
  });

  it('Bug 5: does not flag when never_do has no escalation language', () => {
    const sa = clean();
    sa.taboos.never_do = ['Hard delete production data', 'Share customer PII'];
    sa.taboos.must_escalate = [];
    const issues = validateStructuredAnswers(sa);
    expect(issues.find(i => i.code === 'escalation_in_never_do')).toBeUndefined();
  });

  it('Bug 6: flags identical examples_good arrays across principles', () => {
    const sa = clean();
    sa.principles[1].examples_good = [...(sa.principles[0].examples_good ?? [])];
    const issues = validateStructuredAnswers(sa);
    expect(issues.some(i => i.code === 'duplicate_examples_good')).toBe(true);
  });

  it('Bug 6: order-insensitive — same items in different order still flagged', () => {
    const sa = clean();
    sa.principles[0].examples_good = ['A', 'B', 'C'];
    sa.principles[1].examples_good = ['C', 'A', 'B'];
    expect(validateStructuredAnswers(sa).some(i => i.code === 'duplicate_examples_good')).toBe(true);
  });

  it('flags empty principles', () => {
    const sa = clean();
    sa.principles = [];
    expect(validateStructuredAnswers(sa).some(i => i.code === 'empty_principles')).toBe(true);
  });

  it('flags domain_specific when it is not an object record', () => {
    const sa = clean();
    (sa as any).domain_specific = ['not', 'a', 'record'];
    expect(validateStructuredAnswers(sa).some(i => i.code === 'invalid_domain_specific')).toBe(true);
  });

  it('flags placeholder domain_specific keys instead of preserving them', () => {
    const sa = clean();
    sa.domain_specific = {
      dim_id: { preference: 'Use the actual dimension id.' },
      dimension_id: { preference: 'Also a placeholder.' },
    };
    const issues = validateStructuredAnswers(sa);
    expect(issues.some(i => i.code === 'placeholder_domain_specific_key')).toBe(true);
  });

  it('flags repeated generic filler inside domain_specific values', () => {
    const sa = clean();
    sa.domain_specific = {
      code_review: { summary: 'User preferences and requirements should be followed.' },
      testing: { summary: 'User preferences and requirements should be followed.' },
    };
    expect(validateStructuredAnswers(sa).some(i => i.code === 'generic_domain_specific_filler')).toBe(true);
  });
});

describe('formatIssuesForRetryPrompt', () => {
  it('returns empty string when no issues', () => {
    expect(formatIssuesForRetryPrompt([])).toBe('');
  });

  it('formats issues as a numbered list with codes', () => {
    const out = formatIssuesForRetryPrompt([
      { code: 'duplicate_principle_rationale', message: 'msg1' },
      { code: 'literal_dim_id_placeholder', message: 'msg2' },
    ]);
    expect(out).toContain('1. [duplicate_principle_rationale] msg1');
    expect(out).toContain('2. [literal_dim_id_placeholder] msg2');
    expect(out).toContain('Return only the corrected JSON');
  });
});
