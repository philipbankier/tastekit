import { z } from 'zod';

/**
 * Skills Manifest v1 Schema
 * 
 * Metadata for the Skills library with progressive disclosure.
 */

export const SkillMetadataSchema = z.object({
  skill_id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  risk_level: z.enum(['low', 'med', 'high']),
  required_tools: z.array(z.string()).describe('MCP tool refs required'),
  compatible_runtimes: z.array(z.string()).describe('Compatible runtime adapters'),
  playbook_ref: z.string().optional().describe('Associated playbook reference'),

  // Skill graph relationships
  /** Skill IDs that should complete before this skill runs */
  prerequisites: z.array(z.string()).optional(),
  /** Skill IDs that consume this skill's output */
  feeds_into: z.array(z.string()).optional(),
  /** Skill IDs that serve the same purpose (choose one) */
  alternatives: z.array(z.string()).optional(),
  /** Pipeline phase: where this skill fits in a multi-step workflow */
  pipeline_phase: z.string().optional().describe('"capture", "process", "connect", "verify"'),
  /** Run in current context or spawn fresh subagent */
  context_model: z.enum(['inherit', 'fork']).optional(),
  /** Suggested model for this skill */
  model_hint: z.string().optional().describe('"sonnet" for fast, "opus" for deep analysis'),

  // Three-repo hierarchy fields
  /** Skill provenance: public (open-source), private (personal), shared (team) */
  source_type: z.enum(['public', 'private', 'shared']).optional(),
  /** Skill IDs this skill depends on (validated during install) */
  depends_on: z.array(z.string()).optional(),
});

export const SkillsManifestV1Schema = z.object({
  schema_version: z.literal('skills_manifest.v1'),
  skills: z.array(SkillMetadataSchema),
});

/**
 * SKILL.md Structure (not enforced by schema, but documented here)
 * 
 * Required sections:
 * - Purpose (1-3 sentences)
 * - When to use / When not to use
 * - Inputs / Outputs
 * - Procedure (steps referencing resources/scripts)
 * - Quality checks
 * - Guardrail notes
 * - Progressive disclosure:
 *   - Minimal context (always load)
 *   - On invoke (load when skill is invoked)
 *   - On demand resources (load only if needed)
 */

export type SkillsManifestV1 = z.infer<typeof SkillsManifestV1Schema>;
export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;

// ---------------------------------------------------------------------------
// Skill Execution Tracking — per-skill performance observation
// ---------------------------------------------------------------------------

export const SkillExecutionRecordSchema = z.object({
  skill_id: z.string(),
  run_id: z.string(),
  timestamp: z.string().datetime(),
  outcome: z.enum(['success', 'failure', 'partial']),
  error_count: z.number().int().min(0),
  user_corrections: z.number().int().min(0),
  duration_ms: z.number().min(0),
  user_feedback: z.string().optional(),
});

export const SkillPerformanceReportSchema = z.object({
  skill_id: z.string(),
  total_runs: z.number().int().min(0),
  success_rate: z.number().min(0).max(1),
  avg_duration_ms: z.number().min(0),
  failure_reasons: z.record(z.number()),
  trend: z.enum(['improving', 'stable', 'degrading']),
});

export type SkillExecutionRecord = z.infer<typeof SkillExecutionRecordSchema>;
export type SkillPerformanceReport = z.infer<typeof SkillPerformanceReportSchema>;

// ---------------------------------------------------------------------------
// Skill Versioning — track instruction history for rollback
// ---------------------------------------------------------------------------

export const SkillVersionSchema = z.object({
  version: z.number().int().min(1),
  content_hash: z.string(),
  timestamp: z.string().datetime(),
  amendment_id: z.string().optional(),
  eval_score: z.number().min(0).max(1).optional(),
});

export const SkillVersionHistorySchema = z.object({
  skill_id: z.string(),
  versions: z.array(SkillVersionSchema),
  current: z.number().int().min(1),
});

export type SkillVersion = z.infer<typeof SkillVersionSchema>;
export type SkillVersionHistory = z.infer<typeof SkillVersionHistorySchema>;

// ---------------------------------------------------------------------------
// Skill Constraint Validation
// ---------------------------------------------------------------------------

export const ConstraintResultSchema = z.object({
  passed: z.boolean(),
  constraint_id: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export type ConstraintResult = z.infer<typeof ConstraintResultSchema>;
