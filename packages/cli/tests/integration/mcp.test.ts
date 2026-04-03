import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit mcp', () => {
  it('adds, inspects, and binds tools from local mock MCP server', async () => {
    const root = makeTempWorkspace('mcp-success');
    const mockServer = fixturePath('mcp', 'mock-server.mjs');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const add = await runCli(['mcp', 'add', 'node', '--name', 'mock', '--args', mockServer], {
        cwd: root,
      });
      expect(add.code).toBe(0);

      const inspect = await runCli(['mcp', 'inspect', 'mock'], { cwd: root, timeoutMs: 45000 });
      expect(inspect.code).toBe(0);
      expect(inspect.stdout + inspect.stderr).toContain('echo');

      const bind = await runCli(['mcp', 'bind', '--server', 'mock'], { cwd: root, timeoutMs: 45000 });
      expect(bind.code).toBe(0);
      expect(existsSync(join(root, '.tastekit', 'bindings.v1.json'))).toBe(true);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails inspect for unknown server', async () => {
    const root = makeTempWorkspace('mcp-failure');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });
      const result = await runCli(['mcp', 'inspect', 'missing'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('Server not found');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
