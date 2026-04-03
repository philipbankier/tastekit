import { TraceEvent } from '../schemas/trace.js';
import { SkillsManifestV1 } from '../schemas/skills.js';
import { TraceReader } from '../tracing/reader.js';
import { DriftProposal, DriftSignalType, ProposedChanges, DriftEvidence, SkillAmendmentProposal } from './proposal.js';
import { readFileIfExists } from '../utils/filesystem.js';
import { aggregateSkillRuns, getSkillPerformance, rankByFailureRate } from '../skills/tracker.js';

/**
 * Drift Detector — Operational Learning Loop
 *
 * Detects drift from traces using 7 signal types:
 *  1. repeated_edit     — user repeatedly rejects agent actions
 *  2. principle_violation — errors suggest principles being broken
 *  3. user_correction   — user edits right after agent output
 *  4. tool_change       — user switches tools for same task type
 *  5. staleness         — constitution hasn't been recompiled in >30 days
 *  6. coverage_gap      — tools/skills used but not in manifest
 *  7. assertion_mismatch — "never X" principle but agent does X
 *
 * Also aggregates observations and tensions for threshold-triggered review.
 */

export interface DriftDetectionOptions {
  since?: Date;
  skillId?: string;
  mode?: 'violations' | 'staleness';
  /** Path to constitution for staleness/assertion checks */
  constitutionPath?: string;
  /** Skills manifest data for coverage gap detection */
  knownSkillIds?: string[];
  /** Known tool bindings for coverage gap detection */
  knownToolRefs?: string[];
}

export interface DriftSignal {
  type: DriftSignalType;
  frequency: number;
  context: Record<string, unknown>;
}

export class DriftDetector {
  private reader: TraceReader;

  constructor() {
    this.reader = new TraceReader();
  }

  detectFromTraces(tracePaths: string[], options: DriftDetectionOptions = {}): DriftProposal[] {
    const proposals: DriftProposal[] = [];

    // Collect all events
    const allEvents: TraceEvent[] = [];
    for (const path of tracePaths) {
      const events = this.reader.readTrace(path);
      allEvents.push(...events);
    }

    // Filter by options
    let filteredEvents = allEvents;
    if (options.since) {
      filteredEvents = filteredEvents.filter(
        e => new Date(e.timestamp) >= options.since!
      );
    }
    if (options.skillId) {
      filteredEvents = this.reader.filterBySkill(filteredEvents, options.skillId);
    }

    // Detect all 7 signal types
    const signals = this.detectSignals(filteredEvents, options);

    // Generate proposals from signals
    for (const signal of signals) {
      if (signal.frequency >= 3) {
        proposals.push(this.createProposalFromSignal(signal));
      }
    }

    return proposals;
  }

  private detectSignals(events: TraceEvent[], options: DriftDetectionOptions): DriftSignal[] {
    const signals: DriftSignal[] = [];

    // 1. Repeated edits — user rejections
    signals.push(...this.detectRepeatedEdits(events));

    // 2. Principle violations — errors
    signals.push(...this.detectPrincipleViolations(events));

    // 3. User corrections — user edits after agent output
    signals.push(...this.detectUserCorrections(events));

    // 4. Tool changes — tool switching patterns
    signals.push(...this.detectToolChanges(events));

    // 5. Staleness — check constitution age
    if (options.constitutionPath) {
      signals.push(...this.detectStaleness(events, options.constitutionPath));
    }

    // 6. Coverage gaps — tools/skills used but not configured
    if (options.knownSkillIds || options.knownToolRefs) {
      signals.push(...this.detectCoverageGaps(events, options.knownSkillIds ?? [], options.knownToolRefs ?? []));
    }

    // 7. Assertion mismatches — principles say "never" but traces show it
    signals.push(...this.detectAssertionMismatches(events));

    return signals;
  }

  /** Signal 1: Repeated rejections of agent actions */
  private detectRepeatedEdits(events: TraceEvent[]): DriftSignal[] {
    const signals: DriftSignal[] = [];
    const approvalResponses = this.reader.filterByEventType(events, 'approval_response');
    const rejections = approvalResponses.filter(e => e.data?.approved === false);

    if (rejections.length > 0) {
      const reasonCounts = new Map<string, number>();
      for (const rejection of rejections) {
        const reason = rejection.data?.reason || 'unknown';
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      }

      for (const [reason, count] of reasonCounts) {
        signals.push({
          type: 'repeated_edit',
          frequency: count,
          context: { reason },
        });
      }
    }

    return signals;
  }

