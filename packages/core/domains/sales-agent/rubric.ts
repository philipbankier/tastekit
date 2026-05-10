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
 * Sales Agent Domain Rubric
 *
 * 18 domain-specific dimensions for lead generation, qualification, and deal management.
 * Combined with 7 universal dimensions, this gives:
 *   quick=12, guided=20, operator=25
 */
export const SalesAgentRubric: DomainRubric = {
  domain_id: 'sales-agent',
  version: '1.0.0',
  interview_goal: 'Understand the user\'s sales philosophy, communication style, deal management preferences, and customer relationship approach to configure an agent that sells the way they would.',
  includes_universal: true,

  dimensions: ([
    // === QUICK TIER (5 domain-specific dimensions) ===
    {
      id: 'sales_philosophy',
      name: 'Sales Philosophy',
      description: 'Their fundamental approach to selling. Consultative, challenger, solution-oriented, relationship-based, or transactional.',
      maps_to: ['principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask how they would describe their sales approach in a sentence',
        'Probe for whether they prioritize relationships or efficiency',
        'Understand if they see sales as helping or persuading',
        'Listen for methodology clues: do they mention SPIN, Challenger, MEDDIC?',
      ],
      coverage_criteria: [
        'Sales methodology/philosophy identified',
        'Core selling belief captured',
      ],
    },
    {
      id: 'communication_style',
      name: 'Sales Communication Style',
      description: 'How they communicate with prospects and clients. Direct, warm, professional, casual, data-driven.',
      maps_to: ['tone'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask how they want the agent to sound in emails and calls',
        'Probe for formality level: LinkedIn professional or startup casual?',
        'Understand whether they lead with data or stories',
        'Ask about humor and personality in sales communication',
      ],
      coverage_criteria: [
        'Communication tone captured',
        'Formality level established',
      ],
    },
    {
      id: 'lead_qualification',
      name: 'Lead Qualification Criteria',
      description: 'What makes a good lead. Qualification frameworks, deal-breakers, ideal customer profile.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask what their ideal customer looks like',
        'Probe for qualification criteria: budget, authority, need, timeline?',
        'Understand deal-breakers: what disqualifies a lead immediately?',
        'Ask about scoring: do they use a formal scoring system?',
      ],
      coverage_criteria: [
        'Ideal customer profile captured',
        'Qualification criteria established',
      ],
    },
    {
      id: 'deal_management',
      name: 'Deal Management & Pipeline',
      description: 'How they manage deals through the pipeline. Stage definitions, progression criteria, win/loss analysis.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask about their pipeline stages and what moves a deal forward',
        'Probe for deal velocity preferences: fast close or patient nurture?',
        'Understand how they handle stalled deals',
        'Ask about CRM usage and data hygiene expectations',
      ],
      coverage_criteria: [
        'Pipeline management approach captured',
        'Deal progression philosophy expressed',
      ],
    },
    {
      id: 'customer_relationship',
      name: 'Customer Relationship Approach',
      description: 'How they build and maintain customer relationships. Trust-building, value delivery, long-term thinking.',
      maps_to: ['principles', 'tone'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask about their view on customer relationships vs. transactions',
        'Probe for post-sale relationship expectations',
        'Understand whether they value lifetime value or individual deal size',
        'Ask about referral and expansion strategies',
      ],
      coverage_criteria: [
        'Relationship philosophy captured',
        'Long-term vs. transactional stance expressed',
      ],
    },

    // === GUIDED TIER adds 8 more dimensions ===
    {
      id: 'outreach_cadence',
      name: 'Outreach Cadence & Timing',
      description: 'How frequently to reach out, follow-up timing, and persistence limits before moving on.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about ideal follow-up timing after initial outreach',
        'Probe for persistence: how many touchpoints before giving up?',
        'Understand multi-channel cadence (email, phone, social)',
        'Ask about timing preferences: morning/afternoon, weekday/weekend',
      ],
      coverage_criteria: [
        'Follow-up cadence established',
        'Persistence limits set',
      ],
    },
    {
      id: 'objection_handling',
      name: 'Objection Handling',
      description: 'Approach to handling objections. Empathetic listening, data-driven responses, reframing, or addressing head-on.',
      maps_to: ['principles', 'tone'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask how they typically handle the most common objections',
        'Probe for their philosophy: is an objection a buying signal or a stop sign?',
        'Understand whether the agent should rebut or acknowledge and move on',
        'Ask about the line between persistence and pushiness',
      ],
      coverage_criteria: [
        'Objection handling philosophy captured',
        'Tone for difficult conversations set',
      ],
    },
    {
      id: 'proposal_style',
      name: 'Proposal & Presentation Style',
      description: 'How proposals and sales materials should look. Level of customization, data inclusion, design expectations.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about proposal format preferences (deck, doc, email)',
        'Probe for customization level: template-based or fully custom?',
        'Understand data/ROI inclusion expectations',
        'Ask about design and branding requirements',
      ],
      coverage_criteria: [
        'Proposal format preference captured',
        'Customization expectations set',
      ],
    },
    {
      id: 'crm_workflow',
      name: 'CRM & Data Workflow',
      description: 'How CRM data should be maintained. Data entry standards, pipeline hygiene, activity logging.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about CRM usage: which system and how religiously they use it',
        'Probe for data entry expectations: what must be logged?',
        'Understand activity tracking: calls, emails, meetings',
        'Ask about pipeline hygiene and deal cleanup cadence',
      ],
      coverage_criteria: [
        'CRM expectations captured',
        'Data hygiene standards set',
      ],
    },
    {
      id: 'follow_up_philosophy',
      name: 'Follow-Up Philosophy',
      description: 'When and how to follow up. Persistence vs. respect, value-add vs. check-in, timing philosophy.',
      maps_to: ['principles'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about their follow-up philosophy: persistent or respectful?',
        'Probe for value-add follow-ups vs. simple check-ins',
        'Understand when "no" means "no" vs. "not yet"',
        'Ask about re-engagement strategies for cold leads',
      ],
      coverage_criteria: [
        'Follow-up philosophy captured',
      ],
    },
    {
      id: 'negotiation_approach',
      name: 'Negotiation Approach',
      description: 'Negotiation tactics and philosophy. Win-win vs. competitive, discount authority, deal structure flexibility.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about their negotiation style: collaborative or competitive?',
        'Probe for discount authority: when are discounts acceptable?',
        'Understand deal structure flexibility (terms, payment, scope)',
        'Ask about walking away: when is a deal not worth pursuing?',
      ],
      coverage_criteria: [
        'Negotiation style captured',
        'Discount/pricing flexibility expressed',
      ],
    },
    {
      id: 'reporting_preferences',
      name: 'Sales Reporting & Metrics',
      description: 'Which metrics matter most. Report format, frequency, and depth of analysis expected.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask which sales metrics they track most closely',
        'Probe for reporting cadence: daily, weekly, monthly?',
        'Understand dashboard vs. narrative report preferences',
        'Ask about forecast accuracy expectations',
      ],
      coverage_criteria: [
        'Key metrics identified',
        'Reporting preferences captured',
      ],
    },
    {
      id: 'territory_focus',
      name: 'Territory & Market Focus',
      description: 'Target market segment, industry verticals, geographic focus, account size preferences.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about target market segment or industry',
        'Probe for geographic focus or restrictions',
        'Understand ideal account size and deal value range',
        'Ask about vertical specialization vs. horizontal approach',
      ],
      coverage_criteria: [
        'Target market defined',
      ],
    },

    // === OPERATOR TIER adds 5 more dimensions ===
    {
      id: 'enterprise_vs_smb',
      name: 'Enterprise vs. SMB Approach',
      description: 'How selling changes based on customer size. Enterprise motions, SMB velocity, mid-market hybrid.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask whether they sell to enterprise, SMB, or both',
        'Probe for how the sales motion changes by customer size',
        'Understand resource allocation between segments',
        'Ask about enterprise-specific requirements (security reviews, procurement)',
      ],
      coverage_criteria: [
        'Customer size strategy captured',
      ],
    },
    {
      id: 'multi_stakeholder',
      name: 'Multi-Stakeholder Deals',
      description: 'Handling multiple decision-makers. Champion building, executive sponsorship, committee selling.',
      maps_to: ['domain_specific'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask how they navigate deals with multiple decision-makers',
        'Probe for champion identification and development strategy',
        'Understand executive engagement approach',
        'Ask about buying committee dynamics',
      ],
      coverage_criteria: [
        'Multi-stakeholder approach captured',
      ],
    },
    {
      id: 'competitive_positioning',
      name: 'Competitive Positioning',
      description: 'How to handle competitor mentions. Head-to-head comparisons, differentiation messaging, competitor respect.',
      maps_to: ['principles', 'taboos'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask how they want the agent to handle competitor mentions',
        'Probe for whether to compare directly or differentiate subtly',
        'Understand if badmouthing competitors is off-limits',
        'Ask about competitive battle card usage',
      ],
      coverage_criteria: [
        'Competitive positioning approach captured',
      ],
    },
    {
      id: 'pricing_strategy',
      name: 'Pricing & Discount Strategy',
      description: 'How to handle pricing conversations. Discount policies, value-based pricing, bundle strategies.',
      maps_to: ['tradeoffs', 'taboos'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about pricing conversation philosophy: lead with price or value?',
        'Probe for discount authority and limits',
        'Understand value-based pricing vs. list price approach',
        'Ask about bundle or package deal strategies',
      ],
      coverage_criteria: [
        'Pricing philosophy captured',
        'Discount boundaries set',
      ],
    },
    {
      id: 'compliance_awareness',
      name: 'Sales Compliance & Ethics',
      description: 'Regulatory considerations in sales. Anti-spam laws, data privacy, industry-specific compliance, ethical boundaries.',
      maps_to: ['taboos', 'principles'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about compliance requirements in their industry',
        'Probe for email/outreach regulations they need to follow',
        'Understand data privacy obligations (GDPR, CCPA)',
        'Ask about ethical boundaries: what sales tactics are off-limits?',
      ],
      coverage_criteria: [
        'Compliance requirements captured',
        'Ethical boundaries set',
      ],
    },
  ] satisfies DomainDimensionInput[]).map(withDefaultDimensionFields),
};
