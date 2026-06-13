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
    const inputs = ['No buzzwords please.', '/finish'];
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
      getUserInput: async () => inputs.shift() ?? '/finish',
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

  it('stores metacognitive confirmation checkpoints from hidden metadata', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    (interviewer as any).parseResponse(
      `Looks right.\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{},"should_complete":false,"interview_meta":{"confirmation_event":{"type":"draft","dimension_ids":["focus"],"accepted":true,"summary":"Draft profile accepted"}}}\nCOVERAGE-->`,
    );

    expect(interviewer.getState().metacognition?.confirmation_checkpoints).toContainEqual({
      id: 'checkpoint-0',
      turn_number: 0,
      type: 'draft',
      dimension_ids: ['focus'],
      accepted: true,
      summary: 'Draft profile accepted',
    });
    expect(interviewer.getState().metacognition?.confirmed_dimension_ids).toContain('focus');
  });

  it('does not accept LLM completion in Full mode when critical coverage is missing', async () => {
    const llm = new QueueLLM([
      `Opening\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `I have enough to finish.\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":true}\nCOVERAGE-->`,
      'not valid extraction json',
    ]);

    const inputs = ['Not enough detail yet.', '/save'];
    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();

    expect(interviewer.getState().is_complete).toBe(false);
    expect(interviewer.getState().metacognition?.policy_decisions.some(decision => (
      decision.action === 'ask' && decision.reason_codes.includes('critical_uncovered')
    ))).toBe(true);
  });

  it('recovers coverage from the last exchange when an interviewer omits hidden metadata', async () => {
    const fallbackCoverageJson = JSON.stringify({
      dimension_updates: {
        focus: {
          status: 'covered',
          confidence_delta: 1.6,
          signal_source: 'explicit',
          summary: 'User prioritizes correctness and assumption checking.',
          facts: ['Correctness matters more than speed', 'Weak assumptions should be surfaced'],
          anti_signals: ['avoid shallow agreement'],
        },
      },
      should_complete: true,
    });

    const llm = new QueueLLM([
      'Opening question without metadata',
      'Natural follow-up without hidden metadata',
      fallbackCoverageJson,
      extractionJson,
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'quick',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => 'I care most about correctness and surfacing weak assumptions, not shallow agreement.',
    });

    const result = await interviewer.run();
    const state = interviewer.getState();
    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');

    expect(state.is_complete).toBe(true);
    expect(focus?.status).toBe('covered');
    expect(focus?.confidence).toBe(1.6);
    expect(focus?.anti_signals).toContain('avoid shallow agreement');
    expect(result.principles).toHaveLength(1);
  });

  it('stops when the user accepts a draft with natural finish language', async () => {
    const llm = new QueueLLM([
      `What are you building?\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.6,"signal_source":"explicit","summary":"High-stakes operator agent","facts":["wants rigorous agent behavior"]}},"should_complete":false}\nCOVERAGE-->`,
      [
        '**Core Purpose**',
        'High-stakes operator workflows.',
        '',
        '**Autonomy & Boundaries**',
        'Ask before risky changes.',
      ].join('\n'),
      '{"dimension_updates":{},"should_complete":false}',
      extractionJson,
    ]);
    const inputs = [
      'I need a rigorous operator agent.',
      "This lands. That's enough to work with.",
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? "This lands. That's enough to work with.",
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(state.transcript.at(-1)?.content).toBe("This lands. That's enough to work with.");
    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
    expect(state.dimension_coverage.find(coverage => coverage.dimension_id === 'style')?.status).toBe('covered');
    expect(state.dimension_coverage.find(coverage => coverage.dimension_id === 'style')?.signals).toContainEqual(expect.objectContaining({
      source: 'inferred',
    }));
    expect(state.metacognition?.unresolved_assumptions.some(assumption => (
      assumption.source === 'user_finish_now'
    ))).toBe(false);
  });

  it('counts accepted compressed synthesis as a draft checkpoint before finishing', async () => {
    const llm = new QueueLLM([
      `What are you building?\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.6,"signal_source":"explicit","summary":"High-stakes operator agent","facts":["wants rigorous agent behavior"]}},"should_complete":false}\nCOVERAGE-->`,
      [
        'Revised take: the agent should function with a Chief-of-Staff posture that proactively challenges when relevant,',
        'executes cleanly once direction is set, offers distinct real options with tradeoffs and its own lean,',
        'and generates unexpected connections only when grounded in basis plus confidence.',
        'Does that land better, or still anything to adjust before we wrap?',
      ].join(' '),
      '{"dimension_updates":{},"should_complete":false}',
      extractionJson,
    ]);
    const inputs = [
      'I need a rigorous operator agent.',
      "Yeah, that lands. That's probably enough to work with.",
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? "Yeah, that lands. That's probably enough to work with.",
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
  });

  it('does not finish on contextual agreement when the prior turn is not a draft checkpoint', async () => {
    const llm = new QueueLLM([
      `One narrow hypothesis: you prefer concise answers. Does that work?\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.7,"signal_source":"explicit","summary":"May prefer concise answers","facts":["prefers concise answers"]}},"should_complete":false}\nCOVERAGE-->`,
      `What else matters?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      '{"dimension_updates":{},"should_complete":false}',
    ]);
    const inputs = ['That works.', '/save'];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(false);
    expect(state.metacognition?.confirmation_checkpoints.some(checkpoint => checkpoint.type === 'draft')).toBe(false);
  });

  it('does not hard-finish on negated enough-to-work-with feedback', async () => {
    const llm = new QueueLLM([
      [
        '**Core Purpose**',
        'Draft: you want a rigorous operator agent.',
        'Does this land, or is anything missing before we wrap?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.7,"signal_source":"explicit","summary":"Needs a rigorous operator agent","facts":["rigorous operator agent"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      `What is missing?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      '{"dimension_updates":{},"should_complete":false}',
    ]);
    const inputs = ["That's not enough to work with.", '/save'];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(false);
    expect(state.transcript.some(turn => turn.content === "That's not enough to work with.")).toBe(true);
    expect(state.metacognition?.confirmation_checkpoints.some(checkpoint => checkpoint.type === 'draft')).toBe(false);
  });

  it('does not hard-finish when the user asks whether the interviewer has enough to work with', async () => {
    const llm = new QueueLLM([
      [
        'How should this behave in practice?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.9,"signal_source":"explicit","summary":"Wants evidence-backed challenge","facts":["challenge assumptions with evidence"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      `Thanks, that helps. What approval boundaries matter most?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      '{"dimension_updates":{},"should_complete":false}',
    ]);
    const inputs = [
      'The agent should open by naming the hidden assumption, give confidence, and show options with evidence. Does that give you enough to work with?',
      '/save',
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(false);
    expect(state.transcript.some(turn => turn.content.includes('Does that give you enough to work with?'))).toBe(true);
    expect(state.metacognition?.unresolved_assumptions.some(assumption => (
      assumption.source === 'user_finish_now'
    ))).toBe(false);
  });

  it('counts natural sign-off language as accepting the prior draft checkpoint', async () => {
    const llm = new QueueLLM([
      [
        'From everything you have shared, the agent should be a direct high-stakes thinking partner that surfaces risk clearly.',
        'Does this line up with how you see the agent operating, or what needs adjusting before we refine further?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.8,"signal_source":"explicit","summary":"Needs direct high-stakes thinking partner","facts":["direct thinking partner"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      `Got it. What else matters?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      '{"dimension_updates":{},"should_complete":false}',
    ]);
    const inputs = [
      "Yeah, this is much closer. I'd sign off on this as a working description. This is workable.",
      '/save',
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
    expect(state.is_complete).toBe(false);
  });

  it('stops when the user says to ship an accepted draft', async () => {
    const llm = new QueueLLM([
      [
        'Here is the revised profile.',
        '',
        '**Core Purpose**',
        'Move fast on reversible work, pause on irreversible work, and challenge weak plans.',
        '',
        'Does this version better capture the balance?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"covered","confidence_delta":1.7,"signal_source":"explicit","summary":"Needs bold operator-grade thinking partner","facts":["move fast on reversible work","pause on irreversible work"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      extractionJson,
    ]);
    const inputs = [
      "Yeah. This is right. I'd use this. Ship it.",
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
  });

  it('stops when the user ships after accepting a compressed working-draft checkpoint', async () => {
    const rubric = makeRubric(false);
    rubric.dimensions = [
      ...rubric.dimensions,
      {
        id: 'safety',
        name: 'Safety',
        description: 'Safety posture',
        maps_to: ['taboos'],
        depth_tiers: ['operator'],
        priority: 'critical',
        question_budget: { min: 1, max: 2 },
        exploration_hints: ['Ask about safety boundaries'],
        coverage_criteria: ['Safety boundaries are captured'],
      },
    ];
    const llm = new QueueLLM([
      [
        'Thanks for the correction. Risk should be surfaced clearly without defaulting to timidity, and memory should stick to recurring patterns from corrections rather than hoarding everything.',
        '',
        'Does that give us a complete enough picture, or is there one last thing you would tweak?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":1.1,"signal_source":"explicit","summary":"Needs risk surfaced without timidity","facts":["risk surfaced not avoided","memory keeps recurring correction patterns"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      `Perfect. I have a solid sense of the profile now.\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      extractionJson,
      extractionJson,
    ]);
    const inputs = [
      "I think we've got it. The picture is clear enough for a working draft. One last thing though: surface inferred intent.",
      "Good. Let's ship it.",
    ];
    let inputCalls = 0;

    const interviewer = new Interviewer({
      llm,
      rubric,
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => {
        inputCalls += 1;
        return inputs.shift() ?? '/save';
      },
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(inputCalls).toBe(2);
    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
  });

  it('stops when the user explicitly says to lock in an accepted draft', async () => {
    const llm = new QueueLLM([
      [
        '**Core Purpose**',
        'An operator-grade thinking partner for high-stakes ambiguous workflows.',
        '',
        '**Evidence & Quality Bar**',
        "Deliverables should be honest about what's unfinished or uncertain.",
        '',
        'Does this version land, or should we tweak anything before we lock it in?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"covered","confidence_delta":1.7,"signal_source":"explicit","summary":"Needs operator-grade thinking partner","facts":["operator-grade thinking partner"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      extractionJson,
    ]);
    const inputs = [
      "Lock it in with that. This is usable.",
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
  });

  it('stops when the user closes the session after a draft endpoint', async () => {
    const llm = new QueueLLM([
      [
        '**Core Purpose**',
        'An operator-grade thinking partner for high-stakes ambiguous workflows.',
        '',
        '**Autonomy & Boundaries**',
        'Pause on irreversible or external actions.',
        '',
        'Does this feel like the right endpoint before we lock it in?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"covered","confidence_delta":1.7,"signal_source":"explicit","summary":"Needs operator-grade thinking partner","facts":["operator-grade thinking partner"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      extractionJson,
    ]);
    const inputs = [
      "I think we've officially hit the natural endpoint here. Take care.",
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
  });

  it('does not treat a hard stop after a draft as draft acceptance', async () => {
    const llm = new QueueLLM([
      [
        '**Core Purpose**',
        'An operator-grade thinking partner for high-stakes ambiguous workflows.',
        '',
        '**Autonomy & Boundaries**',
        'Pause on irreversible or external actions.',
        '',
        'Does this feel like the right endpoint before we lock it in?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"covered","confidence_delta":1.7,"signal_source":"explicit","summary":"Needs operator-grade thinking partner","facts":["operator-grade thinking partner"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      extractionJson,
    ]);
    const inputs = [
      'Stop here and save what you have.',
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(state.metacognition?.confirmation_checkpoints.some(checkpoint => (
      checkpoint.type === 'draft' && checkpoint.accepted
    ))).toBe(false);
  });

  it('stops when the user says the complete profile is ready to configure', async () => {
    const llm = new QueueLLM([
      [
        "Here's the complete working profile:",
        '',
        'The agent is a forward-moving creative partner for operator workflows and high-stakes decisions.',
        'It generates options, explores paths the user has not considered, drafts real artifacts, and proposes unconventional approaches with rationale, tradeoffs, and confidence.',
        'It flags missing evidence, stale assumptions, and thin data before building recommendations on them.',
        'Risk awareness is proportional: brief for low-stakes work, explicit for irreversible, production-facing, or external work.',
        'The profile itself is a living reference, not a script; the agent should adapt to actual behavior.',
        '',
        'Ready to turn this into the actual agent configuration?',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"covered","confidence_delta":1.7,"signal_source":"explicit","summary":"Needs living operator profile","facts":["living reference not script"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      extractionJson,
    ]);
    const inputs = ['Ready.'];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
  });

  it('stops when the user ships a final compressed agent spec', async () => {
    const llm = new QueueLLM([
      [
        '**Final Compressed Agent Spec**',
        '',
        '**Mission**',
        'High-judgment operator agent for messy, high-stakes workflows.',
        '',
        '**Core Operating Principles**',
        '- Risk-aware, not risk-averse.',
        '- Match alarm volume to certainty.',
        '- Notice when casual brainstorming is becoming a production decision.',
        '',
        '**Autonomy & Modes**',
        '- Research mode: cite sources and mark uncertainty.',
        '- Drafting mode: fast first pass with assumptions called out.',
        '',
        '**Tone**',
        'Direct, substantive, non-cheerleading, non-deferential.',
        '',
        'This should be ready to reference. Let me know if you want any further adjustments.',
        '<!--COVERAGE',
        '{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"covered","confidence_delta":1.7,"signal_source":"explicit","summary":"Needs compressed operator spec","facts":["compressed operator spec"]}},"should_complete":false}',
        'COVERAGE-->',
      ].join('\n'),
      extractionJson,
    ]);
    const inputs = [
      'Perfect. This is it. Ship it.',
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(state.metacognition?.confirmation_checkpoints).toContainEqual(expect.objectContaining({
      type: 'draft',
      accepted: true,
    }));
  });

  it('records user fatigue when the user asks to compress the interview', async () => {
    const llm = new QueueLLM([
      `What update cadence do you prefer?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `Understood, I will compress into a synthesis.\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      '{"dimension_updates":{},"should_complete":false}',
    ]);
    const inputs = [
      "Can we compress some of this? I feel like I've been answering variations of the same question.",
      '/save',
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.interview_meta?.fatigue_detected).toBe(true);
    expect(state.metacognition?.fatigue_events).toContainEqual(expect.objectContaining({
      signal: 'user_fatigue_signal',
    }));
  });

  it('records user fatigue when the user says they are repeating themselves', async () => {
    const llm = new QueueLLM([
      `What update cadence do you prefer?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `I will compress the rest.\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      '{"dimension_updates":{},"should_complete":false}',
    ]);
    const inputs = [
      "How much more do you need? I'm starting to repeat myself.",
      '/save',
    ];

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();

    expect(interviewer.getState().metacognition?.fatigue_events).toContainEqual(expect.objectContaining({
      signal: 'user_fatigue_signal',
    }));
  });

  it('does not frame Full Taste Composition as a 15-25 exchange interview', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    const prompt = (interviewer as any).buildSystemPrompt();

    expect(prompt).toContain('Full Taste Composition');
    expect(prompt).not.toContain('15-25 exchanges');
  });

  it('shows policy target dimension IDs so the interviewer can close coverage deliberately', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    const prompt = (interviewer as any).buildSystemPrompt();

    expect(prompt).toContain('Metacognitive policy action: ask');
    expect(prompt).toContain('Policy target dimension IDs: focus');
  });

  it('re-anchors Full mode when the model tries to sign off while policy still needs coverage', async () => {
    const seenMessages: string[] = [];
    const inputs = ['I care about correctness over speed.', '/save'];
    const llm = new QueueLLM([
      `What matters most?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `Take care.\n<!--COVERAGE\n{"dimensions_touched":["focus"],"dimension_updates":{"focus":{"status":"in_progress","confidence_delta":0.4,"signal_source":"explicit","summary":"Correctness matters","facts":["Correctness matters"],"anti_signals":[]}},"should_complete":false}\nCOVERAGE-->`,
    ]);
    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: (message) => {
        seenMessages.push(message);
      },
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();

    expect(seenMessages[1]).toContain('One more thing');
    expect(seenMessages[1]).not.toContain('Take care');
  });

  it('honors explicit stop language before asking another Full-mode question', async () => {
    const seenMessages: string[] = [];
    const inputs = ['I am done. Stop asking.'];
    const llm = new QueueLLM([
      `What matters most?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `What else matters?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      extractionJson,
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: (message) => {
        seenMessages.push(message);
      },
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();
    const state = interviewer.getState();

    expect(state.is_complete).toBe(true);
    expect(seenMessages).toEqual(['What matters most?']);
    expect(state.transcript.map(turn => turn.role)).toEqual(['interviewer', 'user']);
    expect(state.metacognition?.unresolved_assumptions.some(assumption => (
      assumption.source === 'user_finish_now'
    ))).toBe(true);
    expect(state.metacognition?.policy_decisions.at(-1)).toMatchObject({
      action: 'stop',
      reason_codes: ['user_finish_requested_incomplete'],
    });
  });

  it('does not treat hypothetical stop-language preferences as an immediate finish request', async () => {
    const seenMessages: string[] = [];
    const inputs = [
      "If I stop asking questions or give short replies, I'm probably trying to move on. Compress or wrap up instead of assuming satisfaction.",
      '/save',
    ];
    const llm = new QueueLLM([
      `What matters most?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `Got it. What else matters?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      '{"dimension_updates":{},"should_complete":false}',
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: (message) => {
        seenMessages.push(message);
      },
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();

    expect(interviewer.getState().is_complete).toBe(false);
    expect(seenMessages.length).toBeGreaterThan(1);
    expect(interviewer.getState().metacognition?.unresolved_assumptions.some(assumption => (
      assumption.source === 'user_finish_now'
    ))).toBe(false);
  });

  it('does not repeat the same deterministic re-anchor question for an unchanged policy target', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });
    const decision = {
      action: 'ask' as const,
      target_dimension_ids: ['focus'],
      reason_codes: ['critical_uncovered'],
    };

    const first = (interviewer as any).reanchorOffPolicySignoff('Take care.', decision);
    (interviewer as any).addTurn('interviewer', first);
    const second = (interviewer as any).reanchorOffPolicySignoff('Take care.', decision);

    expect(first).toContain('One more thing before I draft');
    expect(second).not.toBe(first);
    expect(second).toContain('I should not keep asking the same question');
    expect(second).toContain('stop and save');
  });

  it('replaces off-target Full-mode questions with the critical policy target question', async () => {
    const seenMessages: string[] = [];
    const inputs = ['I care about correctness over speed.', '/save'];
    const llm = new QueueLLM([
      `What matters most?\n<!--COVERAGE\n{"dimensions_touched":[],"dimension_updates":{},"should_complete":false}\nCOVERAGE-->`,
      `What output format do you prefer?\n<!--COVERAGE\n{"dimensions_touched":["style"],"dimension_updates":{"style":{"status":"in_progress","confidence_delta":0.4,"signal_source":"explicit","summary":"Output format mentioned","facts":["format preference"],"anti_signals":[]}},"should_complete":false}\nCOVERAGE-->`,
    ]);

    const interviewer = new Interviewer({
      llm,
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: (message) => {
        seenMessages.push(message);
      },
      getUserInput: async () => inputs.shift() ?? '/save',
    });

    await interviewer.run();

    expect(seenMessages[1]).toContain('One more thing before I draft');
    expect(seenMessages[1]).toContain('what matters most');
    expect(seenMessages[1]).not.toContain('output format');
  });

  it('formats deterministic implicit-value prompts without malformed "what for" wording', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    expect((interviewer as any).formatHintAsQuestion('Probe for implicit values in speed vs perfection tradeoffs.')).toBe(
      'What implicit values in speed vs perfection tradeoffs?',
    );
  });

  it('formats deterministic identify prompts with normal casing', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });

    expect((interviewer as any).formatHintAsQuestion('Identify primary jobs-to-be-done and recurring requests.')).toBe(
      'Can you identify primary jobs-to-be-done and recurring requests?',
    );
  });

  it('applies policy inference by marking targeted important dimensions covered with an inferred assumption', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });
    const state = interviewer.getState();
    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');
    const style = state.dimension_coverage.find(d => d.dimension_id === 'style');
    if (!focus || !style) throw new Error('missing test coverage');
    focus.status = 'covered';
    focus.confidence = 1.7;
    state.metacognition?.confirmed_dimension_ids.push('focus');
    style.status = 'in_progress';
    style.confidence = 1.1;
    style.signals.push({ source: 'explicit', weight: 1.1, turn_number: 2, excerpt: 'Prefers concise direct style' });
    style.summary = 'Prefers concise direct style.';

    (interviewer as any).applyPolicyInference({
      action: 'infer',
      target_dimension_ids: ['style'],
      reason_codes: ['important_inferable'],
    });

    expect(style.status).toBe('covered');
    expect(style.signals.some(signal => signal.source === 'inferred')).toBe(true);
    expect(style.confidence).toBeGreaterThanOrEqual(style.confidence_threshold ?? 1.5);
    expect(state.metacognition?.unresolved_assumptions).toContainEqual(expect.objectContaining({
      dimension_id: 'style',
      source: 'model_default',
    }));
  });

  it('credits substantive answers to explicit policy-target questions deterministically', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });
    const state = interviewer.getState();
    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');
    if (!focus) throw new Error('missing focus coverage');

    (interviewer as any).addTurn('interviewer', 'One more thing before I draft: what matters most?');
    state.metacognition?.policy_decisions.push({
      turn_number: state.turn_count,
      action: 'ask',
      target_dimension_ids: ['focus'],
      reason_codes: ['critical_uncovered'],
    });
    (interviewer as any).addTurn(
      'user',
      'Correctness matters more than speed when we are touching production or user-facing claims. I still want speed for rough drafts, but never at the expense of hidden unsupported assumptions.',
    );

    expect((interviewer as any).applyTargetedUserAnswerCredit(
      'Correctness matters more than speed when we are touching production or user-facing claims. I still want speed for rough drafts, but never at the expense of hidden unsupported assumptions.',
    )).toBe(true);
    expect(focus.confidence).toBeGreaterThan(0);
    expect(focus.signals).toContainEqual(expect.objectContaining({
      source: 'explicit',
    }));
  });

  it('replaces off-target Full-mode confirmation turns and records explicit confirmation acceptance', () => {
    const interviewer = new Interviewer({
      llm: new QueueLLM(['unused']),
      rubric: makeRubric(false),
      depth: 'operator',
      onInterviewerMessage: () => undefined,
      getUserInput: async () => '',
    });
    const state = interviewer.getState();
    const focus = state.dimension_coverage.find(d => d.dimension_id === 'focus');
    if (!focus) throw new Error('missing focus coverage');
    focus.status = 'covered';
    focus.confidence = 1.7;
    focus.summary = 'Prioritize correctness over speed.';

    const decision = {
      action: 'confirm' as const,
      target_dimension_ids: ['focus'],
      reason_codes: ['critical_unconfirmed'],
    };
    const confirmation = (interviewer as any).enforcePolicyVisibleMessage(
      'What output format do you prefer?',
      decision,
    );

    expect(confirmation).toContain('Before I draft');
    expect(confirmation).toContain('Prioritize correctness over speed');
    expect(confirmation).not.toContain('output format');

    (interviewer as any).addTurn('interviewer', confirmation);
    state.metacognition?.policy_decisions.push({
      turn_number: state.turn_count,
      ...decision,
    });
    (interviewer as any).addTurn('user', 'Yes, that captures the critical operating rules.');

    expect((interviewer as any).recordAcceptedConfirmationCheckpointIfPresent(
      'Yes, that captures the critical operating rules.',
    )).toBe(true);
    expect(state.metacognition?.confirmed_dimension_ids).toContain('focus');
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
