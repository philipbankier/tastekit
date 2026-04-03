/**
 * Manus Adapter
 * 
 * Exports TasteKit artifacts to Manus Skills format.
 */

import { TasteKitAdapter, ExportOpts, InstallOpts } from '../adapter-interface.js';
import { readFileSync, writeFileSync, cpSync, existsSync } from 'fs';
import { join } from 'path';
import { resolveArtifactPath, resolveSkillsPath } from '@tastekit/core/utils';

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
