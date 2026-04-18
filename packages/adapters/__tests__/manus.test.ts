import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ManusAdapter } from '../manus/index.js';
import {
  cleanupFixture,
  createTempDir,
  fixturePath,
  listRelativeFiles,
  validateMarkdown,
} from './helpers.js';

describe('ManusAdapter (fixture workspace)', () => {
  it('copies the skills directory, generates README.md, and exports non-empty content', async () => {
    const profilePath = fixturePath('testing', 'e2e', 'v2', 'workspace', '.tastekit');
    const outDir = createTempDir('tastekit-manus-export');

    try {
      const adapter = new ManusAdapter();
      await adapter.export(profilePath, outDir, {
        includeSkills: true,
        includePlaybooks: true,
      });

      expect(existsSync(join(outDir, 'skills', 'manifest.v1.yaml'))).toBe(true);
      expect(existsSync(join(outDir, 'README.md'))).toBe(true);

      const generatedSkills = listRelativeFiles(join(outDir, 'skills'));
      const fixtureSkills = listRelativeFiles(
        fixturePath('testing', 'e2e', 'v2', 'workspace', 'exports', 'manus', 'skills'),
      );
      expect(generatedSkills).toEqual(fixtureSkills);

      const readme = readFileSync(join(outDir, 'README.md'), 'utf-8');
      validateMarkdown(readme);
      expect(readme).toContain('TasteKit Skills for Manus');
      expect(readme).toContain('## Usage');
      expect(readme.trim().length).toBeGreaterThan(50);

      const exportedFiles = listRelativeFiles(outDir);
      expect(exportedFiles.length).toBeGreaterThanOrEqual(4);
    } finally {
      cleanupFixture(outDir);
    }
  });
});
