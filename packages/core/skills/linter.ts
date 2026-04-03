import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Skills linter
 * 
 * Validates Skills structure and progressive disclosure constraints.
 */

export interface LintResult {
  valid: boolean;
  errors: LintError[];
  warnings: LintWarning[];
}

export interface LintError {
  skill_id: string;
  message: string;
  severity: 'error';
}

export interface LintWarning {
  skill_id: string;
  message: string;
  severity: 'warning';
}

const REQUIRED_SECTIONS = [
  'Purpose',
  'When to use',
  'Procedure',
  'Quality checks',
];

const RECOMMENDED_SECTIONS = [
  'When not to use',
  'Inputs',
  'Outputs',
  'Guardrail notes',
];

const MAX_SKILL_SIZE = 50 * 1024; // 50 KB
const MAX_SKILL_LINES = 500; // Anthropic Agent Skills spec recommendation
const MAX_FRONTMATTER_NAME_LENGTH = 64;
const MAX_FRONTMATTER_DESCRIPTION_LENGTH = 1024;
const FRONTMATTER_NAME_PATTERN = /^[a-z0-9-]+$/;
const RESERVED_WORDS = ['anthropic', 'claude'];

/**
 * Parse YAML frontmatter from SKILL.md content.
 * Returns null if no frontmatter found.
 */
function parseFrontmatter(content: string): { name?: string; description?: string } | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) return null;

  const frontmatterBlock = trimmed.slice(3, endIndex).trim();
  const result: Record<string, string> = {};
  for (const line of frontmatterBlock.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

export function lintSkills(skillsPath: string): LintResult {
  const errors: LintError[] = [];
  const warnings: LintWarning[] = [];
  
  // Check if skills directory exists
  if (!existsSync(skillsPath)) {
    errors.push({
      skill_id: '_global',
      message: 'Skills directory does not exist',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }
  
  // Get all skill directories
  const entries = readdirSync(skillsPath, { withFileTypes: true });
  const skillDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  
  // Lint each skill
  for (const skillId of skillDirs) {
    const skillPath = join(skillsPath, skillId);
    const skillMdPath = join(skillPath, 'SKILL.md');
    
    // Check SKILL.md exists
    if (!existsSync(skillMdPath)) {
      errors.push({
        skill_id: skillId,
        message: 'SKILL.md not found',
        severity: 'error',
      });
      continue;
    }
    
    // Read SKILL.md
    const content = readFileSync(skillMdPath, 'utf-8');
    
    // Check size
    if (content.length > MAX_SKILL_SIZE) {
      warnings.push({
        skill_id: skillId,
        message: `SKILL.md exceeds recommended size (${content.length} > ${MAX_SKILL_SIZE} bytes)`,
        severity: 'warning',
      });
    }

    // Check line count (Anthropic spec: under 500 lines)
    const lineCount = content.split('\n').length;
    if (lineCount > MAX_SKILL_LINES) {
      warnings.push({
        skill_id: skillId,
        message: `SKILL.md exceeds ${MAX_SKILL_LINES} lines (${lineCount}). Consider splitting into separate files with progressive disclosure.`,
        severity: 'warning',
      });
    }

    // Validate YAML frontmatter (Agent Skills spec)
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) {
      errors.push({
        skill_id: skillId,
        message: 'Missing YAML frontmatter (---). Required by Agent Skills spec with name and description fields.',
        severity: 'error',
      });
    } else {
      // Validate name field
      if (!frontmatter.name) {
        errors.push({
          skill_id: skillId,
          message: 'Frontmatter missing required field: name',
          severity: 'error',
        });
      } else {
        if (!FRONTMATTER_NAME_PATTERN.test(frontmatter.name)) {
          errors.push({
            skill_id: skillId,
            message: `Frontmatter name must be lowercase letters, numbers, and hyphens only. Got: "${frontmatter.name}"`,
            severity: 'error',
          });
        }
        if (frontmatter.name.startsWith('-') || frontmatter.name.endsWith('-')) {
          errors.push({
            skill_id: skillId,
            message: `Frontmatter name must not start or end with a hyphen. Got: "${frontmatter.name}"`,
            severity: 'error',
          });
        }
        if (/--/.test(frontmatter.name)) {
          errors.push({
            skill_id: skillId,
            message: `Frontmatter name must not contain consecutive hyphens. Got: "${frontmatter.name}"`,
            severity: 'error',
          });
        }
        if (frontmatter.name !== skillId) {
          errors.push({
            skill_id: skillId,
            message: `Frontmatter name "${frontmatter.name}" must match directory name "${skillId}"`,
            severity: 'error',
          });
        }
        if (frontmatter.name.length > MAX_FRONTMATTER_NAME_LENGTH) {
          errors.push({
            skill_id: skillId,
            message: `Frontmatter name exceeds ${MAX_FRONTMATTER_NAME_LENGTH} characters (${frontmatter.name.length})`,
            severity: 'error',
          });
        }
        if (RESERVED_WORDS.some(w => frontmatter.name!.includes(w))) {
          errors.push({
            skill_id: skillId,
            message: `Frontmatter name contains reserved word (${RESERVED_WORDS.join(', ')})`,
            severity: 'error',
          });
        }
      }

      // Validate description field
      if (!frontmatter.description) {
        errors.push({
          skill_id: skillId,
          message: 'Frontmatter missing required field: description',
          severity: 'error',
        });
      } else {
        if (frontmatter.description.length > MAX_FRONTMATTER_DESCRIPTION_LENGTH) {
          errors.push({
            skill_id: skillId,
            message: `Frontmatter description exceeds ${MAX_FRONTMATTER_DESCRIPTION_LENGTH} characters (${frontmatter.description.length})`,
            severity: 'error',
          });
        }
      }
    }

    // Check required sections
    for (const section of REQUIRED_SECTIONS) {
      // Case-insensitive match
      const pattern = new RegExp(`## ${section}`, 'i');
      if (!pattern.test(content)) {
        errors.push({
          skill_id: skillId,
          message: `Missing required section: ${section}`,
          severity: 'error',
        });
      }
    }

    // Check recommended sections
    for (const section of RECOMMENDED_SECTIONS) {
      const pattern = new RegExp(`## ${section}`, 'i');
      if (!pattern.test(content)) {
        warnings.push({
          skill_id: skillId,
          message: `Missing recommended section: ${section}`,
          severity: 'warning',
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
