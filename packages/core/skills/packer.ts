import { join, basename } from 'path';
import { existsSync, cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';

/**
 * Skills packer
 *
 * Exports skills as portable packs with runtime-specific directory layouts.
 *
 * Runtime layouts:
 * - claude-code: .claude/skills/{name}/SKILL.md (Claude Code project skills)
 * - openclaw: skills/{name}/SKILL.md (OpenClaw workspace skills)
 * - portable (default): {name}/SKILL.md (flat, universal AgentSkills format)
 */

export interface PackOptions {
  skillsPath: string;
  outputPath: string;
  format: 'dir';
  runtime?: 'claude-code' | 'openclaw' | 'portable';
}

export interface PackResult {
  outputPath: string;
  skillCount: number;
  totalFiles: number;
  runtime: string;
}

/**
 * Pack skills into a runtime-specific directory layout.
 */
export async function packSkills(options: PackOptions): Promise<PackResult> {
  const { skillsPath, outputPath, runtime = 'portable' } = options;

  if (!existsSync(skillsPath)) {
    throw new Error('Skills directory does not exist');
  }

  mkdirSync(outputPath, { recursive: true });

  // Determine output prefix based on runtime
  const prefix = getPrefix(runtime);
  const targetBase = prefix ? join(outputPath, prefix) : outputPath;
  mkdirSync(targetBase, { recursive: true });

  // Get skill directories (skip manifest file)
  const entries = readdirSync(skillsPath, { withFileTypes: true });
  const skillDirs = entries.filter(e => e.isDirectory());
  let totalFiles = 0;

  for (const dir of skillDirs) {
    const srcDir = join(skillsPath, dir.name);
    const destDir = join(targetBase, dir.name);
    mkdirSync(destDir, { recursive: true });
    totalFiles += copyDir(srcDir, destDir);
  }

  // Copy manifest to the target root
  const manifestSrc = join(skillsPath, 'manifest.v1.yaml');
  if (existsSync(manifestSrc)) {
    writeFileSync(
      join(targetBase, 'manifest.v1.yaml'),
      readFileSync(manifestSrc, 'utf-8'),
    );
    totalFiles++;
  }

  // Write a pack metadata file
  const packMeta = {
    packed_at: new Date().toISOString(),
    runtime,
    skill_count: skillDirs.length,
    source: 'tastekit',
  };
  writeFileSync(
    join(outputPath, '.pack.json'),
    JSON.stringify(packMeta, null, 2),
  );

  return {
    outputPath,
    skillCount: skillDirs.length,
    totalFiles,
    runtime,
  };
}

function getPrefix(runtime: string): string {
  switch (runtime) {
    case 'claude-code': return join('.claude', 'skills');
    case 'openclaw': return 'skills';
    case 'portable':
    default: return '';
  }
}

function copyDir(src: string, dest: string): number {
  let count = 0;
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      count += copyDir(srcPath, destPath);
    } else {
      writeFileSync(destPath, readFileSync(srcPath));
      count++;
    }
  }
  return count;
}
