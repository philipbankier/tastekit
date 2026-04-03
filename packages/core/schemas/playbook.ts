import { z } from 'zod';

/**
 * Playbook v1 Schema
 * 
 * Runtime-agnostic execution plans with steps, checks, and escalations.
 */

export const PlaybookTriggerSchema = z.object({
  type: z.enum(['cron', 'event', 'manual']),
  schedule: z.string().optional().describe('Cron expression for scheduled triggers'),
  event_pattern: z.string().optional().describe('Event pattern for event-based triggers'),
});

export const PlaybookInputSchema = z.object({
  name: z.string(),
  type: z.string().describe('Input type (string, number, resource, etc.)'),
  required: z.boolean().default(true),
  description: z.string().optional(),
});

export const PlaybookStepSchema = z.object({
  step_id: z.string(),
  type: z.enum(['think', 'tool', 'transform', 'write', 'approval_gate']),
  tool_ref: z.string().optional().describe('Tool reference for tool steps'),
  params_template: z.record(z.any()).optional().describe('Parameter template'),
  outputs: z.array(z.string()).optional().describe('Output variable names'),
});

export const PlaybookCheckSchema = z.object({
  check_id: z.string(),
  type: z.enum(['taste', 'safety', 'format', 'facts']),
  rubric_ref: z.string().optional().describe('Reference to evaluation rubric'),
  condition: z.string().describe('Check condition expression'),
});

export const PlaybookStopConditionSchema = z.object({
  condition: z.string().describe('Stop condition expression'),
  reason: z.string().describe('Reason for stopping'),
});

export const PlaybookEscalationSchema = z.object({
  escalation_id: z.string(),
  trigger: z.string().describe('Trigger condition'),
  approval_ref: z.string().describe('Reference to approval rule in guardrails'),
});

export const PlaybookV1Schema = z.object({
  schema_version: z.literal('playbook.v1'),
  
  id: z.string(),
  name: z.string(),
  description: z.string(),
  
  triggers: z.array(PlaybookTriggerSchema),
  inputs: z.array(PlaybookInputSchema),
  steps: z.array(PlaybookStepSchema),
  checks: z.array(PlaybookCheckSchema),
  stop_conditions: z.array(PlaybookStopConditionSchema),
  escalations: z.array(PlaybookEscalationSchema),
});

export type PlaybookV1 = z.infer<typeof PlaybookV1Schema>;
export type PlaybookTrigger = z.infer<typeof PlaybookTriggerSchema>;
export type PlaybookInput = z.infer<typeof PlaybookInputSchema>;
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;
export type PlaybookCheck = z.infer<typeof PlaybookCheckSchema>;
export type PlaybookStopCondition = z.infer<typeof PlaybookStopConditionSchema>;
export type PlaybookEscalation = z.infer<typeof PlaybookEscalationSchema>;
