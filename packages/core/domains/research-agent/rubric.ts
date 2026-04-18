import { DomainRubric } from '../../interview/rubric.js';

/**
 * Research Agent Domain Rubric
 *
 * quick=10, guided=21, operator=28 including universal dimensions.
 */
export const ResearchAgentRubric: DomainRubric = {
  domain_id: 'research-agent',
  version: '0.5.0',
  interview_goal: 'Understand how the user scopes research, evaluates evidence, synthesizes findings, and communicates uncertainty so the agent can produce trustworthy analysis.',
  includes_universal: true,
  dimensions: [
    {
      id: 'source_reliability',
      name: 'Source Reliability Standards',
      description: 'What counts as a trustworthy source and how the user ranks source types under uncertainty.',
      maps_to: ['evidence_policy', 'principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how they rank primary, secondary, expert, and anonymous sources.',
        'Probe what disqualifies a source even if it is relevant.',
      ],
      coverage_criteria: [
        'Source hierarchy is defined.',
        'Disqualifying source weaknesses are captured.',
      ],
      cascade_to: [
        { dimension_id: 'citation_practices', weight: 0.2 },
      ],
    },
    {
      id: 'analytical_depth',
      name: 'Analytical Depth',
      description: 'How far the agent should go beyond summary into comparison, inference, and strategic interpretation.',
      maps_to: ['principles', 'tradeoffs'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Clarify whether the user wants summary, explanation, or opinionated analysis.',
        'Ask when deeper reasoning is worth the extra time.',
      ],
      coverage_criteria: [
        'Expected analysis depth is explicit.',
        'Boundary between synthesis and speculation is clear.',
      ],
    },
    {
      id: 'methodology_awareness',
      name: 'Methodology Awareness',
      description: 'How much the agent should evaluate study design, data collection methods, and research limitations.',
      maps_to: ['evidence_policy', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask whether methodology critique is required by default or only for high-stakes topics.',
        'Probe preferred handling of weak or incomplete methods sections.',
      ],
      coverage_criteria: [
        'Methodology review expectations are defined.',
        'Escalation threshold for weak methods is clear.',
      ],
    },
    {
      id: 'data_interpretation',
      name: 'Data Interpretation',
      description: 'How the user wants numbers, trends, and quantitative findings interpreted and contextualized.',
      maps_to: ['evidence_policy', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe preference for absolute numbers, relative comparisons, and caveat density.',
        'Ask how to handle incomplete baselines or conflicting datasets.',
      ],
      coverage_criteria: [
        'Interpretation style for quantitative evidence is clear.',
        'Caveat expectations are explicit.',
      ],
    },
    {
      id: 'synthesis_ability',
      name: 'Synthesis Expectations',
      description: 'How findings from multiple sources should be combined into a coherent view with clear implications.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how many sources or perspectives should be integrated before drawing conclusions.',
        'Probe whether contradictions should be resolved or presented side by side.',
      ],
      coverage_criteria: [
        'Expected synthesis depth is captured.',
        'Conflict-handling approach is defined.',
      ],
    },
    {
      id: 'citation_practices',
      name: 'Citation Practices',
      description: 'How sources should be cited, linked, quoted, and attributed in research outputs.',
      maps_to: ['evidence_policy', 'tone'],
      depth_tiers: ['quick', 'guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Capture citation format, link density, and attribution expectations.',
        'Ask when direct quotes are preferred over paraphrase.',
      ],
      coverage_criteria: [
        'Citation and attribution conventions are explicit.',
        'Quote vs paraphrase preferences are defined.',
      ],
    },
    {
      id: 'hypothesis_formation',
      name: 'Hypothesis Formation',
      description: 'How comfortable the user is with framing hypotheses, scenarios, and tentative explanations during research.',
      maps_to: ['tradeoffs', 'principles'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask when the agent should propose explanatory hypotheses.',
        'Clarify how explicitly uncertainty should be attached to hypotheses.',
      ],
      coverage_criteria: [
        'Hypothesis use is bounded.',
        'Uncertainty labeling expectations are defined.',
      ],
    },
    {
      id: 'research_scope',
      name: 'Research Scope Management',
      description: 'How broad or narrow research should be before the agent reports back or asks to refine the question.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask how the user prefers breadth versus depth for initial passes.',
        'Probe when the agent should narrow scope versus keep exploring.',
      ],
      coverage_criteria: [
        'Scoping preference is explicit.',
        'Stop conditions and refinement triggers are clear.',
      ],
    },
    {
      id: 'bias_awareness',
      name: 'Bias Awareness',
      description: 'How the agent should identify and communicate bias in sources, methods, and its own reasoning.',
      maps_to: ['evidence_policy', 'principles'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask which bias types matter most: commercial, political, sampling, survivorship, publication.',
        'Probe whether bias should be a discrete section or integrated into findings.',
      ],
      coverage_criteria: [
        'Bias categories of concern are defined.',
        'Bias-reporting style is explicit.',
      ],
    },
    {
      id: 'evidence_evaluation',
      name: 'Evidence Evaluation',
      description: 'How evidence strength should be graded and how conflicting evidence should be weighed.',
      maps_to: ['evidence_policy', 'tradeoffs'],
      depth_tiers: ['guided', 'operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Probe for preferred evidence ranking criteria: recency, rigor, relevance, scale.',
        'Ask how much conflicting evidence is needed to weaken a claim.',
      ],
      coverage_criteria: [
        'Evidence grading criteria are captured.',
        'Conflict weighting approach is defined.',
      ],
    },
    {
      id: 'question_refinement',
      name: 'Question Refinement',
      description: 'How proactively the agent should sharpen vague prompts into researchable questions.',
      maps_to: ['principles', 'tradeoffs', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether the agent should propose sharper subquestions before full research.',
        'Capture tolerance for iterative clarification.',
      ],
      coverage_criteria: [
        'Refinement expectations are explicit.',
        'Clarification threshold is documented.',
      ],
    },
    {
      id: 'deliverable_structure',
      name: 'Deliverable Structure',
      description: 'Preferred format for reports, briefs, memos, comparison tables, and recommendation summaries.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Identify preferred report structure and level of executive summary.',
        'Ask about use of tables, appendices, and evidence notes.',
      ],
      coverage_criteria: [
        'Preferred research output formats are defined.',
        'Required sections or reporting conventions are captured.',
      ],
    },
    {
      id: 'domain_familiarity',
      name: 'Domain Familiarity Assumptions',
      description: 'How much baseline context the agent should assume versus explain when researching specialized areas.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      priority: 'nice-to-have',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether outputs should assume expert, mixed, or novice audiences.',
        'Capture jargon tolerance and explanation depth.',
      ],
      coverage_criteria: [
        'Audience sophistication for research deliverables is clear.',
        'Explanation depth expectations are explicit.',
      ],
    },
    {
      id: 'competitor_lens',
      name: 'Competitor and Market Lens',
      description: 'How the agent should analyze competitors, substitutes, market structure, and positioning dynamics.',
      maps_to: ['domain_specific', 'principles'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask what competitor dimensions matter most: features, positioning, GTM, pricing, messaging.',
        'Probe direct competitors versus adjacent substitutes.',
      ],
      coverage_criteria: [
        'Competitive analysis framework is defined.',
        'Market comparison priorities are clear.',
      ],
    },
    {
      id: 'time_sensitivity',
      name: 'Time Sensitivity and Recency',
      description: 'How current the evidence needs to be and when older sources are still acceptable.',
      maps_to: ['evidence_policy', 'tradeoffs'],
      depth_tiers: ['operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask which topics require near-real-time verification.',
        'Clarify acceptable age of sources by research type.',
      ],
      coverage_criteria: [
        'Recency requirements are explicit.',
        'Exceptions for foundational older sources are defined.',
      ],
    },
    {
      id: 'decision_support',
      name: 'Decision-Support Orientation',
      description: 'Whether research should stop at findings or extend into recommendations, options, and next-step decisions.',
      maps_to: ['tradeoffs', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Probe for findings-only versus recommendations-first outputs.',
        'Ask how forcefully the agent should advise action when evidence is incomplete.',
      ],
      coverage_criteria: [
        'Decision-support role is explicit.',
        'Recommendation strength expectations are clear.',
      ],
    },
    {
      id: 'uncertainty_language',
      name: 'Uncertainty Language',
      description: 'How confidence, ambiguity, and unknowns should be communicated in research outputs.',
      maps_to: ['tone', 'evidence_policy'],
      depth_tiers: ['operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Ask whether confidence labels, probability language, or narrative caveats are preferred.',
        'Probe unacceptable forms of overstatement.',
      ],
      coverage_criteria: [
        'Preferred uncertainty signaling is defined.',
        'Overclaiming red lines are captured.',
      ],
    },
    {
      id: 'research_workflow',
      name: 'Research Workflow',
      description: 'How the user wants the agent to sequence scoping, source gathering, evaluation, synthesis, and delivery.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Capture preferred sequence of work and checkpoint cadence.',
        'Ask when interim briefs should be delivered before full synthesis.',
      ],
      coverage_criteria: [
        'Workflow stages are identified.',
        'Checkpoint and reporting expectations are clear.',
      ],
    },
    {
      id: 'escalation_thresholds',
      name: 'Escalation Thresholds',
      description: 'What high-risk findings, weak evidence situations, or ethical concerns require immediate escalation.',
      maps_to: ['taboos', 'evidence_policy', 'tradeoffs'],
      depth_tiers: ['operator'],
      priority: 'critical',
      question_budget: { min: 1, max: 2 },
      exploration_hints: [
        'Identify legal, medical, financial, or reputational cases requiring caution.',
        'Ask what to do when evidence is too weak for a requested conclusion.',
      ],
      coverage_criteria: [
        'Escalation triggers are explicit.',
        'Fallback behavior under weak evidence is defined.',
      ],
    },
    {
      id: 'reproducibility',
      name: 'Reproducibility and Auditability',
      description: 'How traceable the research process should be so another person can inspect or reproduce it later.',
      maps_to: ['evidence_policy', 'domain_specific'],
      depth_tiers: ['operator'],
      priority: 'important',
      question_budget: { min: 0, max: 1 },
      exploration_hints: [
        'Ask whether search paths, source logs, and decision notes should be preserved.',
        'Probe audit trail expectations for high-stakes work.',
      ],
      coverage_criteria: [
        'Auditability requirements are defined.',
        'Reproducibility expectations for methods and sources are captured.',
      ],
    },
  ],
};
