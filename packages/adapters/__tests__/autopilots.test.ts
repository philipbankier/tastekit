import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { AutopilotsAdapter } from '../autopilots/index.js';
import { cleanupFixture, createProfileFixture, type Layout } from './helpers.js';

for (const layout of ['v1', 'v2'] as Layout[]) {
  describe(`AutopilotsAdapter (${layout})`, () => {
    it('exports autopilots.yaml with constitution content', async () => {
      const { rootDir, profilePath } = createProfileFixture(layout);
      const outDir = join(rootDir, 'export-autopilots');

      try {
        mkdirSync(outDir, { recursive: true });
        const adapter = new AutopilotsAdapter();
        await adapter.export(profilePath, outDir, {
          includeSkills: true,
          includePlaybooks: true,
        });

        expect(existsSync(join(outDir, 'autopilots.yaml'))).toBe(true);

        const yaml = readFileSync(join(outDir, 'autopilots.yaml'), 'utf-8');
        expect(yaml).toContain('Autopilots Configuration');
        expect(yaml).toContain('Be precise and practical');
        expect(yaml).toContain('autonomy_level: medium');
      } finally {
        cleanupFixture(rootDir);
      }
    });
  });
}
