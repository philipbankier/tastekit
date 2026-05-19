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
 * Research Agent Domain Rubric
 *
 * 18 domain-specific dimensions for information gathering, analysis, and synthesis.
 * Combined with 7 universal dimensions, this gives:
 *   quick=12, guided=20, operator=25
 */
export const ResearchAgentRubric: DomainRubric = {
  domain_id: 'research-agent',
  version: '1.1.0',
  interview_goal: 'Understand the user\'s research methodology, source preferences, synthesis style, and quality standards to configure an agent that researches the way they would.',
  includes_universal: true,

  dimensions: ([
    // === QUICK TIER (5 domain-specific dimensions) ===
    {
      id: 'research_methodology',
      name: 'Research Methodology',
      description: 'How they approach research. Systematic and structured, exploratory and creative, or hypothesis-driven and scientific?',
      maps_to: ['principles'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask how they typically start a research project',
        'Probe for whether they prefer structured frameworks or open exploration',
        'Understand if they formulate hypotheses before researching or let findings guide them',
        'Listen for implicit research philosophy in how they describe past projects',
      ],
      coverage_criteria: [
        'Research approach identified (systematic/exploratory/hypothesis-driven)',
        'Starting methodology understood',
      ],
    },
    {
      id: 'source_preferences',
      name: 'Source Preferences & Hierarchy',
      description: 'What types of sources they trust most. Academic papers, news outlets, industry reports, government data, primary interviews, social media signals.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask which sources they consider authoritative in their field',
        'Probe for source hierarchy: what sources are gold standard vs. supplementary?',
        'Understand tolerance for non-academic or informal sources',
        'Ask about primary vs. secondary source preferences',
      ],
      coverage_criteria: [
        'Preferred source types identified',
        'Source authority hierarchy established',
      ],
    },
    {
      id: 'synthesis_style',
      name: 'Synthesis & Presentation Style',
      description: 'How findings should be synthesized and presented. Executive summary, deep analysis, bullet points, narrative form.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask how they prefer to receive research findings',
        'Probe for narrative vs. structured preferences',
        'Understand whether they want conclusions or just organized facts',
        'Ask about the audience they typically share research with',
      ],
      coverage_criteria: [
        'Synthesis style identified',
        'Presentation format preference captured',
      ],
    },
    {
      id: 'output_format',
      name: 'Output Format & Structure',
      description: 'Deliverable format preferences. Report structure, visualization approach, data table formatting, section organization.',
      maps_to: ['tone', 'domain_specific'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask about preferred report structure (sections, headings, length)',
        'Probe for visualization preferences: charts, tables, or text?',
        'Understand formatting expectations: markdown, docs, slides?',
        'Ask about appendix vs. inline detail preferences',
      ],
      coverage_criteria: [
        'Output format preference expressed',
        'Structure expectations captured',
      ],
    },
    {
      id: 'depth_vs_breadth',
      name: 'Depth vs. Breadth Preference',
      description: 'Whether research should go deep on fewer topics or cover breadth across many. Thoroughness vs. speed tradeoff.',
      maps_to: ['tradeoffs'],
      depth_tiers: ['quick', 'guided', 'operator'],
      exploration_hints: [
        'Ask whether they prefer comprehensive depth or quick overviews',
        'Probe with a tradeoff: "Would you rather have 3 deeply analyzed sources or 15 summarized?"',
        'Understand time sensitivity: when is "good enough" acceptable?',
        'Ask about their tolerance for incomplete but fast results',
      ],
      coverage_criteria: [
        'Depth vs. breadth position captured',
        'Speed vs. thoroughness tradeoff expressed',
      ],
    },

    // === GUIDED TIER adds 8 more dimensions ===
    {
      id: 'citation_standards',
      name: 'Citation & Attribution Standards',
      description: 'How rigorous citations should be. Inline links, footnotes, academic formatting, or informal attribution.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about citation expectations: academic rigor or casual links?',
        'Probe for formatting preferences (APA, inline URLs, footnotes)',
        'Understand whether every claim needs a source or just key ones',
        'Ask about link freshness: do they want archive links for durability?',
      ],
      coverage_criteria: [
        'Citation rigor level set',
        'Attribution format preference captured',
      ],
    },
    {
      id: 'bias_awareness',
      name: 'Bias Awareness & Perspective Balance',
      description: 'How to handle biased sources and whether to represent multiple perspectives. Neutral reporting vs. opinionated synthesis.',
      maps_to: ['principles'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask how they want the agent to handle conflicting sources',
        'Probe for multi-perspective requirements: should both sides be presented?',
        'Understand their stance on flagging potential bias in sources',
        'Ask whether they want the agent to note when evidence is one-sided',
      ],
      coverage_criteria: [
        'Bias handling approach captured',
        'Perspective balance requirement expressed',
      ],
    },
    {
      id: 'data_interpretation',
      name: 'Data Interpretation & Visualization',
      description: 'Comfort level with statistics, data tables, and charts. Whether the agent should interpret data or present it raw.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about statistical comfort: should the agent analyze numbers or just present them?',
        'Probe for visualization preferences: tables, charts, or narrative descriptions?',
        'Understand whether they want statistical significance noted',
        'Ask about data formatting preferences (percentages, absolutes, comparisons)',
      ],
      coverage_criteria: [
        'Data interpretation expectations set',
        'Visualization preferences expressed',
      ],
    },
    {
      id: 'competitive_analysis_style',
      name: 'Competitive & Market Analysis',
      description: 'How to approach competitor or market research. Framework usage, comparison matrices, SWOT analysis.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask if competitive analysis is part of their research needs',
        'Probe for preferred frameworks (SWOT, Porter\'s Five Forces, feature matrices)',
        'Understand how they want competitors presented: side-by-side or narrative?',
        'Ask about ethical boundaries in competitive research',
      ],
      coverage_criteria: [
        'Competitive analysis approach captured',
      ],
    },
    {
      id: 'temporal_scope',
      name: 'Temporal Scope & Recency',
      description: 'How recent sources should be. Whether historical context matters or only current data is relevant.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about time horizons: how recent must sources be?',
        'Probe for historical context needs: is trend analysis important?',
        'Understand whether outdated sources should be flagged or excluded',
        'Ask about real-time monitoring vs. snapshot research',
      ],
      coverage_criteria: [
        'Temporal scope preferences set',
      ],
    },
    {
      id: 'cross_referencing',
      name: 'Cross-Referencing & Verification',
      description: 'Multi-source verification requirements. How many independent sources confirm a claim before it\'s considered reliable.',
      maps_to: ['principles', 'domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about verification standards: single source or multi-source?',
        'Probe for how they handle conflicting data across sources',
        'Understand their threshold for "confirmed" vs. "reported"',
        'Ask about triangulation expectations',
      ],
      coverage_criteria: [
        'Verification standards captured',
        'Multi-source requirements expressed',
      ],
    },
    {
      id: 'fact_checking_rigor',
      name: 'Fact-Checking Rigor',
      description: 'How aggressively claims should be verified. High rigor (verify everything) vs. pragmatic (trust authoritative sources).',
      maps_to: ['principles'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about their fact-checking expectations',
        'Probe for which types of claims need verification vs. can be taken at face value',
        'Understand tolerance for unverified but plausible information',
        'Ask about flagging uncertain vs. verified claims',
      ],
      coverage_criteria: [
        'Fact-checking rigor level set',
      ],
    },
    {
      id: 'research_tools',
      name: 'Research Tools & Sources',
      description: 'Available databases, APIs, search tools. What tools the agent has access to and preferences for using them.',
      maps_to: ['domain_specific'],
      depth_tiers: ['guided', 'operator'],
      exploration_hints: [
        'Ask about available research tools and databases',
        'Probe for search engine preferences (Google Scholar, Semantic Scholar, etc.)',
        'Understand access to paywalled content or specialized APIs',
        'Ask about tool usage preferences and limitations',
      ],
      coverage_criteria: [
        'Available tools identified',
        'Tool preferences expressed',
      ],
    },

    // === OPERATOR TIER adds 5 more dimensions ===
    {
      id: 'methodology_documentation',
      name: 'Methodology Documentation',
      description: 'Whether and how the research process itself should be documented. Reproducibility, audit trail, methodology sections.',
      maps_to: ['domain_specific'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask whether they want the research methodology documented alongside findings',
        'Probe for audit trail requirements: should search queries be logged?',
        'Understand reproducibility expectations',
        'Ask about methodology sections in reports',
      ],
      coverage_criteria: [
        'Documentation expectations for research process set',
      ],
    },
    {
      id: 'hypothesis_framing',
      name: 'Hypothesis Framing & Recommendations',
      description: 'Whether findings should be presented neutrally or with recommendations. Descriptive vs. prescriptive research output.',
      maps_to: ['tone', 'principles'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask whether the agent should make recommendations or stay neutral',
        'Probe for opinion tolerance: is it okay to frame findings with a point of view?',
        'Understand the line between analysis and advocacy',
        'Ask about confidence-level labeling for recommendations',
      ],
      coverage_criteria: [
        'Recommendation vs. neutral stance captured',
      ],
    },
    {
      id: 'stakeholder_communication',
      name: 'Stakeholder Communication',
      description: 'Adapting research output for different audiences. Technical vs. executive summaries, jargon level, detail depth.',
      maps_to: ['tone'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about different audiences who consume the research',
        'Probe for how output should change based on audience (executive vs. technical)',
        'Understand jargon tolerance for different stakeholders',
        'Ask about multi-format output needs',
      ],
      coverage_criteria: [
        'Audience adaptation expectations captured',
      ],
    },
    {
      id: 'research_ethics',
      name: 'Research Ethics & Privacy',
      description: 'Ethical boundaries in research. Privacy considerations, consent for data collection, responsible use of personal data.',
      maps_to: ['taboos', 'principles'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask about ethical boundaries in research data collection',
        'Probe for privacy considerations: what data is off-limits?',
        'Understand their stance on scraping, public vs. private data',
        'Ask about responsible disclosure considerations',
      ],
      coverage_criteria: [
        'Research ethics boundaries set',
      ],
    },
    {
      id: 'uncertainty_quantification',
      name: 'Uncertainty & Confidence Levels',
      description: 'How to express uncertainty in findings. Confidence intervals, certainty language, hedging style.',
      maps_to: ['domain_specific', 'tradeoffs'],
      depth_tiers: ['operator'],
      exploration_hints: [
        'Ask how they want uncertainty communicated in findings',
        'Probe for confidence level labeling preferences',
        'Understand statistical significance expectations',
        'Ask about hedging language tolerance vs. definitive statements',
      ],
      coverage_criteria: [
        'Uncertainty communication style captured',
      ],
    },
  ] satisfies DomainDimensionInput[]).map(withDefaultDimensionFields),
};
