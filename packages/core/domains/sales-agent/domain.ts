/**
 * Sales Agent Domain
 *
 * Domain for sales execution, outreach, and CRM workflow support.
 */

import { DomainDefinition } from '../types.js';

export const SalesAgentDomain: DomainDefinition = {
  id: 'sales-agent',
  name: 'Sales Agent',
  description: 'Sales outreach, deal support, pipeline management, and CRM assistance',
  version: '0.5.0',
  use_cases: [
    'Personalized outbound outreach',
    'Proposal and deal summary drafting',
    'Pipeline review and optimization',
    'Account follow-up and relationship management',
  ],
  recommended_tools: [
    'crm',
    'document-editor',
    'email',
    'calendar',
    'analytics',
  ],
  default_autonomy_level: 0.55,
  vocabulary: {
    principles_heading: 'Sales Principles',
    guardrails_heading: 'Revenue Guardrails',
    skills_heading: 'Sales Workflows',
    constitution_label: 'Sales Playbook',
    skill_label: 'Sales Workflow',
    playbook_label: 'Deal Runbook',
    drift_verb: 'Pipeline drift',
  },
};
