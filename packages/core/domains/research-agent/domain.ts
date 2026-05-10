/**
 * Research Agent Domain
 *
 * Domain for information gathering, analysis, and synthesis agents.
 */

import { DomainDefinition } from '../types.js';

export const ResearchAgentDomain: DomainDefinition = {
  id: 'research-agent',
  name: 'Research Agent',
  description: 'Information gathering, analysis, and synthesis',
  version: '1.0.0',
  use_cases: [
    'Market research and competitive analysis',
    'Academic research and literature reviews',
    'News monitoring and trend analysis',
    'Due diligence and fact-checking',
  ],
  recommended_tools: [
    'web-search',
    'academic-databases',
    'news-apis',
    'pdf-reader',
    'data-analysis',
  ],
  default_autonomy_level: 0.7,
};

export const RESEARCH_OUTPUT_FORMATS = [
  'executive_summary',
  'detailed_report',
  'bullet_points',
  'data_table',
  'presentation_outline',
] as const;

export type ResearchOutputFormat = typeof RESEARCH_OUTPUT_FORMATS[number];

export const RESEARCH_SOURCE_TYPES = [
  'academic',
  'news',
  'industry_reports',
  'government',
  'primary_interviews',
  'social_media',
] as const;

export type ResearchSourceType = typeof RESEARCH_SOURCE_TYPES[number];
