import { DomainRubric } from '../../interview/rubric.js';

/**
 * Sales Agent Domain Rubric
 *
 * quick=9, guided=20, operator=23 including universal dimensions.
 */
export const SalesAgentRubric: DomainRubric = {
  domain_id: 'sales-agent',
  version: '0.5.0',
  interview_goal: 'Understand how the user sells, qualifies, advances, and closes opportunities so the agent can match their outreach style, deal judgment, CRM discipline, and customer-facing communication standards.',
  includes_universal: true,
  dimensions: [
    {
      id: 'outreach_style',
      name: 'Outreach Style',
      description: 'How direct, consultative, or provocative outbound communication should feel across cold and warm outreach.',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how they want first-touch messages to feel in tone and structure.',
        'Probe for acceptable personalization depth and what makes outreach feel spammy.',
      ],
      coverage_criteria: [
        'Preferred outreach posture is clear.',
        'At least one anti-pattern for bad outreach is captured.',
      ],
    },
    {
      id: 'value_proposition',
      name: 'Value Proposition',
      description: 'How the user frames business value, outcomes, and proof points when introducing an offer.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify the core promise they want emphasized in sales conversations.',
        'Clarify whether they lead with ROI, pain relief, speed, differentiation, or trust.',
      ],
      coverage_criteria: [
        'Core value framing is documented.',
        'Primary proof style or evidence type is identified.',
      ],
      cascade_to: [
        { dimension_id: 'competitive_positioning', weight: 0.2 },
      ],
    },
    {
      id: 'lead_qualification',
      name: 'Lead Qualification',
      description: 'How the user decides whether an account is worth pursuing, including fit, urgency, authority, and budget signals.',
      maps_to: ['principles', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what criteria separate strong opportunities from weak ones.',
        'Probe for qualification frameworks or non-negotiable disqualifiers.',
      ],
      coverage_criteria: [
        'Qualification criteria are explicit.',
        'Disqualification triggers or thresholds are defined.',
      ],
    },
    {
      id: 'customer_empathy',
      name: 'Customer Empathy',
      description: 'How deeply the agent should account for buyer context, pain, pressure, and internal constraints.',
      maps_to: ['principles', 'tone'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe how much discovery should focus on the buyer’s internal reality, not just explicit needs.',
        'Ask what tone creates trust with skeptical or overloaded prospects.',
      ],
      coverage_criteria: [
        'Empathy expectations are captured.',
        'Trust-building behavior is clear.',
      ],
    },
    {
      id: 'relationship_depth',
      name: 'Relationship Depth',
      description: 'How transactional versus long-term the sales motion should be, and how much account development matters after the initial win.',
      maps_to: ['principles', 'tradeoffs'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether the goal is fast conversion, strategic account growth, or a balance.',
        'Clarify how the user measures healthy relationship development.',
      ],
      coverage_criteria: [
        'Expected relationship horizon is defined.',
        'Post-intro relationship expectations are understood.',
      ],
    },
    {
      id: 'follow_up_cadence',
      name: 'Follow-up Cadence',
      description: 'How persistent follow-up should be across the sales cycle, including timing, sequencing, and channel mix.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how often the agent should follow up before backing off.',
        'Probe acceptable variation by opportunity size, stage, or channel.',
      ],
      coverage_criteria: [
        'Cadence expectations are concrete.',
        'Stop conditions or backoff rules are explicit.',
      ],
    },
    {
      id: 'objection_handling',
      name: 'Objection Handling',
      description: 'How the user wants objections handled, including reframing, evidence, concession strategy, and tone under resistance.',
      maps_to: ['principles', 'tradeoffs', 'tone'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify common objections and how they prefer to respond.',
        'Ask whether to challenge assumptions, educate, or de-risk more directly.',
      ],
      coverage_criteria: [
        'Preferred objection-response style is captured.',
        'At least one no-go response pattern is defined.',
      ],
    },
    {
      id: 'proposal_quality',
      name: 'Proposal Quality',
      description: 'Standards for proposals, statements of work, and commercial summaries, including clarity, structure, and confidence level.',
      maps_to: ['principles', 'domain_specific', 'tone'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what a strong proposal must always include.',
        'Probe for preferences around brevity, detail, pricing presentation, and executive summary style.',
      ],
      coverage_criteria: [
        'Proposal quality bar is concrete.',
        'Required sections or structure expectations are documented.',
      ],
    },
    {
      id: 'negotiation_approach',
      name: 'Negotiation Approach',
      description: 'How pricing, terms, concessions, and tradeoffs should be handled in negotiation.',
      maps_to: ['tradeoffs', 'principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how flexible they want the agent to be on scope, price, or timing.',
        'Probe for concession sequencing, red lines, and value exchange expectations.',
      ],
      coverage_criteria: [
        'Negotiation stance is defined.',
        'Concession rules or red lines are identified.',
      ],
    },
    {
      id: 'pipeline_management',
      name: 'Pipeline Management',
      description: 'How opportunities should be staged, prioritized, and cleaned up to keep the pipeline reliable.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what healthy pipeline hygiene looks like.',
        'Clarify stage definitions, forecast trust, and stale-opportunity rules.',
      ],
      coverage_criteria: [
        'Pipeline hygiene expectations are explicit.',
        'Stage movement or prioritization logic is documented.',
      ],
    },
    {
      id: 'crm_discipline',
      name: 'CRM Discipline',
      description: 'Expectations for logging notes, updating fields, preserving history, and keeping records decision-useful.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what must always be captured in CRM after a touchpoint.',
        'Probe for formatting expectations on notes, next steps, and status fields.',
      ],
      coverage_criteria: [
        'CRM update standards are clear.',
        'Minimum recordkeeping expectations are defined.',
      ],
    },
    {
      id: 'competitive_positioning',
      name: 'Competitive Positioning',
      description: 'How the user wants to frame alternatives, differentiation, and competitor comparisons without sounding defensive.',
      maps_to: ['domain_specific', 'tone', 'tradeoffs'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Identify which differentiators matter most in competitive deals.',
        'Ask how explicitly the agent should mention competitors or substitutes.',
      ],
      coverage_criteria: [
        'Differentiation themes are captured.',
        'Competitive comparison boundaries are explicit.',
      ],
    },
    {
      id: 'closing_technique',
      name: 'Closing Technique',
      description: 'How directly the agent should ask for commitment, next steps, or signature at later stages.',
      maps_to: ['tone', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether the user prefers assumptive closes, recap closes, deadline-based closes, or softer next-step asks.',
        'Probe for when direct closing becomes too aggressive.',
      ],
      coverage_criteria: [
        'Preferred close style is identified.',
        'Aggressiveness boundaries are documented.',
      ],
    },
    {
      id: 'upsell_strategy',
      name: 'Upsell Strategy',
      description: 'How expansion, cross-sell, or account growth opportunities should be surfaced and framed.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask when upsell or expansion should be introduced in the relationship.',
        'Clarify whether growth motions should feel advisory, opportunistic, or structured.',
      ],
      coverage_criteria: [
        'Expansion timing expectations are clear.',
        'Preferred upsell posture is captured.',
      ],
    },
    {
      id: 'forecast_judgment',
      name: 'Forecast Judgment',
      description: 'How conservatively the user wants opportunities forecasted and what evidence must exist before confidence rises.',
      maps_to: ['tradeoffs', 'domain_specific', 'evidence_policy'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what evidence supports a confident commit or likely-close forecast.',
        'Probe for optimism bias they want the agent to avoid.',
      ],
      coverage_criteria: [
        'Forecast confidence thresholds are defined.',
        'Evidence required for stage confidence is explicit.',
      ],
    },
    {
      id: 'stakeholder_mapping',
      name: 'Stakeholder Mapping',
      description: 'How the user identifies champions, decision-makers, blockers, and procurement or legal stakeholders inside accounts.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how the agent should reason about multi-threading an account.',
        'Probe for signs of champion strength and decision process maturity.',
      ],
      coverage_criteria: [
        'Stakeholder role expectations are clear.',
        'Account-mapping heuristics are documented.',
      ],
    },
  ],
};
