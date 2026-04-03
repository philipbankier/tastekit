import { z } from 'zod';

/**
 * Trace Event v1 Schema
 *
 * Machine-readable trace events for all operations.
 * Traces are written as JSONL (one event per line).
 */

/**
 * Observation category — what the agent noticed during operation.
 * Used when event_type is 'observation'.
 */
export const ObservationCategorySchema = z.enum([
  'methodology',  // how the system's design decisions play out
  'process',      // workflow patterns and bottlenecks
  'friction',     // something was harder than expected
  'surprise',     // unexpected outcome (good or bad)
  'quality',      // output quality signal
]);

/**
 * Tension — a contradiction between expected and actual behavior.
 * Used when event_type is 'tension'.
 */
export const TensionSchema = z.object({
  description: z.string(),
  involves: z.array(z.string()).describe('Principle IDs or skill IDs in conflict'),
  status: z.enum(['pending', 'resolved', 'dissolved']),
});

export const TraceEventSchema = z.object({
  schema_version: z.literal('trace_event.v1'),
  run_id: z.string().describe('Unique run identifier'),
  timestamp: z.string().datetime().describe('ISO8601 timestamp'),

  actor: z.enum(['agent', 'user', 'system']),
  skill_id: z.string().optional(),
  playbook_id: z.string().optional(),
  step_id: z.string().optional(),

  event_type: z.enum([
    'plan',
    'think',
    'tool_call',
    'tool_result',
    'approval_requested',
    'approval_response',
    'artifact_written',
    'memory_write',
    'evaluation',
    'error',
    // Operational learning loop events
    'observation',
    'tension',
    // Session lifecycle events
    'session_start',
    'session_end',
  ]),

  tool_ref: z.string().optional().describe('MCP server/tool reference'),
  input_hash: z.string().optional().describe('Hash of input data'),
  output_hash: z.string().optional().describe('Hash of output data'),
  risk_score: z.number().min(0).max(1).optional(),
  principle_refs: z.array(z.string()).optional().describe('Constitution principle IDs'),
  cost: z.object({
    tokens: z.number().optional(),
    time_ms: z.number().optional(),
  }).optional(),

  data: z.record(z.any()).optional().describe('Event-specific data'),
  error: z.string().optional().describe('Error message if event_type is error'),

  // Observation-specific (when event_type is 'observation')
  observation_category: ObservationCategorySchema.optional(),

  // Tension-specific (when event_type is 'tension')
  tension: TensionSchema.optional(),
});

export type TraceEvent = z.infer<typeof TraceEventSchema>;
export type ObservationCategory = z.infer<typeof ObservationCategorySchema>;
export type Tension = z.infer<typeof TensionSchema>;
