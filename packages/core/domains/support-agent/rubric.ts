import { DomainRubric } from '../../interview/rubric.js';

/**
 * Support Agent Domain Rubric
 *
 * quick=9, guided=21, operator=23 including universal dimensions.
 */
export const SupportAgentRubric: DomainRubric = {
  domain_id: 'support-agent',
  version: '0.5.0',
  interview_goal: 'Understand how the user handles customer support so the agent can match their response tone, troubleshooting rigor, escalation judgment, prioritization habits, and documentation standards.',
  includes_universal: true,
  dimensions: [
    {
      id: 'response_tone',
      name: 'Response Tone',
      description: 'How support responses should sound across frustrated, confused, and routine customer interactions.',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how the user wants support messages to feel: warm, concise, highly reassuring, technical, or direct.',
        'Probe for tone shifts across channel or severity.',
      ],
      coverage_criteria: [
        'Baseline support tone is clear.',
        'At least one tone anti-pattern is captured.',
      ],
    },
    {
      id: 'empathy_expression',
      name: 'Empathy Expression',
      description: 'How explicitly the agent should acknowledge inconvenience, frustration, and customer context before moving into resolution.',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how much emotional acknowledgment is appropriate.',
        'Clarify where empathy should be brief versus more explicit.',
      ],
      coverage_criteria: [
        'Empathy expectations are concrete.',
        'Overuse or underuse boundaries are defined.',
      ],
    },
    {
      id: 'resolution_depth',
      name: 'Resolution Depth',
      description: 'How complete and self-contained a support resolution should be before the agent considers the issue handled.',
      maps_to: ['principles', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask whether the goal is fast unblocking, durable resolution, or both.',
        'Probe for how much preventive context or follow-up guidance to include.',
      ],
      coverage_criteria: [
        'Expected resolution completeness is defined.',
        'Success criteria for issue closure are explicit.',
      ],
    },
    {
      id: 'communication_clarity',
      name: 'Communication Clarity',
      description: 'How technical information should be translated for customers with different expertise levels.',
      maps_to: ['tone', 'principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how much jargon is acceptable and when to simplify.',
        'Probe for formatting preferences in step-by-step instructions.',
      ],
      coverage_criteria: [
        'Clarity bar is understood.',
        'Audience adaptation expectations are documented.',
      ],
    },
    {
      id: 'customer_education',
      name: 'Customer Education',
      description: 'How much the agent should teach the customer versus simply resolving the immediate issue.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether support should focus on fast answers, longer-term enablement, or a balance.',
        'Clarify when educational detail becomes too much.',
      ],
      coverage_criteria: [
        'Education vs speed tradeoff is captured.',
        'Preferred depth of explanation is clear.',
      ],
    },
    {
      id: 'troubleshooting_methodology',
      name: 'Troubleshooting Methodology',
      description: 'The user’s preferred sequence for diagnosing problems, isolating variables, and confirming fixes.',
      maps_to: ['principles', 'domain_specific', 'evidence_policy'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how they want the agent to structure diagnosis before proposing fixes.',
        'Probe for hypothesis-first versus checklist-first troubleshooting habits.',
      ],
      coverage_criteria: [
        'Diagnostic workflow is explicit.',
        'Evidence required before declaring resolution is clear.',
      ],
    },
    {
      id: 'knowledge_base_usage',
      name: 'Knowledge Base Usage',
      description: 'How strongly the agent should rely on existing documentation, macros, and internal solution records.',
      maps_to: ['domain_specific', 'evidence_policy'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask when the knowledge base should be treated as source of truth versus a starting point.',
        'Probe for documentation trust issues or freshness concerns.',
      ],
      coverage_criteria: [
        'Documentation usage expectations are defined.',
        'Fallback behavior for missing or stale documentation is clear.',
      ],
    },
    {
      id: 'escalation_judgment',
      name: 'Escalation Judgment',
      description: 'How the agent decides when to escalate issues to engineering, billing, security, or leadership.',
      maps_to: ['tradeoffs', 'taboos', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what signals require escalation instead of continued handling.',
        'Clarify urgency, risk, and customer-impact thresholds.',
      ],
      coverage_criteria: [
        'Escalation triggers are explicit.',
        'At least one high-risk no-handle scenario is identified.',
      ],
    },
    {
      id: 'sla_awareness',
      name: 'SLA Awareness',
      description: 'How response times, resolution targets, and contractual obligations should shape support behavior.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how strongly SLA commitments should influence prioritization and tone.',
        'Probe for differences across tiers, account types, or issue severity.',
      ],
      coverage_criteria: [
        'SLA expectations are understood.',
        'Priority adjustments based on commitments are clear.',
      ],
    },
    {
      id: 'ticket_prioritization',
      name: 'Ticket Prioritization',
      description: 'How support work should be triaged across severity, customer value, business impact, and effort.',
      maps_to: ['tradeoffs', 'domain_specific', 'principles'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what makes a ticket urgent beyond simple queue order.',
        'Probe for how customer tier, outage scope, or revenue impact changes priority.',
      ],
      coverage_criteria: [
        'Prioritization logic is captured.',
        'Urgency signals and deprioritization rules are documented.',
      ],
    },
    {
      id: 'self_service_guidance',
      name: 'Self-service Guidance',
      description: 'How strongly the agent should guide customers toward documentation, workflows, or tools they can use independently.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask when linking docs is helpful versus dismissive.',
        'Clarify what makes self-service guidance effective and respectful.',
      ],
      coverage_criteria: [
        'Self-service expectations are clear.',
        'Boundaries for over-relying on docs are explicit.',
      ],
    },
    {
      id: 'multi_channel_adaptation',
      name: 'Multi-channel Adaptation',
      description: 'How support behavior should adapt across email, chat, ticket queues, phone follow-up, or community channels.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how brevity, formality, and detail should vary by channel.',
        'Probe for channels that require extra caution or escalation.',
      ],
      coverage_criteria: [
        'Channel-specific adjustments are documented.',
        'At least one channel constraint is explicit.',
      ],
    },
    {
      id: 'follow_through_discipline',
      name: 'Follow-through Discipline',
      description: 'How the agent should manage pending tickets, promised updates, and unresolved follow-up actions.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how often customers should receive updates when an issue remains open.',
        'Clarify how the user wants pending ownership and next steps documented.',
      ],
      coverage_criteria: [
        'Update cadence expectations are defined.',
        'Ownership and follow-up standards are clear.',
      ],
    },
    {
      id: 'documentation_hygiene',
      name: 'Documentation Hygiene',
      description: 'Expectations for case notes, reproduction steps, root cause summaries, and internal handoff clarity.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what internal notes must be captured for future support or engineering review.',
        'Probe for structure expectations in handoff-ready documentation.',
      ],
      coverage_criteria: [
        'Internal documentation standards are explicit.',
        'Minimum note-taking expectations are captured.',
      ],
    },
    {
      id: 'de_escalation_style',
      name: 'De-escalation Style',
      description: 'How the agent should respond to upset customers while maintaining professionalism and momentum toward resolution.',
      maps_to: ['tone', 'tradeoffs', 'principles'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how strongly to validate emotion versus pivot quickly to action.',
        'Clarify phrases or postures that tend to worsen conflict.',
      ],
      coverage_criteria: [
        'De-escalation stance is defined.',
        'At least one unhelpful response pattern is identified.',
      ],
    },
    {
      id: 'root_cause_orientation',
      name: 'Root Cause Orientation',
      description: 'How much the user wants support to pursue underlying causes versus immediate symptom relief.',
      maps_to: ['tradeoffs', 'evidence_policy', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask when root cause analysis is required and when fast mitigation is enough.',
        'Probe for expectations around confirming durable fixes.',
      ],
      coverage_criteria: [
        'Root cause expectations are explicit.',
        'Mitigation vs permanent fix tradeoff is documented.',
      ],
    },
  ],
};
