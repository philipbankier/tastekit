import {
  GuardrailsV1,
  GuardrailsPermission,
  GuardrailsApproval,
  GuardrailsRateLimit,
} from '../schemas/guardrails.js';
import { SessionState } from '../schemas/workspace.js';
import { StructuredAnswers } from '../interview/interviewer.js';
import { getDomainById } from '../domains/index.js';

/**
 * Guardrails compiler
 *
 * Compiles guardrails based on autonomy level, domain context, and safety
 * preferences from the onboarding interview. Dual-path: uses rich
 * StructuredAnswers if available, otherwise falls back to legacy flat answers.
 */

export function compileGuardrails(session: SessionState): GuardrailsV1 {
  if (session.structured_answers) {
    return compileFromStructuredAnswers(
      session.structured_answers as StructuredAnswers,
      session,
    );
  }
  return compileLegacy(session);
}

/**
 * Domain-specific guardrail presets.
 * Maps domain IDs to specialized permission scopes, approval rules,
 * and rate limit adjustments.
 */
interface DomainGuardrailPreset {
  permissions: GuardrailsPermission[];
  extraApprovals: GuardrailsApproval[];
  rateLimitMultiplier: number;
  rollbackPlaybook?: string;
}

const DOMAIN_PRESETS: Record<string, DomainGuardrailPreset> = {
  'content-agent': {
    permissions: [
      {
        scope_id: 'content_read',
        tool_ref: '*:*',
        resources: ['content/*', 'analytics/*', 'trends/*'],
        ops: ['read'],
      },
      {
        scope_id: 'content_write',
        tool_ref: '*:*',
        resources: ['drafts/*', 'content/*'],
        ops: ['write'],
      },
      {
        scope_id: 'content_publish',
        tool_ref: '*:*',
        resources: ['posts/*', 'social/*'],
        ops: ['publish', 'post'],
      },
    ],
    extraApprovals: [
      {
        rule_id: 'approve_publish',
        when: 'action.ops contains "publish" || action.ops contains "post"',
        action: 'require_approval',
        channel: 'cli',
      },
    ],
    rateLimitMultiplier: 1.5,
    rollbackPlaybook: 'content-rollback',
  },
  'sales-agent': {
    permissions: [
      {
        scope_id: 'crm_read',
        tool_ref: '*:*',
        resources: ['leads/*', 'contacts/*', 'deals/*'],
        ops: ['read'],
      },
      {
        scope_id: 'crm_write',
        tool_ref: '*:*',
        resources: ['leads/*', 'contacts/*', 'deals/*'],
        ops: ['write'],
      },
      {
        scope_id: 'outreach',
        tool_ref: '*:*',
        resources: ['emails/*', 'messages/*'],
        ops: ['write', 'execute'],
      },
    ],
    extraApprovals: [
      {
        rule_id: 'approve_outreach',
        when: 'action.ops contains "execute" && action.resources matches "emails/*"',
        action: 'require_approval',
        channel: 'cli',
      },
      {
        rule_id: 'approve_deal_changes',
        when: 'action.resources matches "deals/*" && action.ops contains "write"',
        action: 'require_approval',
        channel: 'cli',
      },
    ],
    rateLimitMultiplier: 1.0,
    rollbackPlaybook: 'sales-rollback',
  },
  'development-agent': {
    permissions: [
      {
        scope_id: 'code_read',
        tool_ref: '*:*',
        resources: ['src/*', 'tests/*', 'docs/*', 'config/*'],
        ops: ['read'],
      },
      {
        scope_id: 'code_write',
        tool_ref: '*:*',
        resources: ['src/*', 'tests/*', 'docs/*'],
        ops: ['write'],
      },
      {
        scope_id: 'code_execute',
        tool_ref: '*:*',
        resources: ['tests/*', 'scripts/*'],
        ops: ['execute'],
      },
    ],
    extraApprovals: [
      {
        rule_id: 'approve_deploy',
        when: 'action.ops contains "execute" && action.resources matches "deploy/*"',
        action: 'require_approval',
        channel: 'cli',
      },
    ],
    rateLimitMultiplier: 2.0,
    rollbackPlaybook: 'dev-rollback',
  },
  'research-agent': {
    permissions: [
      {
        scope_id: 'research_read',
        tool_ref: '*:*',
        resources: ['sources/*', 'papers/*', 'data/*'],
        ops: ['read'],
      },
      {
        scope_id: 'research_write',
        tool_ref: '*:*',
        resources: ['notes/*', 'reports/*', 'analysis/*'],
        ops: ['write'],
      },
    ],
    extraApprovals: [
      {
        rule_id: 'approve_data_export',
        when: 'action.ops contains "publish" || action.resources matches "reports/*"',
        action: 'require_approval',
        channel: 'cli',
      },
    ],
    rateLimitMultiplier: 2.0,
  },
  'support-agent': {
    permissions: [
      {
        scope_id: 'support_read',
        tool_ref: '*:*',
        resources: ['tickets/*', 'knowledge-base/*', 'customers/*'],
        ops: ['read'],
      },
      {
        scope_id: 'support_write',
        tool_ref: '*:*',
        resources: ['tickets/*', 'responses/*'],
        ops: ['write'],
      },
    ],
    extraApprovals: [
      {
        rule_id: 'approve_customer_response',
        when: 'action.ops contains "write" && action.resources matches "responses/*"',
        action: 'require_approval',
        channel: 'cli',
      },
      {
        rule_id: 'approve_escalation',
        when: 'action.tags contains "escalation"',
        action: 'require_approval',
        channel: 'cli',
      },
    ],
    rateLimitMultiplier: 1.0,
    rollbackPlaybook: 'support-rollback',
  },
  'general-agent': {
    permissions: [
      {
        scope_id: 'general_read',
        tool_ref: '*:*',
        resources: ['*'],
        ops: ['read'],
      },
      {
        scope_id: 'general_write',
        tool_ref: '*:*',
        resources: ['*'],
        ops: ['write'],
      },
    ],
    extraApprovals: [],
    rateLimitMultiplier: 1.0,
  },
};

