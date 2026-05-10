import { DomainRubric } from '../../interview/rubric.js';

/**
 * Content Agent Rubric
 *
 * Captures the user's editorial taste, channel strategy, evidence posture,
 * and anti-generic standards for content-producing agents.
 */
export const ContentAgentRubric: DomainRubric = {
  domain_id: 'content-agent',
  version: '1.0.0',
  interview_goal: 'Capture how the user wants an agent to create, adapt, review, and safely publish content while preserving voice, audience fit, and evidence discipline.',
  includes_universal: true,
  dimensions: [
    {
      id: 'brand_voice',
      name: 'Brand Voice and Point of View',
      description: 'The recognizable voice, stance, and editorial personality the agent should preserve.',
      maps_to: ['tone', 'principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask for words the voice should and should not sound like.',
        'Probe for examples of content the user would proudly publish.',
        'Listen for tension between polished, direct, playful, technical, and opinionated tones.',
      ],
      coverage_criteria: [
        'Voice keywords and anti-keywords are concrete.',
        'The profile includes a clear editorial point of view.',
        'At least one example or contrast anchors the voice.',
      ],
    },
    {
      id: 'audience_definition',
      name: 'Audience Definition',
      description: 'Who the content is for, what they already know, and what they need from the output.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify primary and secondary audiences.',
        'Probe expertise level, motivations, objections, and desired action.',
      ],
      coverage_criteria: [
        'Primary audience is named with concrete traits.',
        'Reader knowledge and likely objections are captured.',
        'The agent knows what outcome the content should create.',
      ],
      cascade_to: [
        { dimension_id: 'channel_strategy', weight: 0.2 },
      ],
    },
    {
      id: 'evidence_and_claims',
      name: 'Evidence and Claims Policy',
      description: 'Rules for citations, proof, uncertainty, statistics, and claims that should not be made casually.',
      maps_to: ['evidence_policy', 'taboos', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask which claims require sources or should be avoided.',
        'Clarify how to phrase uncertainty and unverifiable claims.',
        'Probe tolerance for marketing language versus precise evidence.',
      ],
      coverage_criteria: [
        'Citation and proof expectations are explicit.',
        'Unsupported claim categories are listed.',
        'Uncertainty language rules are captured.',
      ],
    },
    {
      id: 'anti_generic_standards',
      name: 'Anti-Generic Standards',
      description: 'Patterns, cliches, and empty language the agent must avoid.',
      maps_to: ['tone', 'taboos'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask for phrases, tropes, and structures the user dislikes.',
        'Probe what makes content feel generic, corporate, or AI-written.',
      ],
      coverage_criteria: [
        'Forbidden phrases or patterns are listed.',
        'The agent has a concrete replacement strategy.',
        'Genericness is defined behaviorally, not only emotionally.',
      ],
    },
    {
      id: 'channel_strategy',
      name: 'Channel and Format Strategy',
      description: 'How voice and structure should change across platforms, formats, and lengths.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Identify common channels and their constraints.',
        'Ask how the same idea should differ across short, long, internal, and public formats.',
      ],
      coverage_criteria: [
        'Primary channels and formats are named.',
        'Adaptation rules are concrete enough for execution.',
      ],
    },
    {
      id: 'content_workflow',
      name: 'Content Workflow',
      description: 'Preferred workflow from brief to options, draft, revision, review, and publishing handoff.',
      maps_to: ['principles', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether the user wants options first or a single strong draft.',
        'Clarify when the agent should ask for approval or produce alternatives.',
      ],
      coverage_criteria: [
        'Drafting and revision sequence is explicit.',
        'Approval and handoff expectations are clear.',
      ],
    },
    {
      id: 'editorial_structure',
      name: 'Editorial Structure',
      description: 'Preferred hooks, narrative arcs, headings, bullets, calls to action, and density.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe for preferred openers, endings, and argument shape.',
        'Ask how dense or skimmable outputs should be.',
      ],
      coverage_criteria: [
        'Structural preferences are explicit.',
        'The profile includes guidance for hooks and endings.',
      ],
    },
    {
      id: 'revision_style',
      name: 'Revision Style',
      description: 'How aggressively the agent should rewrite, critique, preserve, or explain content changes.',
      maps_to: ['tradeoffs', 'principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask when to preserve source wording versus rewrite from scratch.',
        'Clarify whether edits should include rationale.',
      ],
      coverage_criteria: [
        'Rewrite aggressiveness is calibrated.',
        'Edit explanation expectations are clear.',
      ],
    },
    {
      id: 'publishing_boundaries',
      name: 'Publishing Boundaries',
      description: 'What the agent may draft, schedule, publish, or escalate before external release.',
      maps_to: ['taboos', 'tradeoffs'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify legal, brand, reputational, and customer-sensitive categories.',
        'Clarify whether the agent can publish or only prepare drafts.',
      ],
      coverage_criteria: [
        'Publish permissions are explicit.',
        'Escalation triggers are concrete.',
      ],
    },
    {
      id: 'performance_feedback',
      name: 'Performance Feedback Loop',
      description: 'How content performance, comments, and user feedback should change future drafts.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what metrics matter and which vanity metrics to ignore.',
        'Clarify how quickly the agent should adapt after feedback.',
      ],
      coverage_criteria: [
        'Performance signals are prioritized.',
        'Feedback-to-profile behavior is defined.',
      ],
    },
    {
      id: 'source_material_handling',
      name: 'Source Material Handling',
      description: 'How the agent should use notes, interviews, transcripts, README files, and product docs.',
      maps_to: ['evidence_policy', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how much the agent may infer beyond source material.',
        'Clarify when source gaps should block drafting.',
      ],
      coverage_criteria: [
        'Source fidelity rules are explicit.',
        'Inference and gap-handling rules are captured.',
      ],
    },
    {
      id: 'campaign_memory',
      name: 'Campaign and Voice Memory',
      description: 'What content patterns, audience learnings, and examples should be remembered over time.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Identify evergreen voice examples and campaign context worth preserving.',
        'Ask what should remain ephemeral.',
      ],
      coverage_criteria: [
        'Reusable voice and campaign memory categories are named.',
        'Ephemeral versus durable context is clear.',
      ],
    },
  ],
};
