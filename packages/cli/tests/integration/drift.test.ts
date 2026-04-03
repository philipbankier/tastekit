import { describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit drift', () => {
  it('detects drift on fixture traces and generates consolidation plan', async () => {
    const root = makeTempWorkspace('drift-success');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const detect = await runCli(['drift', 'detect'], { cwd: workspace });
      expect(detect.code).toBe(0);

      mkdirSync(join(workspace, '.tastekit', 'memory'), { recursive: true });
      writeFileSync(
        join(workspace, '.tastekit', 'memory', 'entry-1.json'),
        JSON.stringify({ content: 'Remember this', salience: 0.8, timestamp: new Date().toISOString() }),
        'utf-8',
      );

      const consolidate = await runCli(['drift', 'memory-consolidate'], { cwd: workspace });
      expect(consolidate.code).toBe(0);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails applying an unknown proposal id', async () => {
    const root = makeTempWorkspace('drift-failure');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });
      const result = await runCli(['drift', 'apply', 'unknown-proposal'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('Proposal not found');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
