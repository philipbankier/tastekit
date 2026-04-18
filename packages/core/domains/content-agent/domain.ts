/**
 * Content Agent Domain
 *
 * Domain for content creation, editorial strategy, and publishing support.
 */

import { DomainDefinition } from '../types.js';

export const ContentAgentDomain: DomainDefinition = {
  id: 'content-agent',
  name: 'Content Agent',
  description: 'Content creation, editorial strategy, and publishing assistance',
  version: '0.5.0',
  use_cases: [
    'Content strategy and planning',
    'Post and campaign ideation',
    'Editorial review and revision',
    'Audience-specific content adaptation',
  ],
  recommended_tools: [
    'web-search',
    'document-editor',
    'file-system',
    'analytics',
    'brand-guidelines',
  ],
  default_autonomy_level: 0.5,
  vocabulary: {
    principles_heading: 'Editorial Principles',
    guardrails_heading: 'Publishing Guardrails',
    skills_heading: 'Content Workflows',
    constitution_label: 'Content Handbook',
    skill_label: 'Content Workflow',
    playbook_label: 'Editorial Runbook',
    drift_verb: 'Voice drift',
  },
};
