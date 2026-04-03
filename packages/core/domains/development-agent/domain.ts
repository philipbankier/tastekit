/**
 * Development Agent Domain
 *
 * Domain for software development assistance agents.
 */

import { DomainDefinition } from '../types.js';

export const DevelopmentAgentDomain: DomainDefinition = {
  id: 'development-agent',
  name: 'Development Agent',
  description: 'Software development assistance and automation',
  version: '0.5.0',
  use_cases: [
    'Code review and refactoring',
    'Documentation generation',
    'Bug triage and debugging assistance',
    'Test generation',
  ],
  recommended_tools: [
    'file-system',
    'code-execution',
    'git-integration',
    'linter',
    'test-runner',
  ],
  default_autonomy_level: 0.6,
  vocabulary: {
    principles_heading: 'Engineering Standards',
    guardrails_heading: 'Safety Guardrails',
    skills_heading: 'Dev Workflows',
    constitution_label: 'Engineering Handbook',
    skill_label: 'Workflow',
    playbook_label: 'Runbook',
    drift_verb: 'Standards drift',
  },
};
