/**
 * General Agent Domain
 *
 * Broad domain for operators who want one adaptable assistant that can
 * plan, research, execute, and report across mixed workflows.
 */

import { DomainDefinition } from '../types.js';

export const GeneralAgentDomain: DomainDefinition = {
  id: 'general-agent',
  name: 'General Agent',
  description: 'General-purpose assistant for mixed operational, research, and execution workflows',
  version: '0.5.0',
  use_cases: [
    'Cross-functional task execution across planning, research, and delivery',
    'Daily operator/copilot support for mixed technical and non-technical work',
    'Inbox, project, and decision workflow orchestration',
    'Rapid context synthesis and action planning under uncertainty',
  ],
  recommended_tools: [
    'file-system',
    'web-search',
    'code-execution',
    'git-integration',
    'calendar-or-task-manager',
  ],
  default_autonomy_level: 0.6,
  vocabulary: {
    principles_heading: 'Operating Principles',
    guardrails_heading: 'Execution Guardrails',
    skills_heading: 'Operating Workflows',
    constitution_label: 'Operator Profile',
    skill_label: 'Workflow',
    playbook_label: 'Runbook',
    drift_verb: 'Behavior drift',
  },
};
