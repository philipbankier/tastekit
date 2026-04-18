import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ClaudeCodeAdapter } from '../claude-code/index.js';
import {
  cleanupFixture,
  createTempDir,
  fixturePath,
  listRelativeFiles,
  validateMarkdown,
} from './helpers.js';

describe('ClaudeCodeAdapter (fixture workspace)', () => {
  it('exports markdown, bash hooks, settings, and skills with valid content', async () => {
    const profilePath = fixturePath('testing', 'e2e', 'v2', 'workspace', '.tastekit');
    const outDir = createTempDir('tastekit-claude-export');

    try {
      const adapter = new ClaudeCodeAdapter();
      await adapter.export(profilePath, outDir, {
        includeSkills: true,
        includePlaybooks: true,
      });

      expect(existsSync(join(outDir, 'CLAUDE.md'))).toBe(true);
      expect(existsSync(join(outDir, '.claude', 'settings.local.json'))).toBe(true);
      expect(existsSync(join(outDir, '.tastekit', 'hooks', 'session-orient.sh'))).toBe(true);
      expect(existsSync(join(outDir, 'skills', 'manifest.v1.yaml'))).toBe(true);

      const claudeMd = readFileSync(join(outDir, 'CLAUDE.md'), 'utf-8');
      validateMarkdown(claudeMd);
      expect(claudeMd).toContain('## Guardrails');
      expect(claudeMd).toMatch(/## (Constitution|Identity & Principles)/);
      expect(claudeMd).toMatch(/## (Memory|Memory Policy)/);
      expect(claudeMd).toMatch(/## (Skills|Available Skills)/);

      const hookDir = join(outDir, '.tastekit', 'hooks');
      const hookFiles = listRelativeFiles(hookDir);
      expect(hookFiles).toEqual([
        'artifact-validate.sh',
        'post-compact.sh',
        'session-capture.sh',
        'session-orient.sh',
        'tastekit-guard.sh',
      ]);

      for (const hookFile of hookFiles) {
        const hookContent = readFileSync(join(hookDir, hookFile), 'utf-8');
        expect(hookContent).toMatch(/^#!\/(?:usr\/bin\/env bash|bin\/bash)\n/);
      }

      const settings = JSON.parse(readFileSync(join(outDir, '.claude', 'settings.local.json'), 'utf-8')) as {
        hooks: Record<string, Array<{ command: string }>>;
        permissions: { defaultMode: string };
      };
      expect(Object.keys(settings.hooks).sort()).toEqual([
        'PostCompact',
        'PostToolUse',
        'PreToolUse',
        'SessionStart',
        'Stop',
      ]);
      expect(settings.hooks.SessionStart[0]?.command).toBe('.tastekit/hooks/session-orient.sh');
      expect(settings.hooks.PreToolUse[0]?.command).toBe('.tastekit/hooks/tastekit-guard.sh');
      expect(settings.permissions.defaultMode).toBeDefined();

      const fixtureHookDir = fixturePath('testing', 'e2e', 'v2', 'workspace', 'exports', 'claude-code', '.tastekit', 'hooks');
      expect(listRelativeFiles(fixtureHookDir)).toEqual([
        'artifact-validate.sh',
        'auto-commit.sh',
        'session-capture.sh',
        'session-orient.sh',
        'tastekit-guard.sh',
      ]);
    } finally {
      cleanupFixture(outDir);
    }
  });
});