/**
 * Rich compilation from StructuredAnswers.
 * Uses domain context, autonomy level, taboos, and evidence policy
 * to generate comprehensive guardrails.
 */
function compileFromStructuredAnswers(
  sa: StructuredAnswers,
  session: SessionState,
): GuardrailsV1 {
  const domainId = session.domain_id || 'general-agent';
  const domain = getDomainById(domainId);
  const preset = DOMAIN_PRESETS[domainId] || DOMAIN_PRESETS['general-agent'];
  const autonomyLevel = sa.tradeoffs.autonomy_level;

  // Build permissions from domain preset
  const permissions: GuardrailsPermission[] = [...preset.permissions];

  // Build approval rules based on autonomy level
  const approvals: GuardrailsApproval[] = buildApprovalRules(autonomyLevel, preset, sa);

  // Build rate limits based on domain and cost sensitivity
  const baseLimit = 100;
  const rateLimitMultiplier = preset.rateLimitMultiplier;
  const costFactor = sa.tradeoffs.cost_sensitivity > 0.7 ? 0.5 : 1.0;
  const effectiveLimit = Math.round(baseLimit * rateLimitMultiplier * costFactor);

  const rate_limits: GuardrailsRateLimit[] = [
    { tool_ref: '*:*', limit: effectiveLimit, window: '1h' },
  ];

  // Add tighter limits for high-risk tools if autonomy is low
  if (autonomyLevel < 0.5) {
    rate_limits.push(
      { tool_ref: '*:delete', limit: 10, window: '1h' },
      { tool_ref: '*:execute', limit: 25, window: '1h' },
    );
  }

  // Build rollback reference if domain has one
  const rollback = preset.rollbackPlaybook
    ? { playbook_ref: preset.rollbackPlaybook }
    : undefined;

  return {
    schema_version: 'guardrails.v1',
    permissions,
    approvals,
    rate_limits,
    rollback,
  };
}

/**
 * Build approval rules from autonomy level, domain preset, and structured answers.
 */
