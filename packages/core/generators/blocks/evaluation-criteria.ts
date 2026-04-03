/**
 * Evaluation Criteria Block — Self-evaluation instructions.
 * Included only when an evalpack exists.
 */
import type { GeneratorBlock } from '../types.js';

export const evaluationCriteriaBlock: GeneratorBlock = (ctx) => {
  if (!ctx.has_evalpack) return null;

  const lines: string[] = [
    '## Evaluation Criteria',
    '',
    'An evaluation pack is configured for this workspace. After completing tasks, self-evaluate:',
    '',
    '1. **Principle alignment** — Does the output follow the principles above?',
    '2. **Quality gates** — Does the output pass the skill-specific quality checks?',
    '3. **Tone consistency** — Does the output match the voice and formatting rules?',
    '4. **Guardrail compliance** — Were all approval rules and rate limits respected?',
    '',
    'Run `tastekit eval` to execute the full evaluation suite against recent traces.',
  ];

  return lines.join('\n');
};
