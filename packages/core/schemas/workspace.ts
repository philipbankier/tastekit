import { z } from 'zod';
import { LLMProviderConfigSchema } from '../llm/provider.js';

/**
 * Workspace Configuration Schema
 *
 * Configuration for a TasteKit workspace (.tastekit/tastekit.yaml)
 */

export const WorkspaceConfigSchema = z.object({
  version: z.string().describe('TasteKit version'),
  project_name: z.string(),
  created_at: z.string().datetime(),

  /** Selected domain (e.g., 'general-agent', 'development-agent') */
  domain_id: z.string().optional(),

  /** LLM provider configuration for onboarding */
  llm_provider: LLMProviderConfigSchema.optional(),

  onboarding: z.object({
    depth: z.enum(['quick', 'guided', 'operator']),
    completed: z.boolean().default(false),
    session_path: z.string().optional().describe('Path to canonical session.json'),
  }).optional(),

  compilation: z.object({
    last_compiled_at: z.string().datetime().optional(),
    artifacts_version: z.string().optional(),
  }).optional(),

  /** Voice configuration — validated by @actrun_ai/tastekit-voice at runtime */
  voice: z.any().optional(),
});

/**
 * Interview transcript turn
 */
export const InterviewTurnSchema = z.object({
  turn_number: z.number(),
  role: z.enum(['interviewer', 'user']),
  content: z.string(),
  timestamp: z.string(),
  dimension_refs: z.array(z.string()).optional(),
});

/**
 * Confidence signal — a single piece of evidence from a conversation turn.
 * Accumulates toward the dimension's confidence threshold (default 1.5).
 */
export const SignalSchema = z.object({
  /** Weight: HIGH=1.0, MED=0.6, LOW=0.3, INFERRED=0.2 */
  weight: z.number(),
  /** How the signal was derived */
  source: z.enum(['explicit', 'implicit', 'inferred', 'anti']),
  /** Which turn produced this signal */
  turn_number: z.number(),
  /** Optional excerpt from the conversation that produced this signal */
  excerpt: z.string().optional(),
});

/**
 * Dimension coverage tracking — with confidence-weighted signal extraction.
 *
 * Backward compatible: old sessions without confidence/signals still work
 * because all new fields have defaults.
 */
export const DimensionCoverageSchema = z.object({
  dimension_id: z.string(),
  status: z.enum(['not_started', 'in_progress', 'covered', 'skipped']),

  /** Cumulative confidence score (sum of signal weights) */
  confidence: z.number().min(0).default(0),
  /** Confidence threshold for resolution (default 1.5) */
  confidence_threshold: z.number().default(1.5),
  /** Signal history — each observation that contributed to this dimension */
  signals: z.array(SignalSchema).default([]),
  /** Explicit negatives — things the user said they do NOT want */
  anti_signals: z.array(z.string()).default([]),

  summary: z.string().optional(),
  extracted_facts: z.array(z.string()).optional(),
  relevant_turns: z.array(z.number()),
});

export const InterviewMetaSchema = z.object({
  pacing_position: z.enum(['early', 'mid', 'late']).optional(),
  fatigue_detected: z.boolean().optional(),
  framework_active: z.string().optional(),
  draft_triggered: z.boolean().default(false),
  confirmation_count: z.number().default(0),
});

/**
 * Interview state (for resume support)
 */
export const InterviewStateSchema = z.object({
  transcript: z.array(InterviewTurnSchema),
  dimension_coverage: z.array(DimensionCoverageSchema),
  is_complete: z.boolean(),
  turn_count: z.number(),
  interview_meta: InterviewMetaSchema.optional(),
  structured_answers: z.any().optional(),
});

/**
 * Session State Schema
 *
 * Resumable onboarding state (canonical: .tastekit/session.json)
 * All new fields are optional for backward compatibility with old sessions.
 */
export const SessionStateSchema = z.object({
  session_id: z.string(),
  started_at: z.string().datetime(),
  last_updated_at: z.string().datetime(),

  depth: z.enum(['quick', 'guided', 'operator']),
  current_step: z.string(),
  completed_steps: z.array(z.string()),

  answers: z.record(z.any()).describe('User answers by question ID'),

  metadata: z.record(z.any()).optional(),

  // --- LLM interview extensions (all optional for backward compat) ---

  /** Domain selected during init */
  domain_id: z.string().optional(),

  /** LLM provider used for interview */
  llm_provider: z.object({
    name: z.string(),
    model: z.string().optional(),
  }).optional(),

  /** Full interview state (for resume) */
  interview: InterviewStateSchema.optional(),

  /** Structured answers extracted by LLM at end of interview */
  structured_answers: z.any().optional(),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
export type InterviewTurn = z.infer<typeof InterviewTurnSchema>;
export type DimensionCoverage = z.infer<typeof DimensionCoverageSchema>;
export type InterviewState = z.infer<typeof InterviewStateSchema>;
export type InterviewMeta = z.infer<typeof InterviewMetaSchema>;
export type Signal = z.infer<typeof SignalSchema>;
