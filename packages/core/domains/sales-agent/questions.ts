/**
 * Sales Agent Onboarding Questions
 *
 * Structured fallback questions for sales agents.
 */

import { Question } from '../../interview/questions.js';
import { SALES_METHODOLOGIES } from './domain.js';

export const SalesAgentQuestions: Question[] = [
  // Sales Philosophy
  {
    id: 'sales_approach',
    category: 'sales_philosophy',
    type: 'choice',
    text: 'Which sales methodology best describes your approach?',
    choices: [
      'Consultative: Understand needs deeply, then recommend solutions',
      'Challenger: Teach, tailor, and take control of the conversation',
      'Relationship: Build trust first, sell second',
      'Solution: Focus on solving specific pain points',
      'Transactional: Efficient, high-volume, low-touch',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'sales_tone',
    category: 'communication_style',
    type: 'choice',
    text: 'How should the agent communicate with prospects?',
    choices: [
      'Professional and polished',
      'Warm and conversational',
      'Direct and data-driven',
      'Casual and friendly',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'sales_ideal_customer',
    category: 'lead_qualification',
    type: 'text',
    text: 'Describe your ideal customer in 2-3 sentences (industry, size, pain points):',
    required: true,
    depth: 'quick',
  },
  {
    id: 'sales_pipeline_style',
    category: 'deal_management',
    type: 'choice',
    text: 'How do you prefer to manage your pipeline?',
    choices: [
      'Fast: Move deals quickly, disqualify early',
      'Patient: Nurture over time, build relationships',
      'Data-driven: Let metrics guide stage progression',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'sales_relationship_focus',
    category: 'customer_relationship',
    type: 'choice',
    text: 'What matters more: winning new deals or growing existing accounts?',
    choices: [
      'New business: Focus on prospecting and closing',
      'Account growth: Focus on expansion and retention',
      'Balanced: Both matter equally',
    ],
    required: true,
    depth: 'quick',
  },

  // Communication & Process
  {
    id: 'sales_follow_up_timing',
    category: 'outreach_cadence',
    type: 'choice',
    text: 'How soon should the agent follow up after initial outreach?',
    choices: [
      'Next day',
      '2-3 days',
      'One week',
      'Only if there was engagement',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'sales_max_touches',
    category: 'outreach_cadence',
    type: 'choice',
    text: 'Maximum number of outreach attempts before moving on?',
    choices: [
      '3 attempts',
      '5 attempts',
      '7+ attempts',
      'Never give up on qualified leads',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'sales_objection_style',
    category: 'objection_handling',
    type: 'choice',
    text: 'How should the agent handle objections?',
    choices: [
      'Acknowledge and reframe: Validate the concern, offer a new perspective',
      'Data-driven: Counter with facts and case studies',
      'Empathetic: Focus on understanding, not convincing',
      'Direct: Address head-on with confidence',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'sales_proposal_format',
    category: 'proposal_style',
    type: 'choice',
    text: 'What format should sales proposals take?',
    choices: [
      'Detailed document with ROI analysis',
      'Concise one-pager with key points',
      'Slide deck with visuals',
      'Email summary with pricing',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'sales_crm',
    category: 'crm_workflow',
    type: 'text',
    text: 'Which CRM do you use? (e.g., Salesforce, HubSpot, Pipedrive, none)',
    required: false,
    depth: 'guided',
  },
  {
    id: 'sales_metrics',
    category: 'reporting_preferences',
    type: 'multi-choice',
    text: 'Which sales metrics matter most?',
    choices: [
      'Pipeline value',
      'Conversion rate',
      'Average deal size',
      'Sales cycle length',
      'Activity volume (calls, emails)',
      'Win rate',
    ],
    required: true,
    depth: 'guided',
  },

  // Operator-level
  {
    id: 'sales_customer_size',
    category: 'enterprise_vs_smb',
    type: 'choice',
    text: 'What size customers do you primarily sell to?',
    choices: [
      'Enterprise (1000+ employees)',
      'Mid-market (100-1000 employees)',
      'SMB (under 100 employees)',
      'Mixed across segments',
    ],
    required: true,
    depth: 'operator',
  },
  {
    id: 'sales_competitor_handling',
    category: 'competitive_positioning',
    type: 'choice',
    text: 'How should the agent handle competitor mentions?',
    choices: [
      'Acknowledge competitors, differentiate on value',
      'Avoid mentioning competitors entirely',
      'Direct comparison when asked',
    ],
    required: true,
    depth: 'operator',
  },
  {
    id: 'sales_discount_policy',
    category: 'pricing_strategy',
    type: 'choice',
    text: 'What is the agent\'s discount authority?',
    choices: [
      'No discounts without approval',
      'Up to 10% discretion',
      'Up to 20% discretion',
      'Flexible based on deal size',
    ],
    required: true,
    depth: 'operator',
  },
  {
    id: 'sales_compliance_notes',
    category: 'compliance_awareness',
    type: 'text',
    text: 'Any compliance requirements? (e.g., CAN-SPAM, GDPR, industry regulations)',
    required: false,
    depth: 'operator',
  },
];
