/**
 * Guardrails Block — Hard boundaries, approvals, rate limits.
 */
import type { GeneratorBlock } from '../types.js';

export const guardrailsBlock: GeneratorBlock = (ctx) => {
  if (!ctx.guardrails && !ctx.constitution?.taboos) return null;

  const heading = ctx.vocabulary?.guardrails_heading ?? 'Guardrails';
  const lines: string[] = [`## ${heading}`, ''];

  // Taboos from constitution
  if (ctx.constitution?.taboos) {
    const taboos = ctx.constitution.taboos;
    if (taboos.must_escalate.length > 0) {
      lines.push('### Always require approval');
      for (const item of taboos.must_escalate) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
    if (taboos.never_do.length > 0) {
      lines.push('### Never do');
      for (const item of taboos.never_do) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }

  // Approval rules from guardrails
  if (ctx.guardrails) {
    const g = ctx.guardrails;
    if (g.approvals.length > 0) {
      lines.push('### Approval rules');
      for (const rule of g.approvals) {
        lines.push(`- **${rule.rule_id}**: When ${rule.when} → ${rule.action} (via ${rule.channel})`);
      }
      lines.push('');
    }

    if (g.rate_limits.length > 0) {
      lines.push('### Rate limits');
      for (const rl of g.rate_limits) {
        lines.push(`- ${rl.tool_ref} — max ${rl.limit}/${rl.window}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
};
