import { z } from 'zod';

/**
 * Guardrails v1 Schema
 * 
 * Defines permissions, approval gates, and rate limits for tool usage.
 */

export const GuardrailsPermissionSchema = z.object({
  scope_id: z.string().describe('Unique permission scope identifier'),
  tool_ref: z.string().describe('MCP server + tool name (e.g., "server:tool")'),
  resources: z.array(z.string()).describe('Resource patterns (glob-style)'),
  ops: z.array(z.enum(['read', 'write', 'delete', 'execute', 'post', 'publish', 'admin'])),
});

export const GuardrailsApprovalSchema = z.object({
  rule_id: z.string().describe('Unique approval rule identifier'),
  when: z.string().describe('Boolean expression over action/tool/risk/tags'),
  action: z.enum(['require_approval', 'block', 'allow']),
  channel: z.enum(['cli', 'ui', 'webhook']).describe('Approval channel (adapter-mapped)'),
});

export const GuardrailsRateLimitSchema = z.object({
  tool_ref: z.string().describe('MCP server + tool name'),
  limit: z.number().int().positive().describe('Maximum calls allowed'),
  window: z.string().describe('Time window (e.g., "1h", "1d")'),
});

export const GuardrailsRollbackSchema = z.object({
  playbook_ref: z.string().describe('Reference to rollback skill/playbook'),
  notes: z.string().optional(),
});

export const GuardrailsV1Schema = z.object({
  schema_version: z.literal('guardrails.v1'),
  
  permissions: z.array(GuardrailsPermissionSchema),
  approvals: z.array(GuardrailsApprovalSchema),
  rate_limits: z.array(GuardrailsRateLimitSchema),
  rollback: GuardrailsRollbackSchema.optional(),
});

export type GuardrailsV1 = z.infer<typeof GuardrailsV1Schema>;
export type GuardrailsPermission = z.infer<typeof GuardrailsPermissionSchema>;
export type GuardrailsApproval = z.infer<typeof GuardrailsApprovalSchema>;
export type GuardrailsRateLimit = z.infer<typeof GuardrailsRateLimitSchema>;
export type GuardrailsRollback = z.infer<typeof GuardrailsRollbackSchema>;
