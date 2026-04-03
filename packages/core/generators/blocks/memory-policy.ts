/**
 * Memory Policy Block — Retention, consolidation, PII handling.
 */
import type { GeneratorBlock } from '../types.js';

export const memoryPolicyBlock: GeneratorBlock = (ctx) => {
  if (!ctx.memory) return null;

  const m = ctx.memory;
  const lines: string[] = ['## Memory Policy', ''];

  // Retention
  const ttl = m.retention_policy.ttl_days
    ? `${m.retention_policy.ttl_days} days`
    : 'indefinite';
  lines.push(`- **Retention:** ${ttl}, prune by ${m.retention_policy.prune_strategy}`);

  // Consolidation
  if (m.write_policy.consolidation_schedule) {
    lines.push(`- **Consolidation:** ${m.write_policy.consolidation_schedule}`);
  }
  lines.push(`- **Update mode:** ${m.write_policy.update_mode}`);

  // PII
  const pii = m.write_policy.pii_handling;
  if (pii.detect || pii.redact) {
    const piiActions: string[] = [];
    if (pii.detect) piiActions.push('detect');
    if (pii.redact) piiActions.push('redact');
    if (pii.store_separately) piiActions.push('store separately');
    lines.push(`- **PII:** ${piiActions.join(', ')}`);
  }

  // Revisit triggers
  if (m.write_policy.revisit_triggers.length > 0) {
    lines.push(`- **Revisit on:** ${m.write_policy.revisit_triggers.join(', ')}`);
  }

  return lines.join('\n');
};
