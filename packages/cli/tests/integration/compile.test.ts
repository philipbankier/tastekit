import { describe, expect, it } from 'vitest';
import { cpSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit compile', () => {
  it('supports idempotent resume compilation on fixture workspace', async () => {
    const root = makeTempWorkspace('compile-resume');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const first = await runCli(['compile', '--resume'], { cwd: workspace });
      const second = await runCli(['compile', '--resume'], { cwd: workspace });

      expect(first.code).toBe(0);
      expect(second.code).toBe(0);
      expect(first.stdout + first.stderr).toContain('Compilation complete');
      expect(second.stdout + second.stderr).toContain('Compilation complete');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails when no onboarding session is present', async () => {
    const root = makeTempWorkspace('compile-missing-session');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const result = await runCli(['compile'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('No onboarding session found');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
