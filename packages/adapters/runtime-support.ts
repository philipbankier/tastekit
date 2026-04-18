import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { TraceEvent } from '@actrun_ai/tastekit-core';
import type { GeneratorContext } from '@actrun_ai/tastekit-core/generators';
import type { MemoryV1 } from '@actrun_ai/tastekit-core';
import type { SimulationSummary } from './adapter-interface.js';

const AVAILABLE_ADAPTERS = ['claude-code', 'openclaw', 'manus', 'autopilots'];

export function buildSimulationSummary(workspace: GeneratorContext): SimulationSummary {
  return {
    domain: workspace.domain_id ?? 'general-agent',
    principleCount: workspace.constitution?.principles?.length ?? 0,
    guardrailCount:
      (workspace.guardrails?.permissions?.length ?? 0) +
      (workspace.guardrails?.approvals?.length ?? 0) +
      (workspace.guardrails?.rate_limits?.length ?? 0),
    skillCount: workspace.skills?.skills?.length ?? 0,
    autonomyLevel: Number(workspace.constitution?.tradeoffs?.autonomy_level ?? 0),
    adapters: AVAILABLE_ADAPTERS,
  };
}

export async function writeTraceJsonl(adapterId: string, events: TraceEvent[], outDir: string): Promise<void> {
  const tracesDir = join(outDir, 'traces');
  mkdirSync(tracesDir, { recursive: true });
  const tracePath = join(tracesDir, `${adapterId}.jsonl`);
  const payload = events.map((event) => JSON.stringify(event)).join('\n');
  writeFileSync(tracePath, payload.length > 0 ? `${payload}\n` : '', 'utf-8');
}

export function formatMemoryBullets(policy: MemoryV1): string[] {
  const ttl = policy.retention_policy.ttl_days
    ? `${policy.retention_policy.ttl_days} days`
    : 'indefinite';
  const piiActions: string[] = [];

  if (policy.write_policy.pii_handling.detect) piiActions.push('detect');
  if (policy.write_policy.pii_handling.redact) piiActions.push('redact');
  if (policy.write_policy.pii_handling.store_separately) piiActions.push('store separately');

  return [
    `Retention: ${ttl}, prune by ${policy.retention_policy.prune_strategy}`,
    `Update mode: ${policy.write_policy.update_mode}`,
    `Stores: ${policy.stores.map((store) => store.store_id).join(', ') || 'none'}`,
    `PII: ${piiActions.join(', ') || 'none'}`,
    `Revisit on: ${policy.write_policy.revisit_triggers.join(', ') || 'none'}`,
  ];
}
