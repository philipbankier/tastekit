import type {
  DimensionCoverage,
  InterviewState,
  MetacognitiveAction,
  MetacognitivePriority,
  MetacognitiveState,
} from '../schemas/workspace.js';
import type { RubricDimension } from './rubric.js';

export interface InterviewPolicyDecision {
  action: MetacognitiveAction;
  target_dimension_ids: string[];
  reason_codes: string[];
}

export interface InterviewPolicyInput {
  depth: 'quick' | 'guided' | 'operator';
  dimensions: RubricDimension[];
  state: InterviewState;
  llmSuggestedComplete?: boolean;
}

const EMPTY_BUCKET = {
  total: 0,
  covered: 0,
  confirmed: 0,
  inferred: 0,
};

export function publicDepthLabel(depth: 'quick' | 'guided' | 'operator'): string {
  switch (depth) {
    case 'quick':
      return 'Quick';
    case 'guided':
      return 'Guided';
    case 'operator':
      return 'Full Taste Composition';
  }
}

export function createMetacognitiveState(
  depth: 'quick' | 'guided' | 'operator',
  domainId?: string,
): MetacognitiveState {
  return {
    schema_version: 'tastekit.metacognition.v1',
    depth,
    public_depth_label: publicDepthLabel(depth),
    ...(domainId ? { domain_id: domainId } : {}),
    coverage_summary: {
      critical: { ...EMPTY_BUCKET },
      important: { ...EMPTY_BUCKET },
      nice_to_have: { ...EMPTY_BUCKET },
      inferable: { ...EMPTY_BUCKET },
      total_dimensions: 0,
      covered_dimensions: 0,
    },
    unresolved_assumptions: [],
    conflicts: [],
    confirmation_checkpoints: [],
    fatigue_events: [],
    policy_decisions: [],
    confirmed_dimension_ids: [],
  };
}

export function ensureMetacognitiveState(
  state: InterviewState,
  depth: 'quick' | 'guided' | 'operator',
  domainId?: string,
): MetacognitiveState {
  if (!state.metacognition) {
    state.metacognition = createMetacognitiveState(depth, domainId);
  }
  return state.metacognition;
}

export function decideNextInterviewAction(input: InterviewPolicyInput): InterviewPolicyDecision {
  const { depth, dimensions, state } = input;
  const metacognition = ensureMetacognitiveState(state, depth);
  refreshMetacognitiveCoverageSummary(state, dimensions);
  const compressForFatigue = shouldCompressForFatigue(state, metacognition);

  const unresolvedConflict = metacognition.conflicts.find(conflict => conflict.status === 'unresolved');
  if (unresolvedConflict) {
    return decision('resolve_conflict', unresolvedConflict.dimension_id ? [unresolvedConflict.dimension_id] : [], 'unresolved_conflict');
  }

  const uncoveredCriticals = dimensions
    .filter(dimension => dimension.priority === 'critical')
    .filter(dimension => !isCovered(coverageFor(state, dimension.id)));
  if (uncoveredCriticals.length > 0) {
    if (compressForFatigue) {
      return decision('summarize', uncoveredDimensionIds(state, dimensions), 'fatigue_detected');
    }
    return decision('ask', [uncoveredCriticals[0].id], 'critical_uncovered');
  }

  if (depth === 'operator') {
    const unconfirmedCriticals = dimensions
      .filter(dimension => dimension.priority === 'critical')
      .filter(dimension => !isConfirmed(metacognition, dimension.id));
    if (unconfirmedCriticals.length > 0) {
      if (compressForFatigue) {
        return decision('summarize', unconfirmedCriticals.map(dimension => dimension.id), 'fatigue_detected');
      }
      return decision('confirm', unconfirmedCriticals.map(dimension => dimension.id), 'critical_unconfirmed');
    }

    const importantNeedingAction = dimensions
      .filter(dimension => dimension.priority === 'important')
      .filter(dimension => {
        const coverage = coverageFor(state, dimension.id);
        return !isCovered(coverage) && !isExplicitlyInferred(coverage);
      });
    if (importantNeedingAction.length > 0) {
      if (compressForFatigue) {
        return decision('summarize', importantNeedingAction.map(dimension => dimension.id), 'fatigue_detected');
      }
      const mustAsk = importantNeedingAction.find(dimension => (dimension.question_budget?.min ?? 0) > 0);
      return mustAsk
        ? decision('ask', [mustAsk.id], 'important_uncovered')
        : decision('infer', importantNeedingAction.map(dimension => dimension.id), 'important_inferable');
    }

    if (!hasAcceptedPolicyRequestedDraftCheckpoint(metacognition)) {
      return decision('draft', coveredOrInferredDimensionIds(state, dimensions), 'full_draft_checkpoint_required');
    }
  }

  if (depth === 'guided' && !hasAnyAcceptedCheckpoint(metacognition)) {
    return decision('confirm', coveredOrInferredDimensionIds(state, dimensions), 'guided_confirmation_required');
  }

  return decision('stop', [], input.llmSuggestedComplete ? 'coverage_sufficient_llm_complete' : 'coverage_sufficient');
}

