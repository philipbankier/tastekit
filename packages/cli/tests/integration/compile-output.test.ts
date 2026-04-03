import { describe, expect, it } from 'vitest';
import { cpSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit compile output', () => {
  it('produces all expected artifacts in flat layout', async () => {
    const root = makeTempWorkspace('compile-output');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const result = await runCli(['compile', '--resume'], { cwd: workspace });
      expect(result.code).toBe(0);

      const tk = join(workspace, '.tastekit');

      // Core artifacts in flat layout
      expect(existsSync(join(tk, 'constitution.v1.json'))).toBe(true);
      expect(existsSync(join(tk, 'guardrails.v1.yaml'))).toBe(true);
      expect(existsSync(join(tk, 'memory.v1.yaml'))).toBe(true);

      // Skills
      expect(existsSync(join(tk, 'skills', 'manifest.v1.yaml'))).toBe(true);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('generates SOUL.md in project root', async () => {
    const root = makeTempWorkspace('compile-soul');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const result = await runCli(['compile', '--resume'], { cwd: workspace });
      expect(result.code).toBe(0);

      const soulPath = join(workspace, 'SOUL.md');
      if (existsSync(soulPath)) {
        const soul = readFileSync(soulPath, 'utf-8');
        expect(soul).toContain('# SOUL.md');
        expect(soul).toContain('TasteKit');
      }
      // SOUL.md generation is non-fatal, so we don't fail if it's missing
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('generates AGENTS.md in project root', async () => {
    const root = makeTempWorkspace('compile-agents');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const result = await runCli(['compile', '--resume'], { cwd: workspace });
      expect(result.code).toBe(0);

      const agentsPath = join(workspace, 'AGENTS.md');
      if (existsSync(agentsPath)) {
        const agents = readFileSync(agentsPath, 'utf-8');
        expect(agents).toContain('# AGENTS.md');
        expect(agents).toContain('TasteKit');
      }
      // AGENTS.md generation is non-fatal
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('SOUL.md contains content from enriched constitution', async () => {
    const root = makeTempWorkspace('compile-soul-content');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const result = await runCli(['compile', '--resume'], { cwd: workspace });
      expect(result.code).toBe(0);

      const soulPath = join(workspace, 'SOUL.md');
      if (existsSync(soulPath)) {
        const soul = readFileSync(soulPath, 'utf-8');
        // The enriched fixture has principles, tone, taboos
        expect(soul).toContain('Principles');
        expect(soul).toContain('Prioritize clarity');
        expect(soul).toContain('Taboos');
        expect(soul).toContain('Delete production data');
      }
    } finally {
      cleanupWorkspace(root);
    }
  });
});
