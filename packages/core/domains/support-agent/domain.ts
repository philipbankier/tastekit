/**
 * Support Agent Domain
 *
 * Domain for customer support, troubleshooting, and helpdesk workflows.
 */

import { DomainDefinition } from '../types.js';

export const SupportAgentDomain: DomainDefinition = {
  id: 'support-agent',
  name: 'Support Agent',
  description: 'Customer support, helpdesk response, troubleshooting, and knowledge base assistance',
  version: '0.5.0',
  use_cases: [
    'Troubleshooting customer issues',
    'Crafting empathetic support responses',
    'Ticket prioritization and escalation support',
    'Knowledge base maintenance and solution capture',
  ],
  recommended_tools: [
    'ticketing-system',
    'knowledge-base',
    'document-editor',
    'analytics',
    'crm',
  ],
  default_autonomy_level: 0.5,
  vocabulary: {
    principles_heading: 'Support Principles',
    guardrails_heading: 'Service Guardrails',
    skills_heading: 'Support Workflows',
    constitution_label: 'Support Playbook',
    skill_label: 'Support Workflow',
    playbook_label: 'Resolution Runbook',
    drift_verb: 'Service drift',
  },
};
