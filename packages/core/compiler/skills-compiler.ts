import { join } from 'path';
import { writeFileSafe, resolveSkillsPath } from '../utils/filesystem.js';
import { stringifyYAML } from '../utils/yaml.js';
import { SkillsManifestV1, SkillMetadata } from '../schemas/skills.js';
import { ConstitutionV1 } from '../schemas/constitution.js';
import { SessionState } from '../schemas/workspace.js';

/**
 * A bundled file that ships alongside SKILL.md for progressive disclosure.
 * Claude loads these on-demand when referenced from SKILL.md.
 */
interface BundledFile {
  /** Relative path within the skill directory (e.g., "reference.md", "scripts/validate.sh") */
  path: string;
  /** File content */
  content: string;
  /** Human-readable description for the file map table */
  description: string;
  /** When Claude should load this file */
  load_when: string;
}

/**
 * Domain skill definition — what domain skill files export.
 */
interface DomainSkill {
  skill_id: string;
  name: string;
  description: string;
  tags?: string[];
  risk_level: 'low' | 'med' | 'high';
  required_tools: string[];
  compatible_runtimes?: string[];
  playbook_ref?: string;
  prerequisites?: string[];
  feeds_into?: string[];
  alternatives?: string[];
  pipeline_phase?: string;
  context_model?: 'inherit' | 'fork';
  model_hint?: string;
  skill_md_content: string;
  /** Optional bundled files for progressive disclosure (Level 3+) */
  bundled_files?: BundledFile[];
}

/**
 * Convert a skill_id to a valid Agent Skills name.
 * Anthropic spec: lowercase letters, numbers, hyphens only. Max 64 chars.
 */
function toAgentSkillsName(skillId: string): string {
  return skillId
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 64);
}

/**
 * Generate YAML frontmatter for a SKILL.md file.
 *
 * Follows the Agent Skills spec (agentskills.io):
 * Required: name (kebab-case, max 64), description (max 1024)
 * Optional: license, compatibility, metadata, allowed-tools
 */
function generateFrontmatter(skill: {
  skill_id: string;
  name: string;
  description: string;
  compatible_runtimes?: string[];
  required_tools?: string[];
}): string {
  const name = toAgentSkillsName(skill.skill_id);
  const description = skill.description.slice(0, 1024);
  let fm = `---\nname: ${name}\ndescription: ${description}\n`;

  // Add compatibility hint if specific runtimes are targeted
  if (skill.compatible_runtimes && skill.compatible_runtimes.length > 0) {
    fm += `compatibility: Compatible with ${skill.compatible_runtimes.join(', ')}\n`;
  }

  fm += `---\n\n`;
  return fm;
}

/**
 * Prepend YAML frontmatter to SKILL.md content if not already present.
 */
function ensureFrontmatter(
  content: string,
  skill: { skill_id: string; name: string; description: string },
): string {
  if (content.trimStart().startsWith('---')) {
    return content;
  }
  return generateFrontmatter(skill) + content;
}

/**
 * Generate a file map table for progressive disclosure.
 * Appended to SKILL.md when bundled files exist.
 *
 * Anthropic best practice: include a table so Claude knows what each
 * file contains and when to load it, without reading them all upfront.
 */
function generateFileMap(files: BundledFile[]): string {
  if (files.length === 0) return '';

  const rows = files.map(f =>
    `| [${f.path}](${f.path}) | ${f.description} | ${f.load_when} |`
  ).join('\n');

  return `\n## Additional resources\n\n| File | Description | Load when |\n|------|-------------|----------|\n${rows}\n`;
}

export interface SkillsCompilationOptions {
  workspacePath: string;
  session: SessionState;
  constitution: ConstitutionV1;
}

/**
 * Compile skills library from domain skills + constitution.
 *
 * Resolves domain-specific pre-built skills, writes SKILL.md files,
 * and generates the skills manifest.
 */
