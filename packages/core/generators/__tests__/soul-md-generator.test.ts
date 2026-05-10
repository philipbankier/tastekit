import { describe, expect, it } from 'vitest';
import { generateSoulMd } from '../soul-md-generator.js';

describe('generateSoulMd', () => {
  it('wraps generated content in one TasteKit managed region', () => {
    const result = generateSoulMd({ generator_version: '1.0.0' });
    expect(result.match(/BEGIN TASTEKIT MANAGED REGION/g)).toHaveLength(1);
    expect(result.match(/END TASTEKIT MANAGED REGION/g)).toHaveLength(1);
  });

  it('generates SOUL.md with principles and tone', () => {
    const result = generateSoulMd({
      generator_version: '1.0.0',
      domain_id: 'development-agent',
      constitution: {
        schema_version: 'constitution.v1',
        generated_at: '2026-01-01T00:00:00.000Z',
        generator_version: '1.0.0',
        user_scope: 'single_user',
        principles: [
          { id: 'p1', statement: 'Clarity over completeness', priority: 1, applies_to: ['*'] },
        ],
        tone: {
          voice_keywords: ['conversational', 'expert'],
          forbidden_phrases: ['synergy'],
          formatting_rules: ['Use short paragraphs'],
        },
        tradeoffs: { autonomy_level: 0.3, accuracy_vs_speed: 0.8, cost_sensitivity: 0.5 },
        evidence_policy: {
          require_citations_for: ['statistics'],
          uncertainty_language_rules: ['Use "likely" not "definitely"'],
        },
        taboos: { never_do: ['Delete production data'], must_escalate: ['Decisions over $1M'] },
        trace_map: {},
        extensions: {
          'x-tastekit-composition': {
            schema_version: 'tastekit.composition.v1',
            mode: 'operator',
            domain_id: 'development-agent',
            domain_specific: {
              code_review: { preferred_focus: 'Lead with correctness and regression risk.' },
            },
            dimensions: {
              code_review: {
                dimension_id: 'code_review',
                status: 'covered',
                summary: 'User wants risk-first code review.',
                facts: ['Lead with correctness issues.'],
              },
            },
          },
        },
      },
    });
    expect(result).toContain('# SOUL.md');
    expect(result).toContain('Clarity over completeness');
    expect(result).toContain('conversational');
    expect(result).toContain('Autonomy: 0.3');
    expect(result).toContain('Delete production data');
    expect(result).toContain('## Taste Composition');
    expect(result).toContain('User wants risk-first code review.');
  });

  it('handles missing optional fields', () => {
    const result = generateSoulMd({ generator_version: '1.0.0' });
    expect(result).toContain('# SOUL.md');
    expect(result).not.toContain('## Principles');
  });
});
