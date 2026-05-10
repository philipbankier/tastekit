import { describe, expect, it } from 'vitest';
import { validateConstitutionArtifact } from '../src/index.js';

function validConstitution() {
  return {
    schema_version: 'constitution.v1',
    generated_at: '2026-05-01T00:00:00.000Z',
    generator_version: '1.0.0',
    user_scope: 'single_user',
    principles: [
      {
        id: 'clarity',
        priority: 1,
        statement: 'Prioritize clarity.',
        rationale: 'Clear artifacts prevent avoidable implementation drift.',
        applies_to: ['*'],
        examples_good: ['State assumptions before executing.'],
      },
      {
        id: 'evidence',
        priority: 2,
        statement: 'Ground claims in evidence.',
        rationale: 'Evidence keeps agent work inspectable and correctable.',
        applies_to: ['*'],
        examples_good: ['Cite the file or command behind a claim.'],
      },
    ],
    tone: {
      voice_keywords: ['direct', 'pragmatic'],
      forbidden_phrases: [],
      formatting_rules: ['Use short sections.'],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.8,
      cost_sensitivity: 0.4,
      autonomy_level: 0.6,
    },
    evidence_policy: {
      require_citations_for: ['facts'],
      uncertainty_language_rules: ['Say when a claim is inferred.'],
    },
    taboos: {
      never_do: ['Invent facts.'],
      must_escalate: ['Destructive production changes.'],
    },
  };
}

describe('validateConstitutionArtifact', () => {
  it('accepts a valid constitution artifact', () => {
    const result = validateConstitutionArtifact(validConstitution());

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects duplicate priorities and gapped priorities through the Zod layer', () => {
    const data = validConstitution();
    data.principles[1].priority = 3;

    const result = validateConstitutionArtifact(data);

    expect(result.ok).toBe(false);
    expect(result.issues.some(issue => issue.code === 'zod')).toBe(true);
  });

  it('rejects duplicate principle ids through the Zod layer', () => {
    const data = validConstitution();
    data.principles[1].id = data.principles[0].id;

    const result = validateConstitutionArtifact(data);

    expect(result.ok).toBe(false);
    expect(result.issues.some(issue => issue.path === 'principles.1.id')).toBe(true);
  });

  it('catches repeated rationales and examples from known extraction failures', () => {
    const data = validConstitution();
    data.principles[1].rationale = data.principles[0].rationale;
    data.principles[1].examples_good = data.principles[0].examples_good;

    const result = validateConstitutionArtifact(data);

    expect(result.ok).toBe(false);
    expect(result.issues.map(issue => issue.code)).toContain('duplicate_principle_rationale');
    expect(result.issues.map(issue => issue.code)).toContain('duplicate_examples_good');
  });

  it('catches escalation language in never_do as a semantic extraction failure', () => {
    const data = validConstitution();
    data.taboos.never_do = ['Ask before running destructive migrations.'];

    const result = validateConstitutionArtifact(data);

    expect(result.ok).toBe(false);
    expect(result.issues.map(issue => issue.code)).toContain('escalation_in_never_do');
  });
});
