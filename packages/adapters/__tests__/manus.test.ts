import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ManusAdapter } from '../manus/index.js';
import { cleanupFixture, createProfileFixture, type Layout } from './helpers.js';

for (const layout of ['v1', 'v2'] as Layout[]) {
  describe(`ManusAdapter (${layout})`, () => {
    it('exports skills and README', async () => {
      const { rootDir, profilePath } = createProfileFixture(layout);
      const outDir = join(rootDir, 'export-manus');

      try {
        mkdirSync(outDir, { recursive: true });
        const adapter = new ManusAdapter();
        await adapter.export(profilePath, outDir, {
          includeSkills: true,
          includePlaybooks: true,
        });

        expect(existsSync(join(outDir, 'skills', 'manifest.v1.yaml'))).toBe(true);
        expect(existsSync(join(outDir, 'README.md'))).toBe(true);

        const readme = readFileSync(join(outDir, 'README.md'), 'utf-8');
        expect(readme).toContain('TasteKit Skills for Manus');
        expect(readme).toContain('Be precise and practical');
      } finally {
        cleanupFixture(rootDir);
      }
    });
  });
}
