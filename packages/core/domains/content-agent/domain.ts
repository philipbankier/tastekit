/**
 * Content Agent Domain
 *
 * Domain for agents that create, adapt, and review written content while
 * preserving voice, audience fit, and evidence discipline.
 */

import { DomainDefinition } from '../types.js';

export const ContentAgentDomain: DomainDefinition = {
  id: 'content-agent',
  name: 'Content Agent',
  description: 'Content creation, adaptation, and review with strong voice and evidence controls',
  version: '1.0.0',
  use_cases: [
    'Launch posts, founder updates, and product narratives',
    'Audience-specific content adaptation across channels',
    'Editorial review for voice, clarity, claims, and generic language',
    'Content calendars and campaign drafts that preserve brand taste',
  ],
  recommended_tools: [
    'file-system',
    'web-search',
    'content-calendar',
    'analytics',
    'publishing-workflow',
  ],
  default_autonomy_level: 0.45,
  vocabulary: {
    principles_heading: 'Editorial Principles',
    guardrails_heading: 'Publishing Guardrails',
    skills_heading: 'Content Workflows',
    constitution_label: 'Editorial Profile',
    skill_label: 'Workflow',
    playbook_label: 'Editorial Runbook',
    drift_verb: 'Voice drift',
  },
};
