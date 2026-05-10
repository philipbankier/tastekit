import { describe, expect, it } from 'vitest';
import { Interviewer } from '../interviewer.js';
import { RubricDimensionSchema } from '../rubric.js';
import type { DomainRubric } from '../rubric.js';
import type { LLMCompletionOptions, LLMMessage, LLMProvider } from '../../llm/provider.js';
import type { InterviewState } from '../../schemas/workspace.js';

class QueueLLM implements LLMProvider {
  readonly name = 'mock-llm';
  private responses: string[];

  constructor(responses: string[]) {
    this.responses = [...responses];
  }

  async complete(_messages: LLMMessage[], _options?: LLMCompletionOptions): Promise<{ content: string }> {
    const content = this.responses.shift();
    if (!content) {
      throw new Error('No mock response available');
    }
    return { content };
  }
}

function makeRubric(withCascade = true): DomainRubric {
  return {
    domain_id: 'test-domain',
    version: '1.0.0',
    interview_goal: 'Collect test preferences',
    includes_universal: false,
    dimensions: [
      {
        id: 'focus',
        name: 'Focus',
        description: 'Primary focus',
        maps_to: ['principles'],
        depth_tiers: ['quick', 'guided', 'operator'],
        priority: 'critical',
        question_budget: { min: 1, max: 2 },
        exploration_hints: ['Ask what matters most'],
        coverage_criteria: ['A clear preference is stated'],
        cascade_to: withCascade ? [{ dimension_id: 'style', weight: 0.4 }] : undefined,
      },
      {
        id: 'style',
        name: 'Style',
        description: 'Communication style',
        maps_to: ['tone'],
        depth_tiers: ['quick', 'guided', 'operator'],
        priority: 'important',
        question_budget: { min: 0, max: 1 },
        exploration_hints: ['Ask for style adjectives'],
        coverage_criteria: ['At least one style preference is captured'],
      },
    ],
  };
}

const extractionJson = JSON.stringify({
  principles: [
    {
      statement: 'Prioritize correctness',
      rationale: 'Prevents regressions',
      priority: 1,
      applies_to: ['*'],
      examples_good: [],
      examples_bad: [],
      source_dimension: 'focus',
    },
  ],
  tone: {
    voice_keywords: ['clear'],
    forbidden_phrases: ['hype'],
    formatting_rules: ['use bullets'],
    source_dimensions: ['style'],
  },
  tradeoffs: {
    accuracy_vs_speed: 0.8,
    cost_sensitivity: 0.5,
    autonomy_level: 0.4,
    source_dimensions: ['focus'],
  },
  evidence_policy: {
    require_citations_for: ['facts'],
    uncertainty_language_rules: ['say likely when unsure'],
    source_dimensions: ['focus'],
  },
  taboos: {
    never_do: ['fabricate data'],
    must_escalate: ['production deletions'],
    source_dimensions: ['focus'],
  },
  domain_specific: {},
});

