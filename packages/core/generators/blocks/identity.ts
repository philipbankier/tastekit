/**
 * Identity Block — Principles, tone, tradeoffs.
 */
import type { GeneratorBlock } from '../types.js';

export const identityBlock: GeneratorBlock = (ctx) => {
  if (!ctx.constitution) return null;

  const heading = ctx.vocabulary?.principles_heading ?? 'Identity & Principles';
  const c = ctx.constitution;
  const lines: string[] = [`## ${heading}`, ''];

  // Top principles (up to 5)
  const top = c.principles.slice(0, 5);
  for (const p of top) {
    lines.push(`${p.priority}. **[${p.id}]** ${p.statement}`);
    if (p.rationale) {
      lines.push(`   _${p.rationale}_`);
    }
  }
  if (c.principles.length > 5) {
    lines.push(`\n_…and ${c.principles.length - 5} more principles (see full constitution)._`);
  }

  // Tone
  lines.push('');
  lines.push(`**Voice:** ${c.tone.voice_keywords.join(', ')}`);
  if (c.tone.forbidden_phrases.length > 0) {
    lines.push(`**Never say:** ${c.tone.forbidden_phrases.map(p => `"${p}"`).join(', ')}`);
  }
  if (c.tone.formatting_rules.length > 0) {
    lines.push(`**Formatting:** ${c.tone.formatting_rules.join('. ')}`);
  }

  // Tradeoffs
  lines.push('');
  const t = c.tradeoffs;
  const accLabel = t.accuracy_vs_speed >= 0.6 ? 'Accuracy over speed' : t.accuracy_vs_speed <= 0.4 ? 'Speed over accuracy' : 'Balanced accuracy/speed';
  const costLabel = t.cost_sensitivity >= 0.6 ? 'High cost sensitivity' : t.cost_sensitivity <= 0.3 ? 'Low cost sensitivity' : 'Moderate cost sensitivity';
  const autoLabel = t.autonomy_level >= 0.7 ? 'Mostly autonomous' : t.autonomy_level <= 0.3 ? 'Always ask first' : 'Moderate autonomy';
  lines.push(`**Tradeoffs:** ${accLabel} (${t.accuracy_vs_speed}). ${costLabel} (${t.cost_sensitivity}). ${autoLabel} (${t.autonomy_level}).`);

  return lines.join('\n');
};
