/**
 * Skills Index Block — Summary table with pipeline relationships.
 */
import type { GeneratorBlock } from '../types.js';

export const skillsIndexBlock: GeneratorBlock = (ctx) => {
  if (!ctx.skills?.skills?.length) return null;

  const heading = ctx.vocabulary?.skills_heading ?? 'Available Skills';
  const skillLabel = ctx.vocabulary?.skill_label ?? 'Skill';
  const lines: string[] = [`## ${heading}`, ''];

  lines.push(`| ${skillLabel} | Risk | When to use |`);
  lines.push('|-------|------|-------------|');

  for (const skill of ctx.skills.skills) {
    const desc = skill.description.length > 60
      ? skill.description.slice(0, 57) + '...'
      : skill.description;
    lines.push(`| ${skill.name} | ${skill.risk_level} | ${desc} |`);
  }

  // Show pipeline relationships
  const pipelines: string[] = [];
  for (const skill of ctx.skills.skills) {
    if (skill.feeds_into?.length) {
      for (const target of skill.feeds_into) {
        const targetSkill = ctx.skills.skills.find(s => s.skill_id === target);
        if (targetSkill) {
          pipelines.push(`${skill.name} → ${targetSkill.name}`);
        }
      }
    }
  }

  if (pipelines.length > 0) {
    lines.push('');
    lines.push('**Pipelines:**');
    for (const p of pipelines) {
      lines.push(`- ${p}`);
    }
  }

  return lines.join('\n');
};
