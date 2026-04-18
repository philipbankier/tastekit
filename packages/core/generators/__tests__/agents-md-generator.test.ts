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
    },
    guardrails: {
      schema_version: 'guardrails.v1',
      permissions: [
        {
          scope_id: 'workspace-write',
          tool_ref: 'filesystem:write_file',
          resources: ['workspace/**'],
          ops: ['write'],
        },
      ],
      approvals: [
        {
          rule_id: 'approve_deploy',
          when: 'action.type == "deploy"',
          action: 'require_approval',
          channel: 'cli',
        },
      ],
      rate_limits: [
        {
          tool_ref: 'llm:generate',
          limit: 60,
          window: '1h',
        },
      ],
    } as any,
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

  it('includes guardrails permissions section', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).toContain('## Guardrails');
    expect(result).toContain('filesystem:write_file: allowed');
    expect(result).toContain('(write; resources: workspace/**)');
    expect(result).toContain('approve_deploy: require_approval when action.type == "deploy" via cli');
    expect(result).toContain('llm:generate: max 60/1h');
  });

  it('does not render undefined guardrail entries', () => {
    const result = generateAgentsMd(fullContext());
    expect(result).not.toContain('undefined');
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
