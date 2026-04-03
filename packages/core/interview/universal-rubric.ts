import { RubricDimension, DomainRubric } from './rubric.js';

/**
 * Universal dimensions shared across all domains.
 * These cover the base constitution fields that every taste profile needs.
 */
export const UNIVERSAL_DIMENSIONS: RubricDimension[] = [
  {
    id: 'core_purpose',
    name: 'Core Purpose & Goals',
    description: 'What the user wants to achieve with their agent. Their primary mission, success criteria, and the problem they are solving.',
    maps_to: ['principles'],
    depth_tiers: ['quick', 'guided', 'operator'],
    priority: 'critical',
    question_budget: { min: 1, max: 3 },
    exploration_hints: [
      'Start broad: what problem are they solving?',
      'Dig into what success looks like concretely',
      'Understand if this is personal, professional, or both',
      'Listen for implicit principles in how they describe their goals',
    ],
    coverage_criteria: [
      'Clear primary goal stated',
      'At least one success metric or criteria identified',
      'Context for why this matters to them',
    ],
    cascade_to: [
      { dimension_id: 'guiding_principles', weight: 0.2 },
    ],
  },
  {
    id: 'guiding_principles',
    name: 'Guiding Principles & Values',
    description: 'The non-negotiable principles that should guide agent behavior. What matters most when making tradeoff decisions.',
    maps_to: ['principles'],
    depth_tiers: ['quick', 'guided', 'operator'],
    priority: 'critical',
    question_budget: { min: 1, max: 3 },
    exploration_hints: [
      'Ask about past experiences where an AI did something they hated',
      'Ask about what "good" looks like vs. "great"',
      'Probe for implicit values (e.g., if they say "just get it done" that implies speed over perfection)',
      'At operator depth: ask for priority ordering between conflicting principles',
    ],
    coverage_criteria: [
      'At least 2-3 distinct principles identified',
      'Rationale understood for each',
      'Priority ordering established (at guided+ depth)',
    ],
    cascade_to: [
      { dimension_id: 'communication_tone', weight: 0.15 },
    ],
  },
  {
    id: 'communication_tone',
    name: 'Communication Style & Tone',
    description: 'How the agent should communicate. Voice, register, vocabulary level, formatting preferences.',
    maps_to: ['tone'],
    depth_tiers: ['quick', 'guided', 'operator'],
    priority: 'important',
    question_budget: { min: 1, max: 2 },
    exploration_hints: [
      'Ask them to describe the voice in 3-5 adjectives',
      'Ask for examples of communication they admire vs. what annoys them',
      'Probe formatting: do they want bullet points? Headers? Prose?',
      'At operator depth: explore context-specific tone differences',
    ],
    coverage_criteria: [
      'Voice descriptors captured',
      'At least one "never do" for tone',
      'Formatting preference expressed',
    ],
  },
  {
    id: 'autonomy_boundaries',
    name: 'Autonomy & Decision Boundaries',
    description: 'How much latitude the agent has. When to ask vs. when to act. Risk tolerance.',
    maps_to: ['tradeoffs', 'taboos'],
    depth_tiers: ['quick', 'guided', 'operator'],
    priority: 'critical',
    question_budget: { min: 1, max: 2 },
    exploration_hints: [
      'Frame as a spectrum: "always ask" to "fully autonomous"',
      'Probe with concrete scenarios: "what if the agent encounters X?"',
      'Understand their risk tolerance for different action types',
      'At operator depth: explore specific escalation triggers',
    ],
    coverage_criteria: [
      'General autonomy level established',
      'At least one escalation scenario identified',
      'Risk tolerance direction clear',
    ],
    cascade_to: [
      { dimension_id: 'hard_boundaries', weight: 0.3, condition: 'Strong autonomy preference implies specific boundary needs' },
    ],
  },
  {
    id: 'accuracy_evidence',
    name: 'Accuracy & Evidence Standards',
    description: 'How the agent should handle facts, uncertainty, citations, and claims.',
    maps_to: ['evidence_policy', 'tradeoffs'],
    depth_tiers: ['guided', 'operator'],
    priority: 'important',
    question_budget: { min: 0, max: 2 },
    exploration_hints: [
      'Ask about accuracy vs. speed preference',
      'Probe when citations are needed vs. not',
      'Ask how the agent should express uncertainty',
      'At operator depth: domain-specific evidence requirements',
    ],
    coverage_criteria: [
      'Accuracy/speed tradeoff positioned',
      'Citation expectations set',
      'Uncertainty language preference expressed',
    ],
    cascade_to: [
      { dimension_id: 'hard_boundaries', weight: 0.15, condition: 'Evidence standards hint at safety boundaries' },
    ],
  },
  {
    id: 'hard_boundaries',
    name: 'Hard Boundaries & Taboos',
    description: 'Things the agent must never do. Topics to avoid. Actions that always require human approval.',
    maps_to: ['taboos'],
    depth_tiers: ['guided', 'operator'],
    priority: 'important',
    question_budget: { min: 1, max: 2 },
    exploration_hints: [
      'Ask about past negative experiences with AI agents',
      'Probe for sensitive topics in their domain',
      'Ask what would make them lose trust in the agent',
      'At operator depth: distinguish "never do" from "always escalate"',
    ],
    coverage_criteria: [
      'At least one "never do" rule identified',
      'At least one escalation trigger identified',
    ],
  },
  {
    id: 'cost_resource_sensitivity',
    name: 'Cost & Resource Sensitivity',
    description: 'How cost-sensitive they are. Token budget awareness. Preference for efficiency vs. thoroughness.',
    maps_to: ['tradeoffs'],
    depth_tiers: ['operator'],
    priority: 'nice-to-have',
    question_budget: { min: 0, max: 1 },
    exploration_hints: [
      'Ask about budget constraints or token awareness',
      'Probe whether they prefer shorter responses to save cost',
      'Understand if they have rate limits or usage caps',
    ],
    coverage_criteria: [
      'Cost sensitivity level established',
    ],
  },
];

/**
 * Get dimensions for a specific depth level, combining universal + domain-specific.
 */
export function getDimensionsForDepth(
  rubric: DomainRubric,
  depth: 'quick' | 'guided' | 'operator',
  universalDimensions: RubricDimension[] = UNIVERSAL_DIMENSIONS,
): RubricDimension[] {
  const domainDims = rubric.dimensions.filter(d => d.depth_tiers.includes(depth));
  const universalDims = rubric.includes_universal
    ? universalDimensions.filter(d => d.depth_tiers.includes(depth))
    : [];
  return [...universalDims, ...domainDims];
}
