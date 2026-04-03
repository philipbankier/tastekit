import { describe, expect, it } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit global option ergonomics', () => {
  it('supports --json for nested commands in both flag orders', async () => {
    const root = makeTempWorkspace('global-json');

    try {
      const nestedSkills = await runCli(['skills', 'list', '--json'], { cwd: root });
      expect(nestedSkills.code).toBe(0);
      expect(JSON.parse(nestedSkills.stdout)).toEqual({ skills: [] });

      const rootSkills = await runCli(['--json', 'skills', 'list'], { cwd: root });
      expect(rootSkills.code).toBe(0);
      expect(JSON.parse(rootSkills.stdout)).toEqual({ skills: [] });

      const nestedMcp = await runCli(['mcp', 'list', '--json'], { cwd: root });
      expect(nestedMcp.code).toBe(0);
      expect(JSON.parse(nestedMcp.stdout)).toEqual({ servers: [] });

      const rootMcp = await runCli(['--json', 'mcp', 'list'], { cwd: root });
      expect(rootMcp.code).toBe(0);
      expect(JSON.parse(rootMcp.stdout)).toEqual({ servers: [] });
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('supports --verbose for nested commands in both flag orders', async () => {
    const root = makeTempWorkspace('global-verbose');
    const mockServer = fixturePath('mcp', 'mock-server.mjs');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const add = await runCli(['mcp', 'add', 'node', '--name', 'mock', '--args', mockServer], {
        cwd: root,
      });
      expect(add.code).toBe(0);

      const nestedVerbose = await runCli(['mcp', 'inspect', 'mock', '--verbose'], {
        cwd: root,
        timeoutMs: 45000,
      });
      expect(nestedVerbose.code).toBe(0);
      expect(nestedVerbose.stderr).toContain('[verbose] Connected to mock');

      const rootVerbose = await runCli(['--verbose', 'mcp', 'inspect', 'mock'], {
        cwd: root,
        timeoutMs: 45000,
      });
      expect(rootVerbose.code).toBe(0);
      expect(rootVerbose.stderr).toContain('[verbose] Connected to mock');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
