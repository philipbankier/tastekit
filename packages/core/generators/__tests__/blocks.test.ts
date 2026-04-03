import { describe, expect, it } from 'vitest';
import type { GeneratorContext } from '../types.js';
import { identityBlock } from '../blocks/identity.js';
import { guardrailsBlock } from '../blocks/guardrails.js';
import { skillsIndexBlock } from '../blocks/skills-index.js';
import { sessionRhythmBlock } from '../blocks/session-rhythm.js';
import { memoryPolicyBlock } from '../blocks/memory-policy.js';
import { toolUsageBlock } from '../blocks/tool-usage.js';
import { driftAwarenessBlock } from '../blocks/drift-awareness.js';
import { domainContextBlock } from '../blocks/domain-context.js';
import { playbookIndexBlock } from '../blocks/playbook-index.js';
import { vocabularyBlock } from '../blocks/vocabulary.js';
import { evaluationCriteriaBlock } from '../blocks/evaluation-criteria.js';

function makeContext(): GeneratorContext {
  return {
    generator_version: '0.5.0',
    domain_id: 'development-agent',
    has_playbooks: true,
    has_evalpack: true,
    vocabulary: {
      principles_heading: 'Principles',
      skill_label: 'Capability',
      playbook_label: 'Runbook',
      drift_verb: 'Standards drift',
    },
    constitution: {
      schema_version: 'constitution.v1',
      generated_at: '2026-01-01T00:00:00.000Z',
      generator_version: '0.5.0',
      user_scope: 'single_user',
      principles: [
        {
          id: 'p1',
          priority: 1,
          statement: 'Prioritize correctness',
          rationale: 'Production safety matters',
          applies_to: ['*'],
        },
      ],
      tone: {
        voice_keywords: ['clear', 'direct'],
        forbidden_phrases: ['as an AI'],
        formatting_rules: ['Use bullet points'],
      },
      tradeoffs: {
        accuracy_vs_speed: 0.8,
        cost_sensitivity: 0.3,
        autonomy_level: 0.75,
      },
      evidence_policy: {
        require_citations_for: ['facts'],
        uncertainty_language_rules: ['Say likely when uncertain'],
      },
      taboos: {
        never_do: ['Delete production data'],
        must_escalate: ['Schema migrations'],
      },
    } as any,
    guardrails: {
      schema_version: 'guardrails.v1',
      permissions: [
        {
          scope_id: 'perm_read',
          tool_ref: 'repo:read',
          resources: ['*'],
          ops: ['read'],
        },
      ],
      approvals: [
        {
          rule_id: 'approve_writes',
          when: 'write',
          action: 'require_approval',
          channel: 'cli',
        },
      ],
      rate_limits: [
        {
          tool_ref: 'repo:read',
          limit: 10,
          window: '1h',
        },
      ],
    } as any,
    memory: {
      schema_version: 'memory.v1',
      runtime_target: 'generic',
      stores: [{ store_id: 'default', type: 'jsonl', config: {} }],
      write_policy: {
        salience_rules: [],
        pii_handling: { detect: true, redact: true, store_separately: false },
        update_mode: 'consolidate',
        revisit_triggers: ['correction'],
        consolidation_schedule: 'weekly',
      },
      retention_policy: {
        ttl_days: 90,
        prune_strategy: 'least_salient',
      },
    } as any,
    bindings: {
      schema_version: 'bindings.v1',
      servers: [
        {
          name: 'repo',
          url: 'https://example.com',
          tools: [
            { tool_ref: 'repo:read', risk_hints: ['low'] },
            { tool_ref: 'repo:write', risk_hints: ['high'] },
          ],
          resources: [{ resource_ref: 'repo:tree' }],
          prompts: [],
          last_bind_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as any,
    skills: {
      schema_version: 'skills_manifest.v1',
      skills: [
        {
          skill_id: 'analyze',
          name: 'Analyze',
          description: 'Performs deep analysis on the current task context.',
          tags: [],
          risk_level: 'low',
          required_tools: [],
          compatible_runtimes: ['*'],
          feeds_into: ['implement'],
        },
        {
          skill_id: 'implement',
          name: 'Implement',
          description: 'Implements approved changes and verifies outcomes.',
          tags: [],
          risk_level: 'med',
          required_tools: [],
          compatible_runtimes: ['*'],
        },
      ],
    } as any,
  };
}

describe('generator blocks', () => {
  it('renders identity block with principles, tone, and tradeoffs', () => {
    const output = identityBlock(makeContext());
    expect(output).toContain('## Principles');
    expect(output).toContain('Prioritize correctness');
    expect(output).toContain('Never say');
    expect(output).toContain('Tradeoffs');
  });

  it('renders guardrails block from constitution and guardrails artifacts', () => {
    const output = guardrailsBlock(makeContext());
    expect(output).toContain('Always require approval');
    expect(output).toContain('Never do');
    expect(output).toContain('approve_writes');
    expect(output).toContain('Rate limits');
  });

  it('renders skills block with pipeline links and table', () => {
    const output = skillsIndexBlock(makeContext());
    expect(output).toContain('## Available Skills');
    expect(output).toContain('| Capability | Risk | When to use |');
    expect(output).toContain('Analyze → Implement');
    expect(output).toContain('Performs deep analysis on the current task context.');
  });

  it('renders session rhythm block', () => {
    const output = sessionRhythmBlock(makeContext());
    expect(output).toContain('## Session Rhythm');
    expect(output).toContain('Orient');
    expect(output).toContain('Work');
    expect(output).toContain('Persist');
  });

  it('renders memory policy block', () => {
    const output = memoryPolicyBlock(makeContext());
    expect(output).toContain('## Memory Policy');
    expect(output).toContain('Retention');
    expect(output).toContain('PII');
  });

  it('renders tool usage block from bindings and permission scopes', () => {
    const output = toolUsageBlock(makeContext());
    expect(output).toContain('## Tool Usage');
    expect(output).toContain('repo:read');
    expect(output).toContain('Permission Scopes');
  });

  it('renders drift awareness block with citation requirements', () => {
    const output = driftAwarenessBlock(makeContext());
    expect(output).toContain('## Standards drift Awareness');
    expect(output).toContain('Citation required for');
  });

  it('renders domain context only when domain_id is set', () => {
    const withDomain = domainContextBlock(makeContext());
    const withoutDomain = domainContextBlock({ ...makeContext(), domain_id: undefined });

    expect(withDomain).toContain('## Domain Context');
    expect(withoutDomain).toBeNull();
  });

  it('renders playbook index only when playbooks are present', () => {
    const withPlaybooks = playbookIndexBlock(makeContext());
    const withoutPlaybooks = playbookIndexBlock({ ...makeContext(), has_playbooks: false });

    expect(withPlaybooks).toContain('## Available Runbooks');
    expect(withoutPlaybooks).toBeNull();
  });

  it('renders vocabulary only when custom labels exist', () => {
    const withVocabulary = vocabularyBlock(makeContext());
    const withoutVocabulary = vocabularyBlock({ ...makeContext(), vocabulary: undefined });

    expect(withVocabulary).toContain('## Vocabulary');
    expect(withVocabulary).toContain('Runbook');
    expect(withoutVocabulary).toBeNull();
  });

  it('renders evaluation criteria only when evalpack exists', () => {
    const withEvalpack = evaluationCriteriaBlock(makeContext());
    const withoutEvalpack = evaluationCriteriaBlock({ ...makeContext(), has_evalpack: false });

    expect(withEvalpack).toContain('## Evaluation Criteria');
    expect(withoutEvalpack).toBeNull();
  });
});
