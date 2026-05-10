/**
 * Sales Agent Domain
 *
 * Domain for lead generation, qualification, and deal management agents.
 */

import { DomainDefinition } from '../types.js';

export const SalesAgentDomain: DomainDefinition = {
  id: 'sales-agent',
  name: 'Sales Agent',
  description: 'Lead generation, qualification, and deal management',
  version: '1.0.0',
  use_cases: [
    'Lead qualification and outreach',
    'CRM management and follow-ups',
    'Proposal generation',
    'Sales analytics and forecasting',
  ],
  recommended_tools: [
    'crm-integration',
    'email-sender',
    'calendar-scheduler',
    'document-generator',
    'web-search',
  ],
  default_autonomy_level: 0.5,
};

export const SALES_METHODOLOGIES = [
  'consultative',
  'challenger',
  'solution',
  'relationship',
  'transactional',
] as const;

export type SalesMethodology = typeof SALES_METHODOLOGIES[number];

export const DEAL_STAGES = [
  'prospecting',
  'qualification',
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const;

export type DealStage = typeof DEAL_STAGES[number];