function buildApprovalRules(
  autonomyLevel: number,
  preset: DomainGuardrailPreset,
  sa: StructuredAnswers,
): GuardrailsApproval[] {
  const approvals: GuardrailsApproval[] = [];

  // Tier 1: autonomy-based base rules
  if (autonomyLevel < 0.3) {
    approvals.push({
      rule_id: 'approve_all_writes',
      when: 'action.ops contains "write" || action.ops contains "delete" || action.ops contains "execute"',
      action: 'require_approval',
      channel: 'cli',
    });
  } else if (autonomyLevel < 0.5) {
    approvals.push({
      rule_id: 'approve_writes_and_deletes',
      when: 'action.ops contains "write" || action.ops contains "delete"',
      action: 'require_approval',
      channel: 'cli',
    });
  } else if (autonomyLevel < 0.7) {
    approvals.push({
      rule_id: 'approve_destructive',
      when: 'action.ops contains "delete" || action.risk_score > 0.7',
      action: 'require_approval',
      channel: 'cli',
    });
  }

  // Tier 2: always require approval for high-risk actions
  approvals.push({
    rule_id: 'approve_high_risk',
    when: 'action.risk_score > 0.9',
    action: 'require_approval',
    channel: 'cli',
  });

  // Tier 3: domain-specific approval rules
  for (const rule of preset.extraApprovals) {
    // Skip domain publish/outreach approvals if high autonomy
    if (autonomyLevel >= 0.8) continue;
    approvals.push(rule);
  }

  // Tier 4: block rules from taboos — things that must never happen
  for (let i = 0; i < sa.taboos.never_do.length; i++) {
    const taboo = sa.taboos.never_do[i];
    const slug = taboo.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    const ruleId = `block_taboo_${slug}_${i}`;
    approvals.push({
      rule_id: ruleId,
      when: `action.description matches "${taboo}"`,
      action: 'block',
      channel: 'cli',
    });
  }

  // Tier 5: escalation rules from taboos
  for (let i = 0; i < sa.taboos.must_escalate.length; i++) {
    const escalation = sa.taboos.must_escalate[i];
    const slug = escalation.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    const ruleId = `escalate_${slug}_${i}`;
    approvals.push({
      rule_id: ruleId,
      when: `action.tags contains "${escalation}"`,
      action: 'require_approval',
      channel: 'cli',
    });
  }

  return approvals;
}

/**
 * Legacy compilation from flat session.answers.
 * Preserves backward compatibility with pre-LLM interview sessions.
 */
function compileLegacy(session: SessionState): GuardrailsV1 {
  const { answers } = session;
  const autonomyLevel = answers.tradeoffs?.autonomy_level || 0.5;
  const domainId = session.domain_id || 'general-agent';
  const preset = DOMAIN_PRESETS[domainId] || DOMAIN_PRESETS['general-agent'];

  const permissions: GuardrailsPermission[] = [...preset.permissions];

  const approvals: GuardrailsApproval[] = [];

  // Legacy thresholds aligned with structured path for consistent behavior
  if (autonomyLevel < 0.3) {
    approvals.push({
      rule_id: 'approve_all_writes',
      when: 'action.type == "write" || action.type == "delete" || action.type == "execute"',
      action: 'require_approval',
      channel: 'cli',
    });
  } else if (autonomyLevel < 0.5) {
    approvals.push({
      rule_id: 'approve_writes_and_deletes',
      when: 'action.type == "write" || action.type == "delete"',
      action: 'require_approval',
      channel: 'cli',
    });
  } else if (autonomyLevel < 0.7) {
    approvals.push({
      rule_id: 'approve_destructive',
      when: 'action.type == "delete" || action.risk_score > 0.7',
      action: 'require_approval',
      channel: 'cli',
    });
  }

  approvals.push({
    rule_id: 'approve_high_risk',
    when: 'action.risk_score > 0.9',
    action: 'require_approval',
    channel: 'cli',
  });

  // Add domain-specific approvals for non-high-autonomy
  if (autonomyLevel < 0.8) {
    approvals.push(...preset.extraApprovals);
  }

  const rate_limits: GuardrailsRateLimit[] = [
    { tool_ref: '*:*', limit: Math.round(100 * preset.rateLimitMultiplier), window: '1h' },
  ];

  const rollback = preset.rollbackPlaybook
    ? { playbook_ref: preset.rollbackPlaybook }
    : undefined;

  return {
    schema_version: 'guardrails.v1',
    permissions,
    approvals,
    rate_limits,
    rollback,
  };
}
