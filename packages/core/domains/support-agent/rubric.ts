import { DomainRubric, RubricDimension } from '../../interview/rubric.js';

type DomainDimensionInput = Omit<RubricDimension, 'priority' | 'question_budget'> &
  Partial<Pick<RubricDimension, 'priority' | 'question_budget'>>;

function withDefaultDimensionFields(dimension: DomainDimensionInput): RubricDimension {
  const hasQuickTier = dimension.depth_tiers.includes('quick');
  const operatorOnly = dimension.depth_tiers.length === 1 && dimension.depth_tiers[0] === 'operator';

  return {
    ...dimension,
    priority: dimension.priority ?? (hasQuickTier ? 'critical' : operatorOnly ? 'nice-to-have' : 'important'),
    question_budget: dimension.question_budget ?? (hasQuickTier ? { min: 1, max: 2 } : { min: 0, max: 1 }),
  };
}

/**
 * Support Agent Domain Rubric
 *
 * 18 domain-specific dimensions for customer support, troubleshooting, and user assistance.
 * Combined with 7 universal dimensions, this gives:
 *   quick=12, guided=20, operator=25
 */
export const SupportAgentRubric: DomainRubric = {
  domain_id: 'support-agent',
  version: '0.2.0',
  interview_goal: 'Understand the user\'s support philosophy, communication tone, escalation preferences, and quality standards to configure an agent that helps customers the way they would.',
  includes_universal: true,

  dimensions: ([
    // === QUICK TIER (5 domain-specific dimensions) ===
    {
      id: 'support_philosophy',
      name: 'Support Philosophy',
      description: 'Core support approach. Help-first, efficiency-first, education-first, or empathy-first. What matters most when helping customers.',
      maps_to: ['principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask what good customer support means to them',
        'Probe for whether they prioritize speed, thoroughness, or empathy',
        'Understand if they want to educate customers or just solve problems',
        'Listen for their stance on self-service vs. high-touch support',
      ],
      coverage_criteria: [
        'Support philosophy identified (help-first/efficiency-first/education-first/empathy-first)',
        'Core support value captured',
      ],
    },
    {
      id: 'tone_and_empathy',
      name: 'Tone & Empathy Approach',
      description: 'Communication tone when dealing with different customer emotions. Frustrated customers, confused customers, angry customers.',
      maps_to: ['tone'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask how the agent should respond to a frustrated customer',
        'Probe for empathy level: warm and personal, or calm and professional?',
        'Understand if they want the agent to match customer energy or remain neutral',
        'Ask about apology philosophy: when and how to apologize',
      ],
      coverage_criteria: [
        'Empathy approach captured',
        'Tone for different emotional states set',
      ],
    },
    {
      id: 'escalation_approach',
      name: 'Escalation Triggers & Process',
      description: 'When and how to escalate to humans. What situations require immediate escalation vs. agent handling.',
      maps_to: ['principles', 'taboos'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask what situations must always be escalated to a human',
        'Probe for their escalation philosophy: eager to escalate or try to resolve first?',
        'Understand urgency classification: what\'s critical vs. what can wait?',
        'Ask about escalation communication: how to tell the customer it\'s being escalated',
      ],
      coverage_criteria: [
        'Escalation triggers defined',
        'Escalation process expectations set',
      ],
    },
    {
      id: 'knowledge_management',
      name: 'Knowledge Base Usage',
      description: 'How to use and contribute to the knowledge base. Reference existing articles, create new ones, update outdated content.',
      maps_to: ['domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask if they have a knowledge base the agent should reference',
        'Probe for whether the agent should suggest knowledge base improvements',
        'Understand if responses should link to articles or provide inline answers',
        'Ask about knowledge base maintenance expectations',
      ],
      coverage_criteria: [
        'Knowledge base role defined',
        'Article referencing preference captured',
      ],
    },
    {
      id: 'response_style',
      name: 'Response Style & Format',
      description: 'Response length, formality, technical level. Short and direct, detailed and thorough, or adaptive based on the question.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask about preferred response length: concise or detailed?',
        'Probe for technical level: should the agent adjust based on the customer?',
        'Understand formatting preferences: bullet points, numbered steps, or prose?',
        'Ask about template usage vs. personalized responses',
      ],
      coverage_criteria: [
        'Response length preference captured',
        'Technical level adaptation rules set',
      ],
    },

    // === GUIDED TIER adds 8 more dimensions ===
    {
      id: 'ticket_triage',
      name: 'Ticket Triage & Prioritization',
      description: 'How to assess and prioritize incoming tickets. Categorization rules, priority criteria, auto-assignment logic.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about ticket categorization: how do they sort incoming requests?',
        'Probe for priority criteria: what makes a ticket critical vs. low priority?',
        'Understand auto-response expectations for different ticket types',
        'Ask about SLA implications for different priority levels',
      ],
      coverage_criteria: [
        'Triage criteria established',
        'Priority classification rules set',
      ],
    },
    {
      id: 'resolution_workflow',
      name: 'Resolution Workflow',
      description: 'Steps for resolving customer issues. Troubleshooting approach, documentation requirements, follow-up protocol.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about their standard resolution workflow',
        'Probe for troubleshooting approach: systematic diagnosis or common-fix-first?',
        'Understand documentation requirements: what gets recorded for each resolution?',
        'Ask about follow-up: do they verify the customer\'s issue is fully resolved?',
      ],
      coverage_criteria: [
        'Resolution workflow captured',
        'Documentation requirements set',
      ],
    },
    {
      id: 'customer_communication',
      name: 'Customer Communication Rules',
      description: 'Template vs. personalized responses, multi-channel communication, customer communication lifecycle.',
      maps_to: ['tone'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about template vs. personalized response preferences',
        'Probe for communication channel differences: email vs. chat vs. social',
        'Understand closing message preferences: how to end a conversation',
        'Ask about proactive communication: should the agent reach out with updates?',
      ],
      coverage_criteria: [
        'Communication rules per channel captured',
      ],
    },
    {
      id: 'sla_awareness',
      name: 'SLA Compliance & Response Times',
      description: 'Service level agreement targets. Response time expectations, resolution time goals, priority-based SLAs.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about response time targets (first response, resolution)',
        'Probe for SLA differences by priority level or customer tier',
        'Understand how the agent should behave when approaching an SLA breach',
        'Ask about SLA reporting expectations',
      ],
      coverage_criteria: [
        'SLA targets captured',
        'Priority-based response expectations set',
      ],
    },
    {
      id: 'documentation_style',
      name: 'Documentation & Knowledge Articles',
      description: 'How to write resolution documentation and knowledge articles. Technical level, structure, audience assumptions.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about resolution note format and detail level',
        'Probe for knowledge article writing style',
        'Understand whether articles target end-users or internal team',
        'Ask about screenshot/media expectations in documentation',
      ],
      coverage_criteria: [
        'Documentation style captured',
      ],
    },
    {
      id: 'feedback_collection',
      name: 'Customer Feedback & CSAT',
      description: 'How and when to collect customer satisfaction feedback. Survey timing, question types, follow-up on negative feedback.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about CSAT collection practices',
        'Probe for survey timing: after every interaction or selectively?',
        'Understand negative feedback handling: should the agent follow up?',
        'Ask about feedback data usage and reporting',
      ],
      coverage_criteria: [
        'Feedback collection approach captured',
      ],
    },
    {
      id: 'multi_channel',
      name: 'Multi-Channel Support',
      description: 'Channel-specific communication rules. How tone, format, and response expectations change across email, chat, phone, social.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask which support channels they operate on',
        'Probe for tone/format differences between channels',
        'Understand channel-switching etiquette (chat to email, etc.)',
        'Ask about response time expectations per channel',
      ],
      coverage_criteria: [
        'Active channels identified',
        'Channel-specific rules captured',
      ],
    },
    {
      id: 'known_issue_handling',
      name: 'Known Issue Communication',
      description: 'How to communicate known issues and workarounds. Transparency level, workaround format, status update cadence.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask how the agent should handle tickets for known issues',
        'Probe for transparency: acknowledge the issue upfront or troubleshoot first?',
        'Understand workaround communication format',
        'Ask about status update expectations for ongoing issues',
      ],
      coverage_criteria: [
        'Known issue handling approach captured',
      ],
    },

    // === OPERATOR TIER adds 5 more dimensions ===
    {
      id: 'vip_handling',
      name: 'VIP & High-Value Customer Treatment',
      description: 'Special handling for high-value customers. Different SLAs, white-glove service, executive escalation paths.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about VIP or tiered customer treatment',
        'Probe for what makes a customer "high-value" in their context',
        'Understand different service levels for different tiers',
        'Ask about executive escalation paths for VIP issues',
      ],
      coverage_criteria: [
        'VIP treatment rules captured',
      ],
    },
    {
      id: 'crisis_communication',
      name: 'Crisis & Outage Communication',
      description: 'How to communicate during major incidents. Outage messaging, status page updates, customer proactive outreach.',
      maps_to: ['tone', 'taboos'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about crisis communication protocols',
        'Probe for outage messaging guidelines: what to say and what not to say',
        'Understand proactive communication expectations during incidents',
        'Ask about status page and social media communication during crises',
      ],
      coverage_criteria: [
        'Crisis communication guidelines set',
      ],
    },
    {
      id: 'root_cause_analysis',
      name: 'Root Cause Analysis & Pattern Detection',
      description: 'Identifying recurring issues, detecting patterns, escalating systemic problems to engineering/product.',
      maps_to: ['domain_specific'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about pattern detection expectations',
        'Probe for how recurring issues should be escalated to product/engineering',
        'Understand bug report format and detail expectations',
        'Ask about trend analysis and reporting cadence',
      ],
      coverage_criteria: [
        'Pattern detection expectations captured',
      ],
    },
    {
      id: 'team_coordination',
      name: 'Cross-Team Coordination',
      description: 'Working with engineering, product, and other teams. Internal communication style, handoff protocols.',
      maps_to: ['domain_specific'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about how support interacts with engineering and product teams',
        'Probe for internal communication style and tools',
        'Understand handoff protocols for complex issues',
        'Ask about internal escalation vs. external escalation differences',
      ],
      coverage_criteria: [
        'Cross-team coordination approach captured',
      ],
    },
    {
      id: 'quality_assurance',
      name: 'Quality Assurance & Monitoring',
      description: 'QA process for support interactions. CSAT monitoring, response quality review, continuous improvement approach.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about support quality measurement',
        'Probe for review processes: are responses audited?',
        'Understand continuous improvement expectations',
        'Ask about metrics-driven quality improvement',
      ],
      coverage_criteria: [
        'QA expectations captured',
      ],
    },
  ] satisfies DomainDimensionInput[]).map(withDefaultDimensionFields),
};
