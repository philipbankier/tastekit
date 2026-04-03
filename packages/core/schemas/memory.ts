import { z } from 'zod';

/**
 * Memory v1 Schema
 * 
 * Memory policy mapping (not storage). Defines how memory should be managed
 * by the runtime adapter.
 */

export const MemorySalienceRuleSchema = z.object({
  rule_id: z.string(),
  pattern: z.string().describe('Pattern to match for salience'),
  score: z.number().min(0).max(1).describe('Salience score (0-1)'),
  reason: z.string().optional(),
});

export const MemoryPIIHandlingSchema = z.object({
  detect: z.boolean().describe('Whether to detect PII'),
  redact: z.boolean().describe('Whether to redact PII'),
  store_separately: z.boolean().describe('Store PII in separate secure store'),
});

export const MemoryWritePolicySchema = z.object({
  salience_rules: z.array(MemorySalienceRuleSchema).describe('Rule-based salience detection'),
  pii_handling: MemoryPIIHandlingSchema,
  update_mode: z.enum(['append', 'revise', 'consolidate']),
  consolidation_schedule: z.string().optional().describe('Cron or interval expression'),
  revisit_triggers: z.array(z.string()).describe('Events that trigger memory revisit'),
});

export const MemoryRetentionPolicySchema = z.object({
  ttl_days: z.number().int().positive().optional().describe('Time-to-live in days'),
  prune_strategy: z.enum(['oldest', 'least_salient', 'manual']),
});

export const MemoryStoreSchema = z.object({
  store_id: z.string(),
  type: z.string().describe('Store type (adapter-specific)'),
  config: z.record(z.any()).describe('Adapter-specific configuration'),
});

export const MemoryV1Schema = z.object({
  schema_version: z.literal('memory.v1'),
  runtime_target: z.string().describe('Target runtime or "generic"'),
  
  stores: z.array(MemoryStoreSchema).describe('Adapter-mapped memory stores'),
  write_policy: MemoryWritePolicySchema,
  retention_policy: MemoryRetentionPolicySchema,
});

export type MemoryV1 = z.infer<typeof MemoryV1Schema>;
export type MemorySalienceRule = z.infer<typeof MemorySalienceRuleSchema>;
export type MemoryPIIHandling = z.infer<typeof MemoryPIIHandlingSchema>;
export type MemoryWritePolicy = z.infer<typeof MemoryWritePolicySchema>;
export type MemoryRetentionPolicy = z.infer<typeof MemoryRetentionPolicySchema>;
export type MemoryStore = z.infer<typeof MemoryStoreSchema>;
