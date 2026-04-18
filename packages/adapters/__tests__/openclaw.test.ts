import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { OpenClawAdapter } from '../openclaw/index.js';
import {
  cleanupFixture,
  createTempDir,
  fixturePath,
  listRelativeFiles,
  validateMarkdown,
} from './helpers.js';

describe('OpenClawAdapter (fixture workspace)', () => {
  it('exports SOUL.md, AGENTS.md, config JSON, and skills with valid content', async () => {
    const profilePath = fixturePath('testing', 'e2e', 'v2', 'workspace', '.tastekit');
    const outDir = createTempDir('tastekit-openclaw-export');

    try {
      const adapter = new OpenClawAdapter();
      await adapter.export(profilePath, outDir, {
        includeSkills: true,
        includePlaybooks: true,
      });

      expect(existsSync(join(outDir, 'SOUL.md'))).toBe(true);
      expect(existsSync(join(outDir, 'IDENTITY.md'))).toBe(true);
      expect(existsSync(join(outDir, 'AGENTS.md'))).toBe(true);
      expect(existsSync(join(outDir, 'openclaw.config.json'))).toBe(true);
      expect(existsSync(join(outDir, 'skills', 'manifest.v1.yaml'))).toBe(true);

      const soul = readFileSync(join(outDir, 'SOUL.md'), 'utf-8');
      validateMarkdown(soul);
      expect(soul).toContain('## Identity');
      expect(soul).toContain('## Principles');
      expect(soul).toContain('## Voice & Tone');
      expect(soul).toContain('## Tradeoffs');

      const agents = readFileSync(join(outDir, 'AGENTS.md'), 'utf-8');
      validateMarkdown(agents);
      expect(agents).toContain('## Guardrails');
      expect(agents).toContain('## Behavior');
      expect(agents).toContain('## Skills');

      const config = JSON.parse(readFileSync(join(outDir, 'openclaw.config.json'), 'utf-8')) as {
        version: string;
        profile: { principles: unknown[]; tone: Record<string, unknown>; tradeoffs: Record<string, unknown> };
        behavior: { autonomy_level: unknown; require_citations: unknown[] };
        safety: { forbidden_phrases: unknown[]; taboos: { never_do: string[] } };
      };
      expect(config.version).toBe('1.0');
      expect(config.profile.principles.length).toBeGreaterThan(0);
      expect(Array.isArray(config.behavior.require_citations)).toBe(true);
      expect(config.safety.taboos.never_do.length).toBeGreaterThan(0);

      const generatedSkills = listRelativeFiles(join(outDir, 'skills'));
      const fixtureSkills = listRelativeFiles(
        fixturePath('testing', 'e2e', 'v2', 'workspace', 'exports', 'openclaw', 'skills'),
      );
      expect(generatedSkills).toEqual(fixtureSkills);
    } finally {
      cleanupFixture(outDir);
    }
  });
});
