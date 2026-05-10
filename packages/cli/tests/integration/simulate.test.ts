import { describe, expect, it } from 'vitest';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit simulate', () => {
  it('keeps the planned v1.1 command contract available', async () => {
    const root = makeTempWorkspace('simulate');

    try {
      const result = await runCli(['simulate'], { cwd: root });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Simulation is planned for TasteKit v1.1.');
      expect(result.stderr).not.toContain('unknown command');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