export async function compileSkills(options: SkillsCompilationOptions): Promise<string[]> {
  const { workspacePath, session, constitution } = options;
  const skillsPath = resolveSkillsPath(workspacePath);
  const artifacts: string[] = [];

  // Resolve domain skills
  const domainSkills = await resolveDomainSkills(session.domain_id);
  const allSkills: SkillMetadata[] = [];

  // Write each domain skill's SKILL.md
  for (const skill of domainSkills) {
    const metadata: SkillMetadata = {
      skill_id: skill.skill_id,
      name: skill.name,
      description: skill.description,
      tags: skill.tags ?? [skill.skill_id],
      risk_level: skill.risk_level,
      required_tools: skill.required_tools,
      compatible_runtimes: skill.compatible_runtimes ?? ['claude-code', 'openclaw'],
      playbook_ref: skill.playbook_ref,
      prerequisites: skill.prerequisites,
      feeds_into: skill.feeds_into,
      alternatives: skill.alternatives,
      pipeline_phase: skill.pipeline_phase,
      context_model: skill.context_model,
      model_hint: skill.model_hint,
    };

    allSkills.push(metadata);

    // Build SKILL.md content with frontmatter + optional file map
    let skillContent = ensureFrontmatter(skill.skill_md_content, skill);
    if (skill.bundled_files && skill.bundled_files.length > 0) {
      skillContent += generateFileMap(skill.bundled_files);
    }

    // Write the SKILL.md
    writeFileSafe(
      join(skillsPath, skill.skill_id, 'SKILL.md'),
      skillContent,
    );

    // Write bundled files for progressive disclosure (Level 3+)
    if (skill.bundled_files) {
      for (const file of skill.bundled_files) {
        writeFileSafe(
          join(skillsPath, skill.skill_id, file.path),
          file.content,
        );
      }
    }
  }

  // If no domain skills were found, generate a generic skill from constitution
  if (allSkills.length === 0) {
    const genericSkill = generateGenericSkill(constitution);
    allSkills.push(genericSkill.metadata);
    writeFileSafe(
      join(skillsPath, genericSkill.metadata.skill_id, 'SKILL.md'),
      ensureFrontmatter(genericSkill.markdown, genericSkill.metadata),
    );
  }

  // Write manifest
  const manifest: SkillsManifestV1 = {
    schema_version: 'skills_manifest.v1',
    skills: allSkills,
  };

  writeFileSafe(
    join(skillsPath, 'manifest.v1.yaml'),
    stringifyYAML(manifest),
  );
  artifacts.push('skills/manifest.v1.yaml');

  return artifacts;
}

/**
 * Dynamically resolve domain skills by domain_id.
 */
async function resolveDomainSkills(domainId?: string): Promise<DomainSkill[]> {
  if (!domainId) return [];

  switch (domainId) {
    case 'development-agent': {
      const { DevelopmentAgentSkills } = await import('../domains/development-agent/skills/index.js');
      return DevelopmentAgentSkills as DomainSkill[];
    }
    case 'general-agent': {
      const { GeneralAgentSkills } = await import('../domains/general-agent/skills/index.js');
      return GeneralAgentSkills as DomainSkill[];
    }
    default:
      return [];
  }
}

/**
 * Generate a generic skill when no domain skills are available.
 * Uses constitution data to personalize the skill.
 */
function generateGenericSkill(constitution: ConstitutionV1): {
  metadata: SkillMetadata;
  markdown: string;
} {
  const metadata: SkillMetadata = {
    skill_id: 'general-task',
    name: 'General Task Execution',
    description: 'Executes general tasks following user principles and tone preferences. Use when no domain-specific skill exists for the task, or when performing ad-hoc work that should still respect the user\'s established conventions.',
    tags: ['general', 'task-execution'],
    risk_level: 'low',
    required_tools: [],
    compatible_runtimes: ['claude-code', 'openclaw', 'manus'],
  };

  const principlesList = constitution.principles
    .slice(0, 5)
    .map(p => `- ${p.statement}`)
    .join('\n');

  const voiceKeywords = constitution.tone.voice_keywords.join(', ') || 'not specified';
  const forbiddenPhrases = constitution.tone.forbidden_phrases.join(', ') || 'none';

  const markdown = `# General Task Execution

## Purpose

Executes general tasks following user principles and tone preferences.

## When to use

- Performing tasks that don't match a specialized skill
- Ad-hoc work that should respect user conventions
- Any task where user principles and tone should guide output

## When not to use

- When a domain-specific skill exists for the task type
- For tasks that need specialized tooling or workflows

## Inputs

- **task**: Description of the task to perform
- **context**: Any relevant context or constraints

## Outputs

- Task result following user's principles and tone

## Procedure

1. Understand the task requirements
2. Review applicable principles:
${principlesList}
3. Apply tone preferences — voice: ${voiceKeywords}; avoid: ${forbiddenPhrases}
4. Execute while respecting tone preferences
5. Check output against quality criteria

## Quality checks

- [ ] Output follows user principles
- [ ] Tone matches voice keywords
- [ ] No forbidden phrases used
- [ ] Task requirements fully addressed

## Guardrail notes

Check autonomy level before taking irreversible actions.
`;

  return { metadata, markdown };
}
