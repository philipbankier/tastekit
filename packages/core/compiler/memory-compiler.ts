import { MemoryV1, MemorySalienceRule } from '../schemas/memory.js';
import { SessionState } from '../schemas/workspace.js';
import { StructuredAnswers } from '../interview/interviewer.js';
import { getDomainById } from '../domains/index.js';

/**
 * Memory policy compiler
 *
 * Compiles memory management policy from onboarding interview answers.
 * Dual-path: uses StructuredAnswers if available, otherwise falls back
 * to legacy flat answers. Domain context shapes salience rules,
 * PII handling, and retention settings.
 */

export function compileMemoryPolicy(session: SessionState): MemoryV1 {
  if (session.structured_answers) {
    return compileFromStructuredAnswers(
      session.structured_answers as StructuredAnswers,
      session,
    );
  }
  return compileLegacy(session);
}

/**
 * Domain-specific memory presets.
 * Each domain weights different types of information for salience
 * and has different PII sensitivity profiles.
 */
interface DomainMemoryPreset {
  salienceRules: MemorySalienceRule[];
  revisitTriggers: string[];
  defaultTTLDays: number;
  piiSensitive: boolean;
}

const SHARED_SALIENCE_RULES: MemorySalienceRule[] = [
  {
    rule_id: 'user_preferences',
    pattern: 'preference|like|dislike|prefer|want|need',
    score: 0.9,
    reason: 'User preferences are highly salient across all domains',
  },
  {
    rule_id: 'corrections',
    pattern: 'actually|correction|mistake|wrong|fix|update',
    score: 0.95,
    reason: 'Corrections are critical to remember to avoid repeating errors',
  },
  {
    rule_id: 'feedback',
    pattern: 'good|bad|better|worse|improve|great|terrible',
    score: 0.8,
    reason: 'Feedback signals help calibrate future behavior',
  },
];

const DOMAIN_MEMORY_PRESETS: Record<string, DomainMemoryPreset> = {
  'content-agent': {
    salienceRules: [
      {
        rule_id: 'brand_voice',
        pattern: 'brand|voice|tone|style|personality',
        score: 0.95,
        reason: 'Brand voice consistency is critical for content agents',
      },
      {
        rule_id: 'audience_signals',
        pattern: 'audience|follower|engagement|reach|impression',
        score: 0.85,
        reason: 'Audience insights inform content strategy',
      },
      {
        rule_id: 'content_performance',
        pattern: 'performed|viral|trending|popular|engagement rate',
        score: 0.8,
        reason: 'Content performance data guides future creation',
      },
      {
        rule_id: 'platform_rules',
        pattern: 'algorithm|policy|limit|character|format',
        score: 0.7,
        reason: 'Platform-specific rules evolve frequently',
      },
    ],
    revisitTriggers: ['user_correction', 'principle_violation', 'brand_drift', 'platform_change'],
    defaultTTLDays: 90,
    piiSensitive: false,
  },
  'sales-agent': {
    salienceRules: [
      {
        rule_id: 'deal_context',
        pattern: 'deal|opportunity|pipeline|revenue|close',
        score: 0.95,
        reason: 'Deal context is the highest-value memory for sales agents',
      },
      {
        rule_id: 'customer_relationship',
        pattern: 'relationship|rapport|trust|concern|objection',
        score: 0.9,
        reason: 'Relationship context drives effective selling',
      },
      {
        rule_id: 'pricing_terms',
        pattern: 'price|discount|terms|contract|proposal',
        score: 0.85,
        reason: 'Accurate pricing recall prevents deal-breaking errors',
      },
      {
        rule_id: 'competitive_intel',
        pattern: 'competitor|alternative|comparison|switch',
        score: 0.75,
        reason: 'Competitive context helps position effectively',
      },
    ],
    revisitTriggers: ['user_correction', 'deal_stage_change', 'pricing_update', 'lost_deal'],
    defaultTTLDays: 180,
    piiSensitive: true,
  },
  'development-agent': {
    salienceRules: [
      {
        rule_id: 'code_patterns',
        pattern: 'pattern|architecture|convention|style guide|standard',
        score: 0.9,
        reason: 'Coding patterns and conventions ensure consistency',
      },
      {
        rule_id: 'bug_context',
        pattern: 'bug|error|issue|regression|failure|crash',
        score: 0.85,
        reason: 'Bug context prevents re-introduction of known issues',
      },
      {
        rule_id: 'tech_decisions',
        pattern: 'decision|chose|tradeoff|migration|deprecat',
        score: 0.9,
        reason: 'Technical decisions provide important context for future work',
      },
      {
        rule_id: 'test_results',
        pattern: 'test|coverage|assertion|spec|fixture',
        score: 0.7,
        reason: 'Test outcomes guide quality focus areas',
      },
    ],
    revisitTriggers: ['user_correction', 'test_failure', 'build_failure', 'dependency_update'],
    defaultTTLDays: 120,
    piiSensitive: false,
  },
  'research-agent': {
    salienceRules: [
      {
        rule_id: 'source_quality',
        pattern: 'source|citation|reference|paper|study|evidence',
        score: 0.95,
        reason: 'Source quality tracking is essential for research integrity',
      },
      {
        rule_id: 'methodology',
        pattern: 'method|approach|framework|analysis|hypothesis',
        score: 0.9,
        reason: 'Methodological choices must be consistently remembered',
      },
      {
        rule_id: 'findings',
        pattern: 'finding|result|conclusion|insight|discovery',
        score: 0.85,
        reason: 'Research findings are core output to preserve',
      },
      {
        rule_id: 'contradictions',
        pattern: 'contradict|conflict|disagree|inconsisten|debate',
        score: 0.9,
        reason: 'Contradictions require careful tracking for balanced analysis',
      },
    ],
    revisitTriggers: ['user_correction', 'source_retraction', 'new_evidence', 'methodology_change'],
    defaultTTLDays: 365,
    piiSensitive: false,
  },
  'support-agent': {
    salienceRules: [
      {
        rule_id: 'customer_issue',
        pattern: 'issue|problem|ticket|complaint|request',
        score: 0.9,
        reason: 'Customer issue context drives resolution quality',
      },
      {
        rule_id: 'resolution_pattern',
        pattern: 'resolved|fixed|solution|workaround|steps',
        score: 0.85,
        reason: 'Successful resolutions create reusable knowledge',
      },
      {
        rule_id: 'customer_sentiment',
        pattern: 'frustrated|happy|angry|satisfied|urgent',
        score: 0.8,
        reason: 'Sentiment awareness enables appropriate response tone',
      },
      {
        rule_id: 'escalation_context',
        pattern: 'escalat|manager|supervisor|priority|SLA',
        score: 0.95,
        reason: 'Escalation context must be preserved for continuity',
      },
    ],
    revisitTriggers: ['user_correction', 'escalation', 'repeated_issue', 'customer_churn'],
    defaultTTLDays: 90,
    piiSensitive: true,
  },
  'general-agent': {
    salienceRules: [],
    revisitTriggers: ['user_correction', 'principle_violation', 'repeated_failure'],
    defaultTTLDays: 90,
    piiSensitive: false,
  },
};

