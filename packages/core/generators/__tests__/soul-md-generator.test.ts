import { describe, expect, it } from 'vitest';
import { generateSoulMd } from '../soul-md-generator.js';

describe('generateSoulMd', () => {
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
      },
    });
    expect(result).toContain('# SOUL.md');
    expect(result).toContain('Clarity over completeness');
    expect(result).toContain('conversational');
    expect(result).toContain('Autonomy: 0.3');
    expect(result).toContain('Delete production data');
  });

  it('handles missing optional fields', () => {
    const result = generateSoulMd({ generator_version: '1.0.0' });
    expect(result).toContain('# SOUL.md');
    expect(result).not.toContain('## Principles');
  });
});
