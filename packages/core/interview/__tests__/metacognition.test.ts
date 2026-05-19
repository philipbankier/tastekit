import { describe, expect, it } from 'vitest';
import type { RubricDimension } from '../rubric.js';
import type { InterviewState } from '../../schemas/workspace.js';
import {
  createMetacognitiveState,
  decideNextInterviewAction,
  getSafetyTurnLimit,
  isMetacognitiveCoverageSufficient,
} from '../metacognition.js';

function dimensions(): RubricDimension[] {
  return [
    {
      id: 'core',
      name: 'Core',
      description: 'Core preference',
      maps_to: ['principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: ['Ask what matters most'],
      coverage_criteria: ['User states what matters most'],
    },
    {
      id: 'style',
      name: 'Style',
      description: 'Style preference',
      maps_to: ['tone'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: ['Listen for style'],
      coverage_criteria: ['Style is stated or safely inferred'],
    },
    {
      id: 'nice',
      name: 'Nice',
      description: 'Nice to have',
      maps_to: ['domain_specific'],
      depth_tiers: ['operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: ['Optional'],
      coverage_criteria: ['Optional preference is captured if available'],
    },
  ];
}

function baseState(): InterviewState {
  return {
    transcript: [],
    dimension_coverage: [
      {
        dimension_id: 'core',
        status: 'not_started',
        confidence: 0,
        confidence_threshold: 1.5,
        signals: [],
        anti_signals: [],
        relevant_turns: [],
      },
      {
        dimension_id: 'style',
        status: 'in_progress',
        confidence: 0.4,
        confidence_threshold: 1.5,
        signals: [{ weight: 0.4, source: 'inferred', turn_number: 1, excerpt: 'Cascaded from core' }],
        anti_signals: [],
        summary: 'Likely prefers concise direct style',
        relevant_turns: [1],
      },
      {
        dimension_id: 'nice',
        status: 'not_started',
        confidence: 0,
        confidence_threshold: 1.5,
        signals: [],
        anti_signals: [],
        relevant_turns: [],
      },
    ],
    is_complete: false,
    turn_count: 8,
    interview_meta: {
      draft_triggered: false,
      confirmation_count: 0,
    },
    metacognition: createMetacognitiveState('operator', 'test-domain'),
  };
}

describe('metacognitive onboarding policy', () => {
  it('asks for uncovered critical dimensions before accepting completion', () => {
    const state = baseState();

    const decision = decideNextInterviewAction({
      depth: 'operator',
      dimensions: dimensions(),
      state,
      llmSuggestedComplete: true,
    });

    expect(decision.action).toBe('ask');
    expect(decision.target_dimension_ids).toEqual(['core']);
    expect(decision.reason_codes).toContain('critical_uncovered');
  });

  it('does not count anti-signals plus a summary as covered when confidence is below threshold', () => {
    const state = baseState();
    const core = state.dimension_coverage.find(d => d.dimension_id === 'core');
    if (!core) throw new Error('missing core');
    core.status = 'in_progress';
    core.confidence = 1.2;
    core.confidence_threshold = 1.5;
    core.summary = 'Mostly clear, but not enough concrete evidence yet.';
    core.anti_signals = ['Avoid shallow agreement.'];
    state.metacognition.confirmed_dimension_ids = ['core'];

    const decision = decideNextInterviewAction({
      depth: 'operator',
      dimensions: dimensions(),
      state,
      llmSuggestedComplete: true,
    });

    expect(decision.action).toBe('ask');
    expect(decision.reason_codes).toContain('critical_uncovered');
    expect(state.metacognition.coverage_summary.critical.covered).toBe(0);
  });

  it('requires confirmed criticals and an accepted draft checkpoint before Full mode stops', () => {
    const state = baseState();
    const core = state.dimension_coverage.find(d => d.dimension_id === 'core');
    if (!core) throw new Error('missing core');
    core.status = 'covered';
    core.confidence = 1.7;
    core.summary = 'Correctness over speed';
    state.metacognition.confirmed_dimension_ids = ['core'];

    expect(isMetacognitiveCoverageSufficient('operator', dimensions(), state)).toBe(false);

    state.metacognition.policy_decisions.push({
      turn_number: 9,
      action: 'draft',
      target_dimension_ids: ['core', 'style'],
      reason_codes: ['full_draft_checkpoint_required'],
    });
    state.metacognition.confirmation_checkpoints.push({
      id: 'draft-1',
      turn_number: 10,
      type: 'draft',
      dimension_ids: ['core', 'style'],
      accepted: true,
      summary: 'Draft accepted',
    });

    expect(isMetacognitiveCoverageSufficient('operator', dimensions(), state)).toBe(true);
  });

  it('does not let fatigue block stop once Full coverage is sufficient', () => {
    const state = baseState();
    const core = state.dimension_coverage.find(d => d.dimension_id === 'core');
    if (!core) throw new Error('missing core');
    core.status = 'covered';
    core.confidence = 1.7;
    core.summary = 'Correctness over speed';
    state.interview_meta = {
      ...state.interview_meta,
      fatigue_detected: true,
    };
    state.metacognition.confirmed_dimension_ids = ['core'];
    state.metacognition.policy_decisions.push({
      turn_number: 9,
      action: 'draft',
      target_dimension_ids: ['core', 'style'],
      reason_codes: ['full_draft_checkpoint_required'],
    });
    state.metacognition.confirmation_checkpoints.push({
      id: 'draft-1',
      turn_number: 10,
      type: 'draft',
      dimension_ids: ['core', 'style'],
      accepted: true,
      summary: 'Draft accepted',
    });

    expect(decideNextInterviewAction({
      depth: 'operator',
      dimensions: dimensions(),
      state,
      llmSuggestedComplete: true,
    }).action).toBe('stop');
  });

  it('does not keep summarizing forever after a fatigue compression pass', () => {
    const state = baseState();
    state.interview_meta = {
      ...state.interview_meta,
      fatigue_detected: true,
    };

    const firstDecision = decideNextInterviewAction({
      depth: 'operator',
      dimensions: dimensions(),
      state,
    });
    expect(firstDecision.action).toBe('summarize');

    state.metacognition.policy_decisions.push({
      turn_number: 8,
      action: firstDecision.action,
      target_dimension_ids: firstDecision.target_dimension_ids,
      reason_codes: firstDecision.reason_codes,
    });

    const nextDecision = decideNextInterviewAction({
      depth: 'operator',
      dimensions: dimensions(),
      state,
    });

    expect(nextDecision.action).toBe('ask');
    expect(nextDecision.reason_codes).toContain('critical_uncovered');
  });

  it('rejects early draft checkpoints that were not requested by the policy', () => {
    const state = baseState();
    const core = state.dimension_coverage.find(d => d.dimension_id === 'core');
    if (!core) throw new Error('missing core');
    core.status = 'covered';
    core.confidence = 1.7;
    core.summary = 'Correctness over speed';
    state.metacognition.confirmed_dimension_ids = ['core'];
    state.metacognition.confirmation_checkpoints.push({
      id: 'draft-early',
      turn_number: 2,
      type: 'draft',
      dimension_ids: ['core', 'style'],
      accepted: true,
      summary: 'Early draft accepted',
    });

    const decision = decideNextInterviewAction({
      depth: 'operator',
      dimensions: dimensions(),
      state,
      llmSuggestedComplete: true,
    });

    expect(decision.action).toBe('draft');
    expect(decision.reason_codes).toContain('full_draft_checkpoint_required');
  });

  it('keeps Full mode safety as a runaway guard rather than the old 25-exchange cap', () => {
    expect(getSafetyTurnLimit('operator', dimensions())).toBe(90);
    expect(getSafetyTurnLimit('operator', Array.from({ length: 31 }, (_, index) => ({
      ...dimensions()[0],
      id: `dim_${index}`,
    })))).toBe(124);
  });
});