/**
 * Rich compilation from StructuredAnswers.
 */
function compileFromStructuredAnswers(
  sa: StructuredAnswers,
  session: SessionState,
): MemoryV1 {
  const domainId = session.domain_id || 'general-agent';
  const preset = DOMAIN_MEMORY_PRESETS[domainId] || DOMAIN_MEMORY_PRESETS['general-agent'];

  // Combine shared + domain-specific salience rules
  const salience_rules: MemorySalienceRule[] = [
    ...SHARED_SALIENCE_RULES,
    ...preset.salienceRules,
  ];

  // Adjust PII handling based on taboos and domain sensitivity
  const hasPIITaboos = sa.taboos.never_do.some(
    t => /personal information|pii|privacy|confidential/i.test(t),
  );
  const pii_handling = {
    detect: true,
    redact: preset.piiSensitive || hasPIITaboos,
    store_separately: preset.piiSensitive || hasPIITaboos,
  };

  // Adjust retention based on autonomy and cost sensitivity
  let ttl_days = preset.defaultTTLDays;
  if (sa.tradeoffs.cost_sensitivity > 0.7) {
    ttl_days = Math.round(ttl_days * 0.6);
  } else if (sa.tradeoffs.cost_sensitivity < 0.3) {
    ttl_days = Math.round(ttl_days * 1.5);
  }

  // Consolidation frequency based on autonomy
  const consolidation_schedule = sa.tradeoffs.autonomy_level >= 0.7
    ? '0 0 2 * * *'   // daily at 2 AM for high autonomy
    : '0 0 2 * * 0';  // weekly on Sunday for lower autonomy

  const update_mode = sa.tradeoffs.autonomy_level >= 0.6
    ? 'consolidate' as const
    : 'revise' as const;

  return {
    schema_version: 'memory.v1',
    runtime_target: 'generic',
    stores: [
      {
        store_id: 'default',
        type: 'runtime_managed',
        config: {},
      },
    ],
    write_policy: {
      salience_rules,
      pii_handling,
      update_mode,
      consolidation_schedule,
      revisit_triggers: preset.revisitTriggers,
    },
    retention_policy: {
      ttl_days,
      prune_strategy: 'least_salient',
    },
  };
}

/**
 * Legacy compilation from flat session.answers.
 * Preserves backward compatibility while still using domain context.
 */
function compileLegacy(session: SessionState): MemoryV1 {
  const domainId = session.domain_id || 'general-agent';
  const preset = DOMAIN_MEMORY_PRESETS[domainId] || DOMAIN_MEMORY_PRESETS['general-agent'];
  const autonomyLevel = session.answers?.tradeoffs?.autonomy_level || 0.5;

  const salience_rules: MemorySalienceRule[] = [
    ...SHARED_SALIENCE_RULES,
    ...preset.salienceRules,
  ];

  return {
    schema_version: 'memory.v1',
    runtime_target: 'generic',
    stores: [
      {
        store_id: 'default',
        type: 'runtime_managed',
        config: {},
      },
    ],
    write_policy: {
      salience_rules,
      pii_handling: {
        detect: true,
        redact: preset.piiSensitive,
        store_separately: preset.piiSensitive,
      },
      update_mode: autonomyLevel >= 0.6 ? 'consolidate' : 'revise',
      consolidation_schedule: autonomyLevel >= 0.7 ? '0 0 2 * * *' : '0 0 2 * * 0',
      revisit_triggers: preset.revisitTriggers,
    },
    retention_policy: {
      ttl_days: preset.defaultTTLDays,
      prune_strategy: 'least_salient',
    },
  };
}
