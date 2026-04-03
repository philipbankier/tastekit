import { describe, expect, it } from 'vitest';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit completion', () => {
  it('generates completion scripts for bash, zsh, and fish', async () => {
    const root = makeTempWorkspace('completion-success');

    try {
      for (const shell of ['bash', 'zsh', 'fish']) {
        const result = await runCli(['completion', shell], { cwd: root });
        expect(result.code).toBe(0);
        expect(result.stdout.length).toBeGreaterThan(0);
      }
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails for unsupported shell values', async () => {
    const root = makeTempWorkspace('completion-failure');

    try {
      const result = await runCli(['completion', 'powershell'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('Unknown shell');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
