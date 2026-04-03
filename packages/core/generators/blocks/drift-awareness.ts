/**
 * Drift Awareness Block — Self-monitoring instructions.
 */
import type { GeneratorBlock } from '../types.js';

export const driftAwarenessBlock: GeneratorBlock = (ctx) => {
  const driftVerb = ctx.vocabulary?.drift_verb ?? 'Drift';
  const lines: string[] = [
    `## ${driftVerb} Awareness`,
    '',
    'Monitor your own behavior against the principles above. When you notice:',
    '',
    '- **Repeated user corrections** → log as observation (category: friction)',
    '- **Contradictions between principles and actions** → log as tension',
    '- **Unexpected outcomes** → log as observation (category: surprise)',
    '- **Process bottlenecks** → log as observation (category: process)',
    '',
    'Review triggers: 10+ observations or 5+ unresolved tensions → suggest a drift review.',
  ];

  // Evidence policy from constitution
  if (ctx.constitution?.evidence_policy) {
    const ep = ctx.constitution.evidence_policy;
    if (ep.require_citations_for.length > 0) {
      lines.push('');
      lines.push(`**Citation required for:** ${ep.require_citations_for.join(', ')}`);
    }
    if (ep.uncertainty_language_rules.length > 0) {
      lines.push(`**Uncertainty language:** ${ep.uncertainty_language_rules.join('. ')}`);
    }
  }

  return lines.join('\n');
};
