/**
 * Research Agent Domain
 *
 * Domain for research, analysis, and synthesis workflows.
 */

import { DomainDefinition } from '../types.js';

export const ResearchAgentDomain: DomainDefinition = {
  id: 'research-agent',
  name: 'Research Agent',
  description: 'Research, analysis, and evidence synthesis assistance',
  version: '0.5.0',
  use_cases: [
    'Web and document research',
    'Competitive and market analysis',
    'Evidence-backed synthesis and reporting',
    'Hypothesis development and validation',
  ],
  recommended_tools: [
    'web-search',
    'file-system',
    'document-editor',
    'spreadsheets',
    'citations',
  ],
  default_autonomy_level: 0.45,
  vocabulary: {
    principles_heading: 'Research Principles',
    guardrails_heading: 'Evidence Guardrails',
    skills_heading: 'Research Workflows',
    constitution_label: 'Research Handbook',
    skill_label: 'Research Workflow',
    playbook_label: 'Analysis Runbook',
    drift_verb: 'Evidence drift',
  },
};
