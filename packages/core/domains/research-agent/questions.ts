/**
 * Research Agent Onboarding Questions
 *
 * Structured fallback questions for research agents.
 */

import { Question } from '../../interview/questions.js';
import { RESEARCH_OUTPUT_FORMATS, RESEARCH_SOURCE_TYPES } from './domain.js';

export const ResearchAgentQuestions: Question[] = [
  // Research Methodology
  {
    id: 'research_approach',
    category: 'research_methodology',
    type: 'choice',
    text: 'How do you typically approach a research project?',
    choices: [
      'Systematic: Define scope, create framework, execute methodically',
      'Exploratory: Start broad, follow interesting threads, let findings guide me',
      'Hypothesis-driven: Formulate a thesis, then seek confirming/disconfirming evidence',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'research_sources',
    category: 'source_preferences',
    type: 'multi-choice',
    text: 'Which source types do you consider most authoritative?',
    choices: Array.from(RESEARCH_SOURCE_TYPES),
    required: true,
    depth: 'quick',
  },
  {
    id: 'research_output',
    category: 'output_format',
    type: 'choice',
    text: 'How do you prefer to receive research findings?',
    choices: Array.from(RESEARCH_OUTPUT_FORMATS),
    required: true,
    depth: 'quick',
  },
  {
    id: 'research_depth_preference',
    category: 'depth_vs_breadth',
    type: 'choice',
    text: 'When researching a topic, do you prefer depth or breadth?',
    choices: [
      'Deep: Fewer sources analyzed thoroughly',
      'Broad: Many sources summarized quickly',
      'Balanced: Key sources in depth, the rest summarized',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'research_synthesis',
    category: 'synthesis_style',
    type: 'choice',
    text: 'How should the agent present synthesis of findings?',
    choices: [
      'Executive summary with key takeaways',
      'Narrative analysis with supporting evidence',
      'Structured bullet points with source links',
      'Data tables and comparison matrices',
    ],
    required: true,
    depth: 'quick',
  },

  // Citation & Verification
  {
    id: 'research_citations',
    category: 'citation_standards',
    type: 'choice',
    text: 'How rigorous should citations be?',
    choices: [
      'Academic: Full citations with author, date, publication',
      'Professional: Inline links to sources',
      'Casual: Source names mentioned, links optional',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'research_verification',
    category: 'cross_referencing',
    type: 'choice',
    text: 'How many independent sources should confirm a claim?',
    choices: [
      'One authoritative source is enough',
      'At least 2 independent sources',
      '3+ sources for important claims',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'research_bias_handling',
    category: 'bias_awareness',
    type: 'choice',
    text: 'How should the agent handle conflicting or biased sources?',
    choices: [
      'Present all perspectives equally and let me decide',
      'Flag bias but present the strongest arguments from each side',
      'Synthesize a balanced view and note dissenting opinions',
    ],
    required: true,
    depth: 'guided',
  },

  // Tools & Scope
  {
    id: 'research_recency',
    category: 'temporal_scope',
    type: 'choice',
    text: 'How recent should research sources be?',
    choices: [
      'Only last 6 months',
      'Last 1-2 years',
      'Last 5 years',
      'Historical context matters — no time limit',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'research_data_comfort',
    category: 'data_interpretation',
    type: 'choice',
    text: 'Should the agent interpret data and statistics, or present raw?',
    choices: [
      'Interpret: Explain what the numbers mean',
      'Present: Show data with minimal interpretation',
      'Both: Raw data with interpretation notes',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'research_competitive',
    category: 'competitive_analysis_style',
    type: 'choice',
    choices: ['Yes', 'No'],
    text: 'Will you use the agent for competitive or market analysis?',
    required: true,
    depth: 'guided',
  },
  {
    id: 'research_tools',
    category: 'research_tools',
    type: 'text',
    text: 'What research tools/databases do you have access to? (e.g., Google Scholar, Semantic Scholar, industry databases)',
    required: false,
    depth: 'guided',
  },

  // Operator-level
  {
    id: 'research_methodology_docs',
    category: 'methodology_documentation',
    type: 'choice',
    choices: ['Yes', 'No'],
    text: 'Should the agent document its research methodology alongside findings?',
    required: true,
    depth: 'operator',
  },
  {
    id: 'research_recommendations',
    category: 'hypothesis_framing',
    type: 'choice',
    text: 'Should the agent make recommendations based on findings?',
    choices: [
      'Yes: Findings plus recommendations',
      'Sometimes: Only when confidence is high',
      'No: Neutral presentation only',
    ],
    required: true,
    depth: 'operator',
  },
  {
    id: 'research_ethics_boundaries',
    category: 'research_ethics',
    type: 'text',
    text: 'Are there ethical boundaries for research? (e.g., no scraping personal data, no accessing paywalled content)',
    required: false,
    depth: 'operator',
  },
];
