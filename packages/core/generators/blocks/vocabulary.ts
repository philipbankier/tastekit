/**
 * Vocabulary Block — Domain vocabulary guide.
 * Included only when vocabulary transformation is active.
 */
import type { GeneratorBlock } from '../types.js';

export const vocabularyBlock: GeneratorBlock = (ctx) => {
  if (!ctx.vocabulary) return null;

  // Only include if there are custom terms beyond the standard headings
  const v = ctx.vocabulary;
  const hasCustom = v.custom && Object.keys(v.custom).length > 0;
  const hasLabels = v.constitution_label || v.skill_label || v.playbook_label || v.compile_verb || v.drift_verb;

  if (!hasCustom && !hasLabels) return null;

  const lines: string[] = ['## Vocabulary', '', 'Domain-specific terminology used in this workspace:', ''];

  if (v.constitution_label) lines.push(`- **Constitution** is called "${v.constitution_label}" in this domain`);
  if (v.skill_label) lines.push(`- **Skill** is called "${v.skill_label}" in this domain`);
  if (v.playbook_label) lines.push(`- **Playbook** is called "${v.playbook_label}" in this domain`);
  if (v.drift_verb) lines.push(`- **Drift** is referred to as "${v.drift_verb}"`);

  if (hasCustom) {
    lines.push('');
    for (const [term, meaning] of Object.entries(v.custom!)) {
      lines.push(`- **${term}**: ${meaning}`);
    }
  }

  return lines.join('\n');
};
