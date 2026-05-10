import { describe, expect, it } from 'vitest';
import { generateAgentsMd } from '../agents-md-generator.js';
import type { GeneratorContext } from '../types.js';

function fullContext(): GeneratorContext {
  return {
    generator_version: '1.0.0',
    domain_id: 'development-agent',
    constitution: {
      schema_version: 'constitution.v1',
      generated_at: '2026-01-01T00:00:00.000Z',
      generator_version: '1.0.0',
      user_scope: 'single_user',
      principles: [
        { id: 'clarity', statement: 'Prioritize clarity', priority: 1, applies_to: ['*'] },
        { id: 'cite', statement: 'Always cite sources', priority: 2, applies_to: ['research'] },
      ],
      tone: {
        voice_keywords: ['conversational', 'expert'],
        forbidden_phrases: ['synergy', 'circle back'],
        formatting_rules: [],
      },
      tradeoffs: { autonomy_level: 0.4, accuracy_vs_speed: 0.8, cost_sensitivity: 0.3 },
      evidence_policy: { require_citations_for: ['statistics'], uncertainty_language_rules: [] },
      taboos: { never_do: ['Delete production data'], must_escalate: ['Security incidents'] },
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
    guardrails: {
      schema_version: 'guardrails.v1',
      permissions: [
        {
          scope_id: 'fs_write_src',
          tool_ref: 'fs:write',
          resources: ['src/**'],
          ops: ['write'],
        },
        {
          scope_id: 'deploy_prod',
          tool_ref: 'deploy:prod',
          resources: [],
          ops: ['execute'],
        },
      ],
      approvals: [
        {
          rule_id: 'approve_deploy',
          when: 'tool == "deploy:prod"',
          action: 'require_approval',
          channel: 'cli',
        },
      ],
      rate_limits: [
        { tool_ref: 'fs:write', limit: 100, window: '1h' },
      ],
    },
    skills: {
      schema_version: 'skills_manifest.v1',
      skills: [
        {
          skill_id: 'code-review',
          name: 'Code Review',
          description: 'Review code for quality',
          tags: ['dev'],
          risk_level: 'low',
          required_tools: [],
          compatible_runtimes: ['*'],
        },
      ],
    },
  };
}

describe('generateAgentsMd', () => {
  it('wraps generated content in one TasteKit managed region', () => {
    const result = generateAgentsMd(fullContext());
    expect(result.match(/BEGIN TASTEKIT MANAGED REGION/g)).toHaveLength(1);
    expect(result.match(/END TASTEKIT MANAGED REGION/g)).toHaveLength(1);
  });

  it('generates header with version', () => {
    const result = generateAgentsMd({ generator_version: '1.0.0' });
    expect(result).toContain('# AGENTS.md');
    expect(result).toContain('TasteKit v1.0.0');
  });

  it('includes principles section', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('## Principles');
    expect(result).toContain('**clarity**: Prioritize clarity');
    expect(result).toContain('**cite**: Always cite sources');
  });

  it('includes guardrails permissions section with real schema fields', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('## Guardrails');
    expect(result).toContain('### Permissions');
    expect(result).toContain('`fs:write` (write) on `src/**` — scope: `fs_write_src`');
    expect(result).toContain('`deploy:prod` (execute) on `*` — scope: `deploy_prod`');
    expect(result).not.toContain('undefined');
  });

  it('includes approval rules subsection', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('### Approval rules');
    expect(result).toContain('**approve_deploy**');
    expect(result).toContain('require_approval');
    expect(result).toContain('via cli');
  });

  it('includes rate limits subsection', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('### Rate limits');
    expect(result).toContain('`fs:write` — max 100/1h');
  });

  it('does not emit literal "undefined" anywhere in output (Bug 1 regression)', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).not.toMatch(/undefined/);
  });

  it('includes tone & voice section', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('## Tone & Voice');
    expect(result).toContain('conversational, expert');
    expect(result).toContain('"synergy"');
  });

  it('includes behavior section with autonomy level', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('## Behavior');
    expect(result).toContain('Autonomy level: 0.4');
  });

  it('includes restrictions from taboos', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('## Restrictions');
    expect(result).toContain('Delete production data');
  });

  it('includes skills listing', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('## Skills');
    expect(result).toContain('**Code Review**');
    expect(result).toContain('`code-review`');
  });

  it('summarizes composition extension for runtime agents', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('## Taste Composition');
    expect(result).toContain('Full Taste Composition');
    expect(result).toContain('User wants risk-first code review.');
  });

  it('omits sections for empty constitution', () => {
    const result = generateAgentsMd({
      generator_version: '1.0.0',
      constitution: {
        schema_version: 'constitution.v1',
        generated_at: '',
        generator_version: '1.0.0',
        user_scope: 'single_user',
        principles: [],
        tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [] },
        tradeoffs: { autonomy_level: undefined as any, accuracy_vs_speed: 0.5, cost_sensitivity: 0.5 },
        evidence_policy: { require_citations_for: [], uncertainty_language_rules: [] },
        taboos: { never_do: [], must_escalate: [] },
      },
    });
    expect(result).not.toContain('## Principles');
    expect(result).not.toContain('## Restrictions');
  });

  it('handles empty context (version only)', () => {
    const result = generateAgentsMd({ generator_version: '0.5.0' });
    expect(result).toContain('# AGENTS.md');
    expect(result).toContain('TasteKit v0.5.0');
    expect(result).not.toContain('## Principles');
  });
});
