import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit mcp contract paths', () => {
  it('writes bindings to canonical root contract path', async () => {
    const root = makeTempWorkspace('mcp-contract-path');
    const mockServer = fixturePath('mcp', 'mock-server.mjs');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const add = await runCli(['mcp', 'add', 'node', '--name', 'mock', '--args', mockServer], {
        cwd: root,
      });
      expect(add.code).toBe(0);

      const bind = await runCli(['mcp', 'bind', '--server', 'mock'], { cwd: root, timeoutMs: 45000 });
      expect(bind.code).toBe(0);

      const canonicalBindings = join(root, '.tastekit', 'bindings.v1.json');
      expect(existsSync(canonicalBindings)).toBe(true);

      const content = JSON.parse(readFileSync(canonicalBindings, 'utf-8'));
      expect(content.schema_version).toBe('bindings.v1');
      expect(Array.isArray(content.servers)).toBe(true);
    } finally {
      cleanupWorkspace(root);
    }
  });
});
