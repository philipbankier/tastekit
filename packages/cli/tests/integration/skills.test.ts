import { describe, expect, it } from 'vitest';
import { cpSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit skills', () => {
  it('runs list/lint/graph against v1 fixture workspace', async () => {
    const root = makeTempWorkspace('skills-success');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v1', 'workspace'), workspace, { recursive: true });

      const list = await runCli(['skills', 'list'], { cwd: workspace });
      const lint = await runCli(['skills', 'lint'], { cwd: workspace });
      const graph = await runCli(['skills', 'graph'], { cwd: workspace });

      expect(list.code).toBe(0);
      // Wave-1 fixtures intentionally include lint failures captured in validation report.
      expect(lint.code).not.toBe(0);
      expect(graph.code).toBe(0);
      expect(list.stdout + list.stderr).toContain('skill');
      expect(lint.stdout + lint.stderr).toContain('Missing YAML frontmatter');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails pack when skills directory is missing', async () => {
    const root = makeTempWorkspace('skills-failure');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const result = await runCli(['skills', 'pack'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('No skills directory found');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
