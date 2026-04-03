/**
 * Domain Context Block — Domain-specific guidance.
 * Included only when domain_id is set.
 */
import type { GeneratorBlock } from '../types.js';

const DOMAIN_GUIDANCE: Record<string, string> = {
  'development-agent': [
    'This agent specializes in software development.',
    '- Review code against engineering standards before suggesting changes',
    '- Prioritize correctness and security over cleverness',
    '- Follow existing codebase patterns and conventions',
    '- Write tests for new functionality',
  ].join('\n'),

  'general-agent': [
    'This agent specializes in general-purpose execution across mixed workflows.',
    '- Synthesize context before acting when the task is ambiguous',
    '- Prefer explicit plans and checkpoints for multi-step work',
    '- Balance research, execution, and reporting based on user goals',
    '- Escalate when uncertainty or risk exceeds the configured autonomy level',
  ].join('\n'),
};

export const domainContextBlock: GeneratorBlock = (ctx) => {
  if (!ctx.domain_id) return null;

  const guidance = DOMAIN_GUIDANCE[ctx.domain_id];
  if (!guidance) return null;

  const lines: string[] = ['## Domain Context', '', guidance];
  return lines.join('\n');
};