describe('Interviewer confidence-weighted coverage', () => {
  it('parses a RubricDimension with priority metadata', () => {
    const dimension = RubricDimensionSchema.parse({
      id: 'focus',
      name: 'Focus',
      description: 'Primary focus',
      maps_to: ['principles'],
      depth_tiers: ['quick'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: ['Ask what matters most'],
      coverage_criteria: ['A clear preference is stated'],
    });

    expect(dimension.priority).toBe('critical');
    expect(dimension.question_budget).toEqual({ min: 1, max: 2 });
  });

  it('defaults RubricDimension priority to important', () => {
    const dimension = RubricDimensionSchema.parse({
      id: 'focus',
      name: 'Focus',
      description: 'Primary focus',
      maps_to: ['principles'],
      depth_tiers: ['quick'],
      exploration_hints: ['Ask what matters most'],
      coverage_criteria: ['A clear preference is stated'],
    });

    expect(dimension.priority).toBe('important');
  });

  it('accumulates signals and cascades inferred confidence', async () => {
    const llm = new QueueLLM([
      `Opening question\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.2,"signal_source":"implicit","summary":"Initial hint","facts":["prefers rigor"],"anti_signals":[]}},"should_complete":false}\nCOVERAGE-->`,
      `Follow-up question\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.3,"signal_source":"explicit","summary":"Strong preference","facts":["correctness over speed"],"anti_signals":["avoid fluff"]}},"should_complete":true}\nCOVERAGE-->`,
      extractionJson,
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(true),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => 'I care about correctness over speed.',
    });

    const structured = await interviewer.run();
    const state = interviewer.getState();

    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');
    const style = state.dimension_coverage.find(d => d.dimension_id === 'style');

    expect(focus?.confidence).toBe(1.5);
    expect(focus?.status).toBe('covered');
    expect(focus?.anti_signals).toContain('avoid fluff');

    expect(style?.confidence).toBe(0.4);
    expect(style?.status).toBe('in_progress');
    expect(style?.signals.some(s => s.source === 'inferred')).toBe(true);

    expect(state.structured_answers).toBeTruthy();
    expect(structured.principles).toHaveLength(1);
  });

  it('records anti-signals without increasing confidence', async () => {
    const llm = new QueueLLM([
      `Start\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `Noted\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.0,"signal_source":"anti","summary":"Negative preference","facts":[],"anti_signals":["avoid buzzwords"]}},"should_complete":true}\nCOVERAGE-->`,
      extractionJson,
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => 'No buzzwords please.',
    });

    await interviewer.run();
    const state = interviewer.getState();
    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');

    expect(focus?.confidence).toBe(0);
    expect(focus?.anti_signals).toContain('avoid buzzwords');
  });

  it('shouldTriggerDraft returns true at 70% budget with uncovered criticals', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    const state = interviewer.getState();
    state.turn_count = 6;

    expect((interviewer as any).shouldTriggerDraft()).toBe(true);
  });

  it('shouldTriggerDraft returns false when all criticals are covered', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    const state = interviewer.getState();
    state.turn_count = 6;
    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');
    if (!focus) {
      throw new Error('Missing focus coverage');
    }
    focus.status = 'covered';

    expect((interviewer as any).shouldTriggerDraft()).toBe(false);
  });

  it('shouldTriggerDraft returns false before 70% budget', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    const state = interviewer.getState();
    state.turn_count = 5;

    expect((interviewer as any).shouldTriggerDraft()).toBe(false);
  });

  it('shouldTriggerDraft returns false when already triggered', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    const state = interviewer.getState();
    state.turn_count = 6;
    state.interview_meta = {
      ...state.interview_meta,
      draft_triggered: true,
    };

    expect((interviewer as any).shouldTriggerDraft()).toBe(false);
  });

  it('stores interview_meta in state when returned by the LLM', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    (interviewer as any).parseResponse(
      `Question\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false,"interview_meta":{"pacing_position":"early","fatigue_detected":false,"framework_active":"funnel"}}\nCOVERAGE-->`,
    );

    expect(interviewer.getState().interview_meta).toMatchObject({
      pacing_position: 'early',
      fatigue_detected: false,
      framework_active: 'funnel',
      draft_triggered: false,
      confirmation_count: 0,
    });
  });

  it('retries extraction when validator finds bugs (Bugs 2/4/5/6 regression)', async () => {
    const badExtraction = JSON.stringify({
      principles: [
        {
          statement: 'Prefer correctness',
          rationale: 'Same reason',
          priority: 1,
          applies_to: ['*'],
          examples_good: ['ex1', 'ex2'],
          examples_bad: [],
          source_dimension: 'dim_id',
        },
        {
          statement: 'Cite sources',
          rationale: 'Same reason',
          priority: 2,
          applies_to: ['*'],
          examples_good: ['ex1', 'ex2'],
          examples_bad: [],
          source_dimension: 'dim_id',
        },
      ],
      tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [], source_dimensions: [] },
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5, source_dimensions: [] },
      evidence_policy: { require_citations_for: [], uncertainty_language_rules: [], source_dimensions: [] },
      taboos: { never_do: ['Ask before deploying to prod'], must_escalate: [], source_dimensions: [] },
      domain_specific: {},
    });

    const goodExtraction = JSON.stringify({
      principles: [
        {
          statement: 'Prefer correctness',
          rationale: 'Regressions are expensive to find later',
          priority: 1,
          applies_to: ['*'],
          examples_good: ['Run tests before opening a PR'],
          examples_bad: [],
          source_dimension: 'focus',
        },
        {
          statement: 'Cite sources',
          rationale: 'Trust requires verifiability',
          priority: 2,
          applies_to: ['*'],
          examples_good: ['Inline links for stats'],
          examples_bad: [],
          source_dimension: 'style',
        },
      ],
      tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [], source_dimensions: [] },
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5, source_dimensions: [] },
      evidence_policy: { require_citations_for: [], uncertainty_language_rules: [], source_dimensions: [] },
      taboos: { never_do: [], must_escalate: ['Production deploys'], source_dimensions: [] },
      domain_specific: {},
    });

    const llm = new QueueLLM([
      `Opening\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.2,"signal_source":"implicit","summary":"hint","facts":[]}},"should_complete":false}\nCOVERAGE-->`,
      `Follow-up\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.4,"signal_source":"explicit","summary":"Strong","facts":["correctness"]}},"should_complete":true}\nCOVERAGE-->`,
      badExtraction,
      goodExtraction,
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => 'I prefer correctness.',
    });

    const result = await interviewer.run();

    expect(result.principles[0].rationale).toBe('Regressions are expensive to find later');
    expect(result.principles[1].rationale).toBe('Trust requires verifiability');
    expect(result.principles[0].source_dimension).toBe('focus');
    expect(result.principles[1].source_dimension).toBe('style');
    expect(result.taboos.must_escalate).toContain('Production deploys');
    expect(result.principles[0].examples_good).not.toEqual(result.principles[1].examples_good);
  });

  it('keeps the bad extraction if retry also fails (graceful degradation)', async () => {
    const badExtraction = JSON.stringify({
      principles: [
        { statement: 'A', rationale: 'same', priority: 1, applies_to: ['*'], source_dimension: 'dim_id' },
        { statement: 'B', rationale: 'same', priority: 2, applies_to: ['*'], source_dimension: 'dim_id' },
      ],
      tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [], source_dimensions: [] },
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5, source_dimensions: [] },
      evidence_policy: { require_citations_for: [], uncertainty_language_rules: [], source_dimensions: [] },
      taboos: { never_do: [], must_escalate: [], source_dimensions: [] },
      domain_specific: {},
    });

    const llm = new QueueLLM([
      `Opening\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.2,"signal_source":"implicit","summary":"x","facts":[]}},"should_complete":false}\nCOVERAGE-->`,
      `Follow\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.4,"signal_source":"explicit","summary":"x","facts":[]}},"should_complete":true}\nCOVERAGE-->`,
      badExtraction,
      'not valid json at all',
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => 'x',
    });

    const result = await interviewer.run();

    expect(result.principles).toHaveLength(2);
  });

  it('resumes old state snapshots without interview_meta', () => {
    const resumeFrom: InterviewState = {
      transcript: [],
      dimension_coverage: [
        {
          dimension_id: 'focus',
          status: 'not_started',
          confidence: 0,
          confidence_threshold: 1.5,
          signals: [],
          anti_signals: [],
          relevant_turns: [],
        },
        {
          dimension_id: 'style',
          status: 'not_started',
          confidence: 0,
          confidence_threshold: 1.5,
          signals: [],
          anti_signals: [],
          relevant_turns: [],
        },
      ],
      is_complete: false,
      turn_count: 0,
    };

    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
      resumeFrom,
    });

    expect(interviewer.getState().interview_meta).toMatchObject({
      draft_triggered: false,
      confirmation_count: 0,
    });
  });
});