  /** Signal 2: Error accumulation suggests principle violations */
  private detectPrincipleViolations(events: TraceEvent[]): DriftSignal[] {
    const signals: DriftSignal[] = [];
    const errors = this.reader.getErrors(events);

    if (errors.length > 0) {
      signals.push({
        type: 'principle_violation',
        frequency: errors.length,
        context: { errors: errors.slice(0, 5).map(e => e.error ?? 'unknown') },
      });
    }

    return signals;
  }

  /** Signal 3: User edits shortly after agent produces output */
  private detectUserCorrections(events: TraceEvent[]): DriftSignal[] {
    const signals: DriftSignal[] = [];
    let corrections = 0;
    const correctedArtifacts: string[] = [];

    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];

      // Pattern: agent writes artifact, then user writes to same area
      if (
        prev.event_type === 'artifact_written' &&
        prev.actor === 'agent' &&
        curr.event_type === 'artifact_written' &&
        curr.actor === 'user'
      ) {
        const timeDiff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        const fiveMinutes = 5 * 60 * 1000;
        if (timeDiff < fiveMinutes) {
          corrections++;
          const artifact = (prev.data?.path as string) ?? 'unknown';
          if (!correctedArtifacts.includes(artifact)) {
            correctedArtifacts.push(artifact);
          }
        }
      }
    }

    if (corrections > 0) {
      signals.push({
        type: 'user_correction',
        frequency: corrections,
        context: { corrected_artifacts: correctedArtifacts },
      });
    }

    return signals;
  }

  /** Signal 4: User switches tools for similar tasks */
  private detectToolChanges(events: TraceEvent[]): DriftSignal[] {
    const signals: DriftSignal[] = [];
    const toolCalls = events.filter(e => e.event_type === 'tool_call' && e.tool_ref);

    // Group by skill_id and detect tool ref changes
    const toolsBySkill = new Map<string, Set<string>>();
    for (const event of toolCalls) {
      const skill = event.skill_id ?? '_global';
      if (!toolsBySkill.has(skill)) toolsBySkill.set(skill, new Set());
      toolsBySkill.get(skill)!.add(event.tool_ref!);
    }

    for (const [skill, tools] of toolsBySkill) {
      if (tools.size > 1) {
        signals.push({
          type: 'tool_change',
          frequency: tools.size,
          context: { skill_id: skill, tools_used: [...tools] },
        });
      }
    }

    return signals;
  }

  /** Signal 5: Constitution staleness — gap between constitution age and latest traces */
  private detectStaleness(events: TraceEvent[], constitutionPath: string): DriftSignal[] {
    const signals: DriftSignal[] = [];

    const content = readFileIfExists(constitutionPath);
    if (!content) return signals;

    try {
      const constitution = JSON.parse(content);
      const generatedAt = new Date(constitution.generated_at);
      const latestTrace = events.length > 0
        ? new Date(events[events.length - 1].timestamp)
        : new Date();

      const daysSinceCompile = (latestTrace.getTime() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCompile > 30) {
        signals.push({
          type: 'staleness',
          frequency: Math.floor(daysSinceCompile),
          context: {
            generated_at: constitution.generated_at,
            days_since: Math.floor(daysSinceCompile),
          },
        });
      }
    } catch {
      // Constitution not parseable — skip
    }

    return signals;
  }

  /** Signal 6: Tools/skills used in traces that aren't in the manifest */
  private detectCoverageGaps(events: TraceEvent[], knownSkillIds: string[], knownToolRefs: string[]): DriftSignal[] {
    const signals: DriftSignal[] = [];

    const usedSkills = new Set<string>();
    const usedTools = new Set<string>();

    for (const event of events) {
      if (event.skill_id) usedSkills.add(event.skill_id);
      if (event.tool_ref) usedTools.add(event.tool_ref);
    }

    const unknownSkills = [...usedSkills].filter(s => !knownSkillIds.includes(s));
    const unknownTools = [...usedTools].filter(t => !knownToolRefs.includes(t));

    if (unknownSkills.length + unknownTools.length > 0) {
      signals.push({
        type: 'coverage_gap',
        frequency: unknownSkills.length + unknownTools.length,
        context: {
          unknown_skills: unknownSkills,
          unknown_tools: unknownTools,
        },
      });
    }

    return signals;
  }

  /** Signal 7: "never X" principles but traces show X happening */
  private detectAssertionMismatches(events: TraceEvent[]): DriftSignal[] {
    const signals: DriftSignal[] = [];

    const principleEvents = events.filter(e => e.principle_refs && e.principle_refs.length > 0);
    const errorsWithPrinciples = principleEvents.filter(e => e.event_type === 'error');

    if (errorsWithPrinciples.length > 0) {
      const affectedPrinciples = new Set<string>();
      for (const event of errorsWithPrinciples) {
        event.principle_refs?.forEach(p => affectedPrinciples.add(p));
      }

      signals.push({
        type: 'assertion_mismatch',
        frequency: errorsWithPrinciples.length,
        context: {
          affected_principles: [...affectedPrinciples],
          sample_errors: errorsWithPrinciples.slice(0, 3).map(e => e.error ?? 'unknown'),
        },
      });
    }

    return signals;
  }

  private createProposalFromSignal(signal: DriftSignal): DriftProposal {
    const proposalId = `drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let proposedChanges: ProposedChanges = {};
    let rationale = '';

    switch (signal.type) {
      case 'repeated_edit':
        rationale = `User repeatedly rejected actions with reason: "${signal.context.reason}". This suggests a principle or preference that should be captured.`;
        proposedChanges = {
          constitution: {
            add_principle: {
              statement: `Avoid: ${signal.context.reason}`,
              priority: 10,
              applies_to: ['*'],
            },
          },
        };
        break;

      case 'principle_violation':
        rationale = `Multiple errors detected (${signal.frequency} occurrences). Review and update guardrails or principles.`;
        proposedChanges = {
          guardrails: {
            add_approval: {
              rule_id: 'auto-detected-violation',
              when: 'Similar error pattern detected',
              action: 'require_approval',
            },
          },
        };
        break;

      case 'user_correction':
        rationale = `User corrected agent output ${signal.frequency} times on: ${(signal.context.corrected_artifacts as string[])?.join(', ')}. The agent may be misunderstanding preferences.`;
        proposedChanges = {
          constitution: {
            add_principle: {
              statement: 'Review output carefully before submitting — user has corrected similar work before',
              priority: 5,
              applies_to: (signal.context.corrected_artifacts as string[]) ?? ['*'],
            },
          },
        };
        break;

      case 'tool_change':
        rationale = `Multiple tools used for skill "${signal.context.skill_id}": ${(signal.context.tools_used as string[])?.join(', ')}. Consider binding a preferred tool.`;
        proposedChanges = {
          skills: {
            modify_skill: {
              skill_id: signal.context.skill_id as string,
              changes: `Bind to preferred tool from: ${(signal.context.tools_used as string[])?.join(', ')}`,
            },
          },
        };
        break;

      case 'staleness':
        rationale = `Constitution was compiled ${signal.context.days_since} days ago. Consider recompiling to reflect any evolved preferences.`;
        proposedChanges = {};
        break;

      case 'coverage_gap': {
        const unknownSkills = (signal.context.unknown_skills as string[]) ?? [];
        const unknownTools = (signal.context.unknown_tools as string[]) ?? [];
        rationale = `Used skills/tools not in manifest: skills=[${unknownSkills.join(', ')}], tools=[${unknownTools.join(', ')}]. Consider adding to configuration.`;
        if (unknownSkills.length > 0) {
          proposedChanges = {
            skills: {
              suggest_skill: {
                description: `Add skill definitions for: ${unknownSkills.join(', ')}`,
                reason: 'Used in traces but not configured',
              },
            },
          };
        }
        break;
      }

      case 'assertion_mismatch':
        rationale = `Principles were violated ${signal.frequency} times (principles: ${(signal.context.affected_principles as string[])?.join(', ')}). Either the principles are wrong or enforcement is broken.`;
        proposedChanges = {
          constitution: {
            modify_principle: {
              id: (signal.context.affected_principles as string[])?.[0] ?? 'unknown',
              changes: { rationale: 'Review: this principle is being violated in practice' },
            },
          },
        };
        break;

      default:
        rationale = `Drift detected: ${signal.type} (${signal.frequency} occurrences)`;
    }

    const evidence: DriftEvidence = {
      reason: signal.context.reason as string | undefined,
      occurrences: signal.frequency,
      context: signal.context,
    };

    return {
      proposal_id: proposalId,
      created_at: new Date().toISOString(),
      signal_type: signal.type,
      frequency: signal.frequency,
      rationale,
      proposed_changes: proposedChanges,
      risk_rating: signal.frequency > 10 ? 'high' : signal.frequency > 5 ? 'medium' : 'low',
      evidence,
    };
  }
}

// ---------------------------------------------------------------------------
// Observation & Tension Aggregation
// ---------------------------------------------------------------------------

/** Aggregate observation events from traces */
export function aggregateObservations(events: TraceEvent[]): {
  total: number;
  by_category: Record<string, number>;
  recent: TraceEvent[];
} {
  const observations = events.filter(e => e.event_type === 'observation');
  const byCategory: Record<string, number> = {};

  for (const obs of observations) {
    const cat = obs.observation_category ?? 'uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  return {
    total: observations.length,
    by_category: byCategory,
    recent: observations.slice(-10),
  };
}

/** Aggregate tension events from traces */
export function aggregateTensions(events: TraceEvent[]): {
  total: number;
  pending: number;
  recent: TraceEvent[];
} {
  const tensions = events.filter(e => e.event_type === 'tension');
  const pending = tensions.filter(e => e.tension?.status === 'pending');

  return {
    total: tensions.length,
    pending: pending.length,
    recent: tensions.slice(-10),
  };
}

// ---------------------------------------------------------------------------
// Skill-Level Drift Detection
// ---------------------------------------------------------------------------

export interface SkillDriftOptions {
  /** Success rate below this triggers a proposal. Default: 0.7 */
  successThreshold?: number;
  /** Minimum runs before a skill is evaluated. Default: 3 */
  minRuns?: number;
}

/**
 * Detect underperforming skills from traces and generate amendment proposals.
 */
export function detectSkillDrift(
  events: TraceEvent[],
  manifest?: SkillsManifestV1,
  options: SkillDriftOptions = {},
): SkillAmendmentProposal[] {
  const threshold = options.successThreshold ?? 0.7;
  const minRuns = options.minRuns ?? 3;

  const records = aggregateSkillRuns(events);
  const reports = rankByFailureRate(getSkillPerformance(records));
  const proposals: SkillAmendmentProposal[] = [];

  for (const report of reports) {
    if (report.total_runs < minRuns) continue;
    if (report.success_rate >= threshold) continue;

    // Determine amendment type from failure patterns
    const amendmentType = inferAmendmentType(report.failure_reasons);
    const suggestedChanges = generateSuggestions(report, manifest);

    // Confidence based on how far below threshold + how many runs
    const distanceBelowThreshold = threshold - report.success_rate;
    const runConfidence = Math.min(1, report.total_runs / 10);
    const confidence = Math.round(Math.min(1, distanceBelowThreshold + runConfidence * 0.3) * 100) / 100;

    proposals.push({
      skill_id: report.skill_id,
      proposal_id: `skill_amend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      evidence: {
        total_runs: report.total_runs,
        success_rate: report.success_rate,
        failure_reasons: report.failure_reasons,
        trend: report.trend,
      },
      suggested_changes: suggestedChanges,
      amendment_type: amendmentType,
      confidence,
    });
  }

  return proposals;
}

