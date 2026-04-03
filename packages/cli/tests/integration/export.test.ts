import { describe, expect, it } from 'vitest';
import { cpSync, existsSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit export', () => {
  it('exports adapters and interop formats from compiled fixture workspace', async () => {
    const root = makeTempWorkspace('export-success');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const targets: Array<[string, string]> = [
        ['claude-code', join(workspace, 'out', 'claude')],
        ['openclaw', join(workspace, 'out', 'openclaw')],
        ['manus', join(workspace, 'out', 'manus')],
        ['agents-md', join(workspace, 'out', 'agents')],
        ['agent-file', join(workspace, 'out', 'agent-file')],
      ];

      for (const [target, outDir] of targets) {
        const result = await runCli(['export', '--target', target, '--out', outDir], { cwd: workspace });
        expect(result.code).toBe(0);
      }

      expect(existsSync(join(workspace, 'out', 'claude', 'CLAUDE.md'))).toBe(true);
      expect(existsSync(join(workspace, 'out', 'openclaw', 'openclaw.config.json'))).toBe(true);
      expect(existsSync(join(workspace, 'out', 'manus', 'README.md'))).toBe(true);
      expect(existsSync(join(workspace, 'out', 'agents', 'AGENTS.md'))).toBe(true);
      expect(existsSync(join(workspace, 'out', 'agent-file', 'agent.af'))).toBe(true);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails on unsupported target choice', async () => {
    const root = makeTempWorkspace('export-failure');

    try {
      const result = await runCli(['export', '--target', 'unknown-target'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('Allowed choices');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
