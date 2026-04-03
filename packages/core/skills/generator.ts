import { join } from 'path';
import { writeFileSafe } from '../utils/filesystem.js';
import { stringifyYAML } from '../utils/yaml.js';
import { SkillsManifestV1, SkillMetadata } from '../schemas/skills.js';
import { ConstitutionV1 } from '../schemas/constitution.js';

/**
 * Skills generator
 * 
 * Generates Skills library from constitution and user profile.
 */

export interface SkillGenerationOptions {
  workspacePath: string;
  constitution: ConstitutionV1;
}

export function generateSkills(options: SkillGenerationOptions): SkillsManifestV1 {
  const { workspacePath, constitution } = options;
  const skillsPath = join(workspacePath, 'skills');
  
  // Generate default skills based on constitution
  const skills: SkillMetadata[] = [];
  
  // Example: Content creation skill
  const contentSkill: SkillMetadata = {
    skill_id: 'content_creation',
    name: 'Content Creation',
    description: 'Create written content following user taste and principles',
    tags: ['writing', 'content', 'creative'],
    risk_level: 'low',
    required_tools: [],
    compatible_runtimes: ['claude-code', 'manus', 'openclaw'],
  };
  
  skills.push(contentSkill);
  
  // Generate SKILL.md for content creation
  const contentSkillMd = generateSkillMarkdown(contentSkill, constitution);
  writeFileSafe(
    join(skillsPath, 'content_creation', 'SKILL.md'),
    contentSkillMd
  );
  
  // Generate manifest
  const manifest: SkillsManifestV1 = {
    schema_version: 'skills_manifest.v1',
    skills,
  };
  
  writeFileSafe(
    join(skillsPath, 'manifest.v1.yaml'),
    stringifyYAML(manifest)
  );
  
  return manifest;
}

/**
 * Convert a skill_id to a valid Agent Skills name (kebab-case).
 */
function toAgentSkillsName(skillId: string): string {
  return skillId
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 64);
}

function generateSkillMarkdown(skill: SkillMetadata, constitution: ConstitutionV1): string {
  const name = toAgentSkillsName(skill.skill_id);
  const description = skill.description.slice(0, 1024);
  return `---
name: ${name}
description: ${description}
---

# ${skill.name}

## Purpose

${skill.description}

## When to use

Use this skill when you need to create written content that follows the user's taste profile and principles.

## When not to use

Do not use this skill for:
- Technical documentation (use technical writing skill instead)
- Code generation (use code generation skill instead)
- Data analysis reports (use data analysis skill instead)

## Inputs

- **topic**: The topic or subject to write about
- **format**: Desired format (article, blog post, email, etc.)
- **length**: Target length (short, medium, long)

## Outputs

- Written content following user's tone and principles
- Metadata about the content (word count, reading time, etc.)

## Procedure

### Minimal context (always load)

1. Review user's top principles:
${constitution.principles.slice(0, 3).map(p => `   - ${p.statement}`).join('\n')}

2. Apply tone preferences:
   - Voice: ${constitution.tone.voice_keywords.join(', ')}
   - Avoid: ${constitution.tone.forbidden_phrases.join(', ') || 'none specified'}

### On invoke (load when skill is invoked)

3. Analyze the topic and determine appropriate structure
4. Draft content following principles and tone
5. Review for forbidden phrases and principle violations
6. Refine and polish

### On demand resources (load only if needed)

- **examples.md**: Example content in user's preferred style
- **templates/**: Content templates for different formats

## Quality checks

- [ ] Content follows top 3 principles
- [ ] Tone matches voice keywords
- [ ] No forbidden phrases used
- [ ] Appropriate length for format
- [ ] Clear structure and flow

## Guardrail notes

This skill does not require approval for:
- Draft generation
- Content refinement

This skill requires approval for:
- Publishing content externally
- Sending content via email or messaging

## Progressive disclosure

This skill uses progressive disclosure to minimize context:
- **Minimal context**: Top principles and tone (always loaded)
- **On invoke**: Full procedure and quality checks (loaded when skill runs)
- **On demand**: Examples and templates (loaded only if explicitly needed)
`;
}
