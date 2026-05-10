import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { OpenClawAdapter } from '../openclaw/index.js';
import { cleanupFixture, createProfileFixture, type Layout } from './helpers.js';

for (const layout of ['v1', 'v2'] as Layout[]) {
  describe(`OpenClawAdapter (${layout})`, () => {
    it('exports a complete OpenClaw workspace', async () => {
      const { rootDir, profilePath } = createProfileFixture(layout);
      const outDir = join(rootDir, 'export-openclaw');

      try {
        mkdirSync(outDir, { recursive: true });
        const adapter = new OpenClawAdapter();
        await adapter.export(profilePath, outDir, {
          includeSkills: true,
          includePlaybooks: true,
        });

        // Verify all workspace files exist
        expect(existsSync(join(outDir, 'SOUL.md'))).toBe(true);
        expect(existsSync(join(outDir, 'IDENTITY.md'))).toBe(true);
        expect(existsSync(join(outDir, 'AGENTS.md'))).toBe(true);
        expect(existsSync(join(outDir, 'openclaw.config.json'))).toBe(true);
        expect(existsSync(join(outDir, 'skills', 'manifest.v1.yaml'))).toBe(true);

        // Verify SOUL.md content
        const soul = readFileSync(join(outDir, 'SOUL.md'), 'utf-8');
        expect(soul).toContain('# SOUL.md');
        expect(soul).toContain('Be precise and practical');
        expect(soul).toContain('clear, direct');

        // Verify IDENTITY.md content
        const identity = readFileSync(join(outDir, 'IDENTITY.md'), 'utf-8');
        expect(identity).toContain('# IDENTITY.md');
        expect(identity).toContain('Development Agent');

        // Verify AGENTS.md content
        const agents = readFileSync(join(outDir, 'AGENTS.md'), 'utf-8');
        expect(agents).toContain('# AGENTS.md');
        expect(agents).toContain('Be precise and practical');

        // Verify backward-compatible config
        const config = JSON.parse(readFileSync(join(outDir, 'openclaw.config.json'), 'utf-8'));
        expect(config.profile.principles).toHaveLength(1);
        expect(config.safety.taboos.never_do).toContain('Never fabricate citations');
      } finally {
        cleanupFixture(rootDir);
      }
    });

    it('preserves manual SOUL.md and AGENTS.md content outside TasteKit managed regions', async () => {
      const { rootDir, profilePath } = createProfileFixture(layout);
      const outDir = join(rootDir, 'export-openclaw');

      try {
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, 'SOUL.md'), '# Manual Soul\n\nKeep soul notes.\n', 'utf-8');
        writeFileSync(join(outDir, 'AGENTS.md'), '# Manual Agents\n\nKeep agent notes.\n', 'utf-8');

        const adapter = new OpenClawAdapter();
        await adapter.export(profilePath, outDir, {
          includeSkills: true,
          includePlaybooks: true,
        });

        const soul = readFileSync(join(outDir, 'SOUL.md'), 'utf-8');
        expect(soul).toContain('# Manual Soul');
        expect(soul).toContain('Keep soul notes.');
        expect(soul.match(/BEGIN TASTEKIT MANAGED REGION/g)).toHaveLength(1);

        const agents = readFileSync(join(outDir, 'AGENTS.md'), 'utf-8');
        expect(agents).toContain('# Manual Agents');
        expect(agents).toContain('Keep agent notes.');
        expect(agents.match(/BEGIN TASTEKIT MANAGED REGION/g)).toHaveLength(1);
      } finally {
        cleanupFixture(rootDir);
      }
    });
  });
}