export function isMetacognitiveCoverageSufficient(
  depth: 'quick' | 'guided' | 'operator',
  dimensions: RubricDimension[],
  state: InterviewState,
): boolean {
  return decideNextInterviewAction({ depth, dimensions, state }).action === 'stop';
}

export function getSafetyTurnLimit(
  depth: 'quick' | 'guided' | 'operator',
  dimensions: RubricDimension[],
): number {
  switch (depth) {
    case 'quick':
      return 24;
    case 'guided':
      return 45;
    case 'operator':
      return Math.max(90, dimensions.length * 4);
  }
}

export function refreshMetacognitiveCoverageSummary(
  state: InterviewState,
  dimensions: RubricDimension[],
): MetacognitiveState['coverage_summary'] {
  const metacognition = ensureMetacognitiveState(state, state.metacognition?.depth ?? 'guided');
  const summary = {
    critical: { ...EMPTY_BUCKET },
    important: { ...EMPTY_BUCKET },
    nice_to_have: { ...EMPTY_BUCKET },
    inferable: { ...EMPTY_BUCKET },
    total_dimensions: dimensions.length,
    covered_dimensions: 0,
  };

  for (const dimension of dimensions) {
    const bucket = bucketForPriority(summary, dimension.priority);
    const coverage = coverageFor(state, dimension.id);
    bucket.total++;
    if (isCovered(coverage)) {
      bucket.covered++;
      summary.covered_dimensions++;
    }
    if (isConfirmed(metacognition, dimension.id)) {
      bucket.confirmed++;
    }
    if (isExplicitlyInferred(coverage)) {
      bucket.inferred++;
    }
  }

  metacognition.coverage_summary = summary;
  return summary;
}

function decision(
  action: MetacognitiveAction,
  targetDimensionIds: string[],
  reasonCode: string,
): InterviewPolicyDecision {
  return {
    action,
    target_dimension_ids: targetDimensionIds,
    reason_codes: [reasonCode],
  };
}

function coverageFor(state: InterviewState, dimensionId: string): DimensionCoverage | undefined {
  return state.dimension_coverage.find(coverage => coverage.dimension_id === dimensionId);
}

function isCovered(coverage: DimensionCoverage | undefined): boolean {
  if (!coverage) return false;
  if (coverage.status === 'covered') return true;
  return (coverage.confidence ?? 0) >= (coverage.confidence_threshold ?? 1.5);
}

function isExplicitlyInferred(coverage: DimensionCoverage | undefined): boolean {
  return !!coverage?.signals?.some(signal => signal.source === 'inferred');
}

function isConfirmed(metacognition: MetacognitiveState, dimensionId: string): boolean {
  return metacognition.confirmed_dimension_ids.includes(dimensionId);
}

function shouldCompressForFatigue(state: InterviewState, metacognition: MetacognitiveState): boolean {
  if (!state.interview_meta?.fatigue_detected) return false;

  const summarizeTurns = metacognition.policy_decisions
    .filter(decision => decision.action === 'summarize' && decision.reason_codes.includes('fatigue_detected'))
    .map(decision => decision.turn_number);
  const lastSummarizeTurn = summarizeTurns.length > 0 ? Math.max(...summarizeTurns) : undefined;
  if (lastSummarizeTurn === undefined) return true;

  return metacognition.fatigue_events.some(event => event.turn_number > lastSummarizeTurn);
}

function hasAcceptedPolicyRequestedDraftCheckpoint(metacognition: MetacognitiveState): boolean {
  const draftRequestTurn = metacognition.policy_decisions
    .filter(decision => decision.action === 'draft')
    .map(decision => decision.turn_number)
    .sort((a, b) => a - b)[0];
  if (draftRequestTurn === undefined) return false;

  return metacognition.confirmation_checkpoints.some(checkpoint => (
    checkpoint.type === 'draft' && checkpoint.accepted
    && checkpoint.turn_number > draftRequestTurn
  ));
}

function hasAnyAcceptedCheckpoint(metacognition: MetacognitiveState): boolean {
  return metacognition.confirmation_checkpoints.some(checkpoint => checkpoint.accepted);
}

function uncoveredDimensionIds(state: InterviewState, dimensions: RubricDimension[]): string[] {
  return dimensions
    .filter(dimension => !isCovered(coverageFor(state, dimension.id)))
    .map(dimension => dimension.id);
}

function coveredOrInferredDimensionIds(state: InterviewState, dimensions: RubricDimension[]): string[] {
  return dimensions
    .filter(dimension => {
      const coverage = coverageFor(state, dimension.id);
      return isCovered(coverage) || isExplicitlyInferred(coverage);
    })
    .map(dimension => dimension.id);
}

function bucketForPriority(
  summary: MetacognitiveState['coverage_summary'],
  priority: MetacognitivePriority,
): MetacognitiveState['coverage_summary']['critical'] {
  switch (priority) {
    case 'critical':
      return summary.critical;
    case 'important':
      return summary.important;
    case 'nice-to-have':
      return summary.nice_to_have;
    case 'inferable':
      return summary.inferable;
  }
}
