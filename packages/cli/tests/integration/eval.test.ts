import { describe, expect, it } from 'vitest';
import { cpSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit eval', () => {
  it('runs eval pack and replays traces against fixture profile', async () => {
    const root = makeTempWorkspace('eval-success');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v1', 'workspace'), workspace, { recursive: true });

      const run = await runCli(
        ['eval', 'run', '--pack', fixturePath('evals', 'basic-evalpack.yaml'), '--format', 'summary'],
        { cwd: workspace },
      );
      expect(run.code).toBe(0);

      const replay = await runCli(
        ['eval', 'replay', '--trace', fixturePath('traces', 'replay.jsonl')],
        { cwd: workspace },
      );
      expect(replay.code).toBe(0);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails when eval pack is missing', async () => {
    const root = makeTempWorkspace('eval-failure');

    try {
      const result = await runCli(
        ['eval', 'run', '--pack', join(root, 'missing.yaml')],
        { cwd: root },
      );
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('No evaluation pack found');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
