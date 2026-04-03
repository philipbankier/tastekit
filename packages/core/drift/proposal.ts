import { ConstitutionPrinciple } from '../schemas/constitution.js';

/**
 * Drift Proposal — Properly Typed
 *
 * Represents a proposed change to artifacts based on detected drift.
 * All fields are fully typed (no `any`).
 */

/** All recognized drift signal types */
export type DriftSignalType =
  | 'repeated_edit'
  | 'principle_violation'
  | 'user_correction'
  | 'tool_change'
  | 'staleness'
  | 'coverage_gap'
  | 'assertion_mismatch';

/** Typed proposed changes to constitution artifacts */
export interface ProposedConstitutionChange {
  add_principle?: {
    statement: string;
    priority: number;
    applies_to: string[];
  };
  modify_principle?: {
    id: string;
    changes: Partial<Pick<ConstitutionPrinciple, 'statement' | 'priority' | 'rationale' | 'applies_to'>>;
  };
  remove_principle?: {
    id: string;
    reason: string;
  };
}

/** Typed proposed changes to guardrails */
export interface ProposedGuardrailsChange {
  add_approval?: {
    rule_id: string;
    when: string;
    action: string;
  };
  modify_rate_limit?: {
    tool_ref: string;
    limit: number;
    window: string;
  };
}

/** Typed proposed changes to tone */
export interface ProposedToneChange {
  add_forbidden_phrase?: string;
  add_voice_keyword?: string;
  remove_forbidden_phrase?: string;
}

/** Typed proposed changes to skills */
export interface ProposedSkillsChange {
  suggest_skill?: {
    description: string;
    reason: string;
  };
  modify_skill?: {
    skill_id: string;
    changes: string;
  };
}

/** All possible proposed changes, organized by artifact type */
export interface ProposedChanges {
  constitution?: ProposedConstitutionChange;
  guardrails?: ProposedGuardrailsChange;
  tone?: ProposedToneChange;
  skills?: ProposedSkillsChange;
}

/** Evidence supporting a drift proposal */
export interface DriftEvidence {
  /** Sample trace event IDs or timestamps */
  event_refs?: string[];
  /** Specific reason or pattern description */
  reason?: string;
  /** Count of occurrences */
  occurrences?: number;
  /** Affected artifact or principle IDs */
  affected_ids?: string[];
  /** Free-form context */
  context?: Record<string, unknown>;
}

export interface DriftProposal {
  proposal_id: string;
  created_at: string;
  signal_type: DriftSignalType;
  frequency: number;
  rationale: string;
  proposed_changes: ProposedChanges;
  risk_rating: 'low' | 'medium' | 'high';
  evidence: DriftEvidence;
}

export interface AppliedProposal {
  proposal_id: string;
  applied_at: string;
  artifacts_updated: string[];
  recompiled: boolean;
}

// ---------------------------------------------------------------------------
// Skill-Level Amendment Proposals
// ---------------------------------------------------------------------------

/** Amendment type — what kind of change to propose for a skill */
export type SkillAmendmentType =
  | 'tighten_trigger'
  | 'add_condition'
  | 'reorder_steps'
  | 'change_output_format'
  | 'update_tool_binding';

/** A proposal to amend a specific skill based on performance evidence */
export interface SkillAmendmentProposal {
  skill_id: string;
  proposal_id: string;
  evidence: {
    total_runs: number;
    success_rate: number;
    failure_reasons: Record<string, number>;
    trend: 'improving' | 'stable' | 'degrading';
  };
  suggested_changes: string[];
  amendment_type: SkillAmendmentType;
  confidence: number;
}
