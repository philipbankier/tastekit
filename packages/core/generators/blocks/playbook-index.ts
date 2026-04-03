/**
 * Playbook Index Block — Available playbooks with trigger conditions.
 * Included only when playbooks were compiled.
 */
import type { GeneratorBlock } from '../types.js';

export const playbookIndexBlock: GeneratorBlock = (ctx) => {
  if (!ctx.has_playbooks) return null;

  const label = ctx.vocabulary?.playbook_label ?? 'Playbook';
  const lines: string[] = [
    `## Available ${label}s`,
    '',
    `${label}s are multi-step workflows for complex tasks. Check the \`playbooks/\` directory for available ${label.toLowerCase()}s.`,
    '',
    `Each ${label.toLowerCase()} contains trigger conditions, step-by-step instructions, and rollback procedures.`,
  ];

  return lines.join('\n');
};
