import { z } from 'zod';

/**
 * Constitution v1 Schema
 * 
 * Represents the global taste profile for a single user.
 * Principles are ordered by priority (1 = highest).
 */

export const ConstitutionPrincipleSchema = z.object({
  id: z.string().describe('Stable principle identifier'),
  priority: z.number().int().positive().describe('Priority (1 = highest)'),
  statement: z.string().describe('The principle statement'),
  rationale: z.string().optional().describe('Why this principle matters'),
  applies_to: z.array(z.string()).describe('Tags: skill_ids, domains, or contexts'),
  examples_good: z.array(z.string()).optional().describe('Positive examples'),
  examples_bad: z.array(z.string()).optional().describe('Negative examples'),
});

export const ConstitutionToneSchema = z.object({
  voice_keywords: z.array(z.string()).describe('Keywords describing voice/tone'),
  forbidden_phrases: z.array(z.string()).describe('Phrases to never use'),
  formatting_rules: z.array(z.string()).describe('Formatting preferences'),
});

export const ConstitutionTradeoffsSchema = z.object({
  accuracy_vs_speed: z.number().min(0).max(1).describe('0 = speed, 1 = accuracy'),
  cost_sensitivity: z.number().min(0).max(1).describe('0 = cost-insensitive, 1 = highly cost-sensitive'),
  autonomy_level: z.number().min(0).max(1).describe('0 = always ask, 1 = fully autonomous'),
});

export const ConstitutionEvidencePolicySchema = z.object({
  require_citations_for: z.array(z.string()).describe('Domains/types requiring citations'),
  uncertainty_language_rules: z.array(z.string()).describe('How to express uncertainty'),
});

export const ConstitutionTaboosSchema = z.object({
  never_do: z.array(z.string()).describe('Actions that must never be taken'),
  must_escalate: z.array(z.string()).describe('Situations requiring human approval'),
});

export const ConstitutionV1Schema = z.object({
  schema_version: z.literal('constitution.v1'),
  generated_at: z.string().datetime().describe('ISO8601 timestamp'),
  generator_version: z.string().describe('TasteKit version used'),
  user_scope: z.literal('single_user'),
  
  principles: z.array(ConstitutionPrincipleSchema).describe('Ordered principles'),
  tone: ConstitutionToneSchema,
  tradeoffs: ConstitutionTradeoffsSchema,
  evidence_policy: ConstitutionEvidencePolicySchema,
  taboos: ConstitutionTaboosSchema,
  
  trace_map: z.record(z.any()).optional().describe('Maps principle_id to source answers/exemplars'),
});

export type ConstitutionV1 = z.infer<typeof ConstitutionV1Schema>;
export type ConstitutionPrinciple = z.infer<typeof ConstitutionPrincipleSchema>;
export type ConstitutionTone = z.infer<typeof ConstitutionToneSchema>;
export type ConstitutionTradeoffs = z.infer<typeof ConstitutionTradeoffsSchema>;
export type ConstitutionEvidencePolicy = z.infer<typeof ConstitutionEvidencePolicySchema>;
export type ConstitutionTaboos = z.infer<typeof ConstitutionTaboosSchema>;
