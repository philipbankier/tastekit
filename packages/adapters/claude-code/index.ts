/**
 * Claude Code Adapter
 *
 * Exports TasteKit artifacts to Claude Code format:
 * - CLAUDE.md (compositional, from generator blocks)
 * - Hook scripts (session lifecycle)
 * - settings.local.json (hook configuration)
 */

import { TasteKitAdapter, ExportOpts, InstallOpts } from '../adapter-interface.js';
import { readFileSync, writeFileSync, cpSync, existsSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'node:module';
import { resolveArtifactPath, resolveBindingsPath, resolveSkillsPath } from '@tastekit/core/utils';
import { generateClaudeMd, generateHooks, type GeneratorContext } from '@tastekit/core/generators';

const require = createRequire(import.meta.url);

function tryParseYamlOrJson(filePath: string): any {
  const content = readFileSync(filePath, 'utf-8');
  // Try JSON first (faster, no dependency)
  try {
    return JSON.parse(content);
  } catch { /* not JSON */ }
  // Try YAML via dynamic import fallback
  try {
    const YAML = require('yaml');
    return YAML.parse(content);
  } catch { /* skip */ }
  return null;
}

export class ClaudeCodeAdapter implements TasteKitAdapter {
  id = 'claude-code';
  version = '2.0.0';

  async detect(target: string): Promise<boolean> {
    return existsSync(join(target, '.claude', 'config.json'));
  }

  async export(profilePath: string, outDir: string, opts: ExportOpts): Promise<void> {
    // Build generator context from compiled artifacts
    const ctx = this.buildContext(profilePath);

    // 1. Generate CLAUDE.md
    const claudeMd = generateClaudeMd(ctx);
    writeFileSync(join(outDir, 'CLAUDE.md'), claudeMd);

    // 2. Generate hook scripts (context-aware for guardrail enforcement)
    const { scripts, settings } = generateHooks(ctx);
    const hooksDir = join(outDir, '.tastekit', 'hooks');
    mkdirSync(hooksDir, { recursive: true });

    for (const script of scripts) {
      const scriptPath = join(hooksDir, script.filename);
      writeFileSync(scriptPath, script.content);
      if (script.executable) {
        chmodSync(scriptPath, 0o755);
      }
    }

    // 3. Write settings.local.json with hooks + permissions + defaultMode
    const claudeDir = join(outDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, 'settings.local.json'),
      JSON.stringify(settings, null, 2),
    );

    // 4. Copy skills if requested
    if (opts.includeSkills) {
      const skillsDir = resolveSkillsPath(profilePath);
      if (existsSync(skillsDir)) {
        cpSync(skillsDir, join(outDir, 'skills'), { recursive: true });
      }
    }
  }

  async install(outDir: string, target: string, _opts: InstallOpts): Promise<void> {
    cpSync(outDir, target, { recursive: true });
  }

  private buildContext(profilePath: string): GeneratorContext {
    const ctx: GeneratorContext = {
      generator_version: '0.5.0',
    };

    // Constitution
    const constitutionPath = resolveArtifactPath(profilePath, 'constitution');
    if (existsSync(constitutionPath)) {
      ctx.constitution = tryParseYamlOrJson(constitutionPath);
    }

    // Guardrails
    const guardrailsPath = resolveArtifactPath(profilePath, 'guardrails');
    if (existsSync(guardrailsPath)) {
      ctx.guardrails = tryParseYamlOrJson(guardrailsPath);
    }

    // Memory
    const memoryPath = resolveArtifactPath(profilePath, 'memory');
    if (existsSync(memoryPath)) {
      ctx.memory = tryParseYamlOrJson(memoryPath);
    }

    // Skills manifest
    const skillsDir = resolveSkillsPath(profilePath);
    const manifestPath = join(skillsDir, 'manifest.v1.yaml');
    if (existsSync(manifestPath)) {
      ctx.skills = tryParseYamlOrJson(manifestPath);
    }

    // Bindings
    const bindingsPath = resolveBindingsPath(profilePath);
    if (existsSync(bindingsPath)) {
      ctx.bindings = tryParseYamlOrJson(bindingsPath);
    }

    // Domain config (check tastekit.yaml for domain_id)
    const configPath = join(profilePath, 'tastekit.yaml');
    if (existsSync(configPath)) {
      const config = tryParseYamlOrJson(configPath);
      ctx.domain_id = config?.domain_id;
    }

    // Check for playbooks
    const playbooksDir = join(profilePath, 'knowledge', 'playbooks');
    const playbooksV1 = join(profilePath, 'playbooks');
    ctx.has_playbooks = existsSync(playbooksDir) || existsSync(playbooksV1);

    return ctx;
  }
}
