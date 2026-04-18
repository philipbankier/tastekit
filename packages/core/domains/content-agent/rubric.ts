import { DomainRubric } from '../../interview/rubric.js';

/**
 * Content Agent Domain Rubric
 *
 * quick=9, guided=20, operator=27 including universal dimensions.
 */
export const ContentAgentRubric: DomainRubric = {
  domain_id: 'content-agent',
  version: '0.5.0',
  interview_goal: 'Understand how the user creates, reviews, and ships content so the agent can match their voice, strategy, audience awareness, and editorial standards.',
  includes_universal: true,
  dimensions: [
    {
      id: 'writing_style',
      name: 'Writing Style Identity',
      description: 'How the user describes their writing style and what makes it distinct in practice.',
      maps_to: ['principles', 'tone'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how they want their writing to feel in one sentence.',
        'Listen for contrasts like crisp vs narrative, playful vs authoritative, minimal vs expressive.',
      ],
      coverage_criteria: [
        'A clear writing identity is captured.',
        'At least one contrast or anti-pattern is defined.',
      ],
    },
    {
      id: 'audience_awareness',
      name: 'Audience Awareness',
      description: 'Who the content is for, what the audience already knows, and how messaging should adapt by segment.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify primary audience segments and their sophistication level.',
        'Probe what the audience cares about, fears, and ignores.',
      ],
      coverage_criteria: [
        'Primary audience segments are identified.',
        'Knowledge level and messaging adjustments are explicit.',
      ],
      cascade_to: [
        { dimension_id: 'content_formats', weight: 0.2 },
      ],
    },
    {
      id: 'content_strategy',
      name: 'Content Strategy',
      description: 'The strategic goals content should serve, including acquisition, education, conversion, and retention.',
      maps_to: ['principles', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what business or communication goals content should achieve.',
        'Clarify whether they optimize for reach, trust, conversion, or thought leadership.',
      ],
      coverage_criteria: [
        'Primary strategic objectives are defined.',
        'Success direction for content is clear.',
      ],
    },
    {
      id: 'tone_consistency',
      name: 'Tone Consistency',
      description: 'How tightly tone should stay within an established range across channels and campaigns.',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe how much tonal variation is acceptable by channel or format.',
        'Ask what makes a piece feel off-brand even if the facts are correct.',
      ],
      coverage_criteria: [
        'Acceptable tone range is defined.',
        'Examples of tone drift are understood.',
      ],
    },
    {
      id: 'brand_voice',
      name: 'Brand Voice',
      description: 'The specific voice attributes, language preferences, and words or postures the brand should avoid.',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Capture voice keywords, avoided phrases, and posture toward the reader.',
        'Ask which brands or writers feel aligned or misaligned.',
      ],
      coverage_criteria: [
        'Voice descriptors are concrete.',
        'Avoided language or framing is explicitly captured.',
      ],
      cascade_to: [
        { dimension_id: 'editorial_standards', weight: 0.2 },
      ],
    },
    {
      id: 'research_depth',
      name: 'Research Depth',
      description: 'How much research and validation should happen before publishing content.',
      maps_to: ['evidence_policy', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask when light synthesis is enough versus when deep sourcing is required.',
        'Clarify standards for claims, examples, and statistics.',
      ],
      coverage_criteria: [
        'Research rigor expectations are defined.',
        'Verification thresholds for factual content are clear.',
      ],
    },
    {
      id: 'seo_awareness',
      name: 'SEO Awareness',
      description: 'How much search intent, keyword structure, and discoverability should influence the content.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe their stance on keyword optimization versus natural writing.',
        'Ask whether metadata, headers, and snippets matter by channel.',
      ],
      coverage_criteria: [
        'SEO influence on writing decisions is defined.',
        'Optimization boundaries are explicit.',
      ],
    },
    {
      id: 'content_formats',
      name: 'Content Formats',
      description: 'Preferred formats such as blogs, threads, social posts, newsletters, scripts, and landing page copy.',
      maps_to: ['domain_specific', 'tone'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'List the main content formats the agent should support.',
        'Capture format-specific expectations for length, structure, and CTA style.',
      ],
      coverage_criteria: [
        'Core formats are listed.',
        'At least one format-specific adaptation rule is captured.',
      ],
    },
    {
      id: 'editorial_standards',
      name: 'Editorial Standards',
      description: 'Standards for grammar, clarity, structure, sourcing, and polish before content is considered publishable.',
      maps_to: ['principles', 'evidence_policy', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask what errors or habits immediately lower trust.',
        'Probe for checklists: clarity, sourcing, inclusivity, reading level, style guide.',
      ],
      coverage_criteria: [
        'Publishability criteria are concrete.',
        'Editorial review expectations are explicit.',
      ],
    },
    {
      id: 'content_workflow',
      name: 'Content Workflow',
      description: 'How content moves from idea to draft to review to final publication.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Capture stages, review loops, and where the agent should contribute.',
        'Ask what should happen before content is marked ready.',
      ],
      coverage_criteria: [
        'Workflow stages are identified.',
        'Agent handoff points are clear.',
      ],
    },
    {
      id: 'headline_copywriting',
      name: 'Headline and Hook Style',
      description: 'Preferences for subject lines, titles, hooks, and opening lines that win attention without feeling cheap.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe clickworthy vs restrained preferences.',
        'Ask which hook patterns they trust or dislike.',
      ],
      coverage_criteria: [
        'Hook aggressiveness preference is captured.',
        'Acceptable headline patterns are clarified.',
      ],
    },
    {
      id: 'cta_strategy',
      name: 'CTA Strategy',
      description: 'How explicit, frequent, and direct calls-to-action should be across content types.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how hard content should sell versus educate.',
        'Clarify acceptable CTA frequency and tone.',
      ],
      coverage_criteria: [
        'CTA intensity is defined.',
        'Conversion versus trust tradeoff is documented.',
      ],
    },
    {
      id: 'repurposing_strategy',
      name: 'Repurposing Strategy',
      description: 'How source material should be transformed into multiple formats without becoming repetitive or low quality.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['guided', 'operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how aggressively long-form work should be atomized into short-form content.',
        'Capture what counts as thoughtful adaptation versus copy-paste reuse.',
      ],
      coverage_criteria: [
        'Repurposing expectations are clear.',
        'Reuse quality bar is explicit.',
      ],
    },
    {
      id: 'approval_sensitivity',
      name: 'Approval and Risk Sensitivity',
      description: 'Content scenarios that require review before publishing, especially around claims, compliance, and reputation.',
      maps_to: ['taboos', 'evidence_policy', 'tradeoffs'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify claims, topics, and channels that require human approval.',
        'Probe for legal, compliance, or reputational sensitivities.',
      ],
      coverage_criteria: [
        'Approval triggers are explicit.',
        'Risk categories for escalation are identified.',
      ],
    },
    {
      id: 'campaign_cohesion',
      name: 'Campaign Cohesion',
      description: 'How content pieces should connect across channels to support a larger narrative or campaign.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask how campaigns should ladder up to a central narrative.',
        'Capture consistency expectations across series and launch windows.',
      ],
      coverage_criteria: [
        'Cross-channel narrative cohesion expectations are clear.',
        'Campaign-level alignment rules are captured.',
      ],
    },
    {
      id: 'content_measurement',
      name: 'Content Measurement',
      description: 'How success is measured and which signals should influence future content decisions.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask which metrics matter by format or funnel stage.',
        'Understand whether comments, shares, leads, or conversion quality matter most.',
      ],
      coverage_criteria: [
        'Primary success metrics are named.',
        'Optimization loop from metrics to content changes is defined.',
      ],
    },
    {
      id: 'stakeholder_alignment',
      name: 'Stakeholder Alignment',
      description: 'How to reconcile product, brand, SEO, and leadership input when content priorities conflict.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe who has final say on strategy, voice, and claims.',
        'Ask how competing stakeholder requests should be prioritized.',
      ],
      coverage_criteria: [
        'Decision authority is understood.',
        'Conflict-resolution preferences are clear.',
      ],
    },
    {
      id: 'content_ops',
      name: 'Content Operations',
      description: 'Systems, calendars, libraries, and approval mechanics that keep content production organized.',
      maps_to: ['domain_specific'],
      depth_tiers: ['operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask about calendars, briefs, asset repositories, and workflow tooling.',
        'Capture repeatable process needs and naming or metadata rules.',
      ],
      coverage_criteria: [
        'Operational systems are identified.',
        'Reusable process expectations are defined.',
      ],
    },
    {
      id: 'revision_philosophy',
      name: 'Revision Philosophy',
      description: 'How rough the first draft can be, how many options to present, and what revision loops should optimize for.',
      maps_to: ['principles', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether they prefer one polished draft or several varied options.',
        'Probe expectations for revision speed versus precision.',
      ],
      coverage_criteria: [
        'Draft quality expectations are explicit.',
        'Revision loop style is defined.',
      ],
    },
  ],
};
