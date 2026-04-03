import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'fs';
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
  });
}
