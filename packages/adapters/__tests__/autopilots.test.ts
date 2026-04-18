import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AutopilotsAdapter } from '../autopilots/index.js';
import {
  cleanupFixture,
  createTempDir,
  fixturePath,
  parseYaml,
} from './helpers.js';

describe('AutopilotsAdapter (fixture workspace)', () => {
  it('exports valid autopilots.yaml with the expected top-level keys', async () => {
    const profilePath = fixturePath('testing', 'e2e', 'v2', 'workspace', '.tastekit');
    const outDir = createTempDir('tastekit-autopilots-export');

    try {
      const adapter = new AutopilotsAdapter();
      await adapter.export(profilePath, outDir, {
        includeSkills: true,
        includePlaybooks: true,
      });

      expect(existsSync(join(outDir, 'autopilots.yaml'))).toBe(true);

      const yaml = readFileSync(join(outDir, 'autopilots.yaml'), 'utf-8');
      expect(yaml).toContain('ActRun Autopilots Configuration');
      const parsed = parseYaml<{
        principles: Array<{ id: string; statement: string }>;
        tone: { voice_keywords: string[] };
        tradeoffs: { autonomy_level: number | string };
        taboos: { never_do: string[]; must_escalate: string[] };
      }>(yaml);

      expect(Object.keys(parsed)).toEqual(['principles', 'tone', 'tradeoffs', 'taboos']);
      expect(parsed.principles.length).toBeGreaterThan(0);
      expect(parsed.tone.voice_keywords.length).toBeGreaterThan(0);
      expect(parsed.tradeoffs.autonomy_level).toBeDefined();
      expect(Array.isArray(parsed.taboos.never_do)).toBe(true);
    } finally {
      cleanupFixture(outDir);
    }
  });
});
