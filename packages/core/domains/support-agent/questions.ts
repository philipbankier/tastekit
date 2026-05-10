/**
 * Support Agent Onboarding Questions
 *
 * Structured fallback questions for support agents.
 */

import { Question } from '../../interview/questions.js';
import { SUPPORT_CHANNELS } from './domain.js';

export const SupportAgentQuestions: Question[] = [
  // Support Philosophy
  {
    id: 'support_approach',
    category: 'support_philosophy',
    type: 'choice',
    text: 'What is your primary support philosophy?',
    choices: [
      'Help-first: Solve the problem as quickly as possible',
      'Education-first: Teach customers to help themselves',
      'Empathy-first: Make customers feel heard and valued',
      'Efficiency-first: Handle maximum volume with consistent quality',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'support_tone',
    category: 'tone_and_empathy',
    type: 'choice',
    text: 'How should the agent communicate with customers?',
    choices: [
      'Warm and personal: Use first names, conversational tone',
      'Professional and calm: Clear, courteous, neutral',
      'Friendly and casual: Relaxed, approachable, emoji-okay',
      'Formal and precise: Corporate tone, no informality',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'support_escalation_trigger',
    category: 'escalation_approach',
    type: 'multi-choice',
    text: 'What situations should always be escalated to a human?',
    choices: [
      'Angry or threatening customers',
      'Billing/refund disputes',
      'Security or data privacy issues',
      'Legal or compliance concerns',
      'Unresolved after 2 attempts',
      'Customer explicitly requests a human',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'support_response_format',
    category: 'response_style',
    type: 'choice',
    text: 'How should the agent format responses?',
    choices: [
      'Concise: Short, direct answers',
      'Detailed: Step-by-step with explanations',
      'Adaptive: Match the complexity of the question',
    ],
    required: true,
    depth: 'quick',
  },
  {
    id: 'support_kb_usage',
    category: 'knowledge_management',
    type: 'choice',
    text: 'How should the agent use the knowledge base?',
    choices: [
      'Link to articles: Point customers to existing docs',
      'Inline answers: Extract and summarize relevant content',
      'Both: Inline answer with link for more detail',
    ],
    required: true,
    depth: 'quick',
  },

  // Workflow & Process
  {
    id: 'support_channels',
    category: 'multi_channel',
    type: 'multi-choice',
    text: 'Which support channels do you operate?',
    choices: Array.from(SUPPORT_CHANNELS),
    required: true,
    depth: 'guided',
  },
  {
    id: 'support_priority_criteria',
    category: 'ticket_triage',
    type: 'text',
    text: 'What makes a ticket critical vs. low priority? Describe your criteria:',
    required: true,
    depth: 'guided',
  },
  {
    id: 'support_first_response_target',
    category: 'sla_awareness',
    type: 'choice',
    text: 'What is your target first response time?',
    choices: [
      'Under 1 hour',
      '1-4 hours',
      'Same business day',
      'Within 24 hours',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'support_resolution_docs',
    category: 'resolution_workflow',
    type: 'choice',
    text: 'Should the agent document resolution steps for each ticket?',
    choices: [
      'Yes: Full resolution notes for every ticket',
      'Selective: Only for complex or recurring issues',
      'No: Just mark resolved',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'support_templates_vs_personal',
    category: 'customer_communication',
    type: 'choice',
    text: 'Template-based or personalized responses?',
    choices: [
      'Templates: Consistent, fast, approved messaging',
      'Personalized: Unique response every time',
      'Hybrid: Templates as starting points, personalized delivery',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'support_csat_collection',
    category: 'feedback_collection',
    type: 'choice',
    text: 'How should customer satisfaction be collected?',
    choices: [
      'After every interaction',
      'Random sampling (e.g., 25% of tickets)',
      'Only after escalations or complex issues',
      'Not collecting CSAT currently',
    ],
    required: true,
    depth: 'guided',
  },
  {
    id: 'support_known_issues',
    category: 'known_issue_handling',
    type: 'choice',
    text: 'When a customer reports a known issue, should the agent:',
    choices: [
      'Acknowledge immediately and provide the workaround',
      'Troubleshoot as normal, then reveal it\'s a known issue',
      'Direct to status page and provide ETA if available',
    ],
    required: true,
    depth: 'guided',
  },

  // Operator-level
  {
    id: 'support_vip_treatment',
    category: 'vip_handling',
    type: 'choice',
    text: 'Do you have tiered customer service (VIP/enterprise tiers)?',
    choices: [
      'Yes: Different SLAs and treatment by tier',
      'No: Everyone gets the same service',
    ],
    required: true,
    depth: 'operator',
  },
  {
    id: 'support_crisis_protocol',
    category: 'crisis_communication',
    type: 'text',
    text: 'How should the agent communicate during major outages or incidents?',
    required: false,
    depth: 'operator',
  },
  {
    id: 'support_pattern_detection',
    category: 'root_cause_analysis',
    type: 'choice',
    choices: ['Yes', 'No'],
    text: 'Should the agent detect recurring issues and flag them for the product/engineering team?',
    required: true,
    depth: 'operator',
  },
];
