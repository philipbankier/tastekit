/**
 * Manus Adapter
 * 
 * Exports TasteKit artifacts to Manus Skills format.
 */

import { TasteKitAdapter, ExportOpts, InstallOpts, MappedMemoryPolicy, SimOpts, SimulationSummary } from '../adapter-interface.js';
import { readFileSync, writeFileSync, cpSync, existsSync } from 'fs';
import { join } from 'path';
import type { MemoryV1, TraceEvent } from '@actrun_ai/tastekit-core';
import { resolveArtifactPath, resolveSkillsPath } from '@actrun_ai/tastekit-core/utils';
import type { GeneratorContext } from '@actrun_ai/tastekit-core/generators';
import { buildSimulationSummary, formatMemoryBullets, writeTraceJsonl } from '../runtime-support.js';

export class ManusAdapter implements TasteKitAdapter {
  id = 'manus';
  version = '1.0.0';
  
  async detect(target: string): Promise<boolean> {
    // Check if target has Manus skills directory
    return existsSync(join(target, 'skills'));
  }
  
  async export(profilePath: string, outDir: string, opts: ExportOpts): Promise<void> {
    // Manus primarily uses Skills format, which TasteKit already generates
    const skillsPath = resolveSkillsPath(profilePath);
    
    if (!existsSync(skillsPath)) {
      throw new Error('Skills not found. Run tastekit compile first.');
    }
    
    // Copy skills directory
    const outSkillsPath = join(outDir, 'skills');
    cpSync(skillsPath, outSkillsPath, { recursive: true });
    
    // Read constitution for context
    const constitutionPath = resolveArtifactPath(profilePath, 'constitution');
    if (existsSync(constitutionPath)) {
      const constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
      
      // Generate a README for Manus
      const readme = this.generateManusReadme(constitution);
      writeFileSync(join(outDir, 'README.md'), readme);
    }
  }
  
  async install(outDir: string, target: string, opts: InstallOpts): Promise<void> {
    // Copy skills to target
    const skillsDir = join(outDir, 'skills');
    const targetSkillsDir = join(target, 'skills');
    
    if (existsSync(skillsDir)) {
      cpSync(skillsDir, targetSkillsDir, { recursive: true });
    }
  }

  async runSimulation(workspace: GeneratorContext, _opts?: SimOpts): Promise<SimulationSummary> {
    return buildSimulationSummary(workspace);
  }

  async mapMemoryPolicy(policy: MemoryV1): Promise<MappedMemoryPolicy> {
    const lines = ['memory:', ...formatMemoryBullets(policy).map(line => `  - "${line.replace(/"/g, '\\"')}"`)];
    return {
      runtimeSpecific: lines.join('\n'),
      notes: 'Use this YAML block in Manus metadata or README context.',
    };
  }

  async emitTrace(events: TraceEvent[], outDir: string): Promise<void> {
    await writeTraceJsonl(this.id, events, outDir);
  }
  
  private generateManusReadme(constitution: any): string {
    return `# TasteKit Skills for Manus

This directory contains skills exported from TasteKit.

## Principles

${constitution.principles.map((p: any, i: number) => `${i + 1}. ${p.statement}`).join('\n')}

## Tone

Voice: ${constitution.tone.voice_keywords.join(', ')}

## Usage

These skills follow the Manus Skills format with progressive disclosure:
- **Minimal context**: Always loaded (top principles and tone)
- **On invoke**: Loaded when skill is invoked
- **On demand**: Loaded only when explicitly needed

Refer to individual SKILL.md files for detailed instructions.
`;
  }
}