function inferAmendmentType(failureReasons: Record<string, number>): SkillAmendmentProposal['amendment_type'] {
  const reasons = Object.keys(failureReasons).join(' ').toLowerCase();

  if (reasons.includes('tool') || reasons.includes('binding')) return 'update_tool_binding';
  if (reasons.includes('format') || reasons.includes('output')) return 'change_output_format';
  if (reasons.includes('trigger') || reasons.includes('routing')) return 'tighten_trigger';
  if (reasons.includes('step') || reasons.includes('order')) return 'reorder_steps';
  return 'add_condition';
}

function generateSuggestions(
  report: { skill_id: string; success_rate: number; failure_reasons: Record<string, number>; trend: string },
  _manifest?: SkillsManifestV1,
): string[] {
  const suggestions: string[] = [];

  if (report.success_rate < 0.3) {
    suggestions.push(`Skill "${report.skill_id}" is critically underperforming (${(report.success_rate * 100).toFixed(0)}% success). Consider a full rewrite or replacement.`);
  } else if (report.success_rate < 0.5) {
    suggestions.push(`Skill "${report.skill_id}" has low success rate (${(report.success_rate * 100).toFixed(0)}%). Review procedure steps and add missing conditions.`);
  }

  const topFailures = Object.entries(report.failure_reasons)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  for (const [reason, count] of topFailures) {
    suggestions.push(`Address recurring failure (${count}x): ${reason}`);
  }

  if (report.trend === 'degrading') {
    suggestions.push('Performance is degrading over time — check for environment/codebase changes affecting this skill.');
  }

  return suggestions;
}

/** Check if accumulated observations/tensions warrant a meta-review */
export function shouldTriggerReview(
  observations: ReturnType<typeof aggregateObservations>,
  tensions: ReturnType<typeof aggregateTensions>,
): boolean {
  return observations.total >= 10 || tensions.pending >= 5;
}
