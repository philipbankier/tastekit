import { describe, expect, it } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit trust', () => {
  it('initializes, pins, and audits trust policy', async () => {
    const root = makeTempWorkspace('trust-success');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const init = await runCli(['trust', 'init'], { cwd: root });
      const pin = await runCli(
        ['trust', 'pin-mcp', 'https://mcp.local', '--fingerprint', 'abc123', '--mode', 'strict'],
        { cwd: root },
      );
      const audit = await runCli(['trust', 'audit'], { cwd: root });

      expect(init.code).toBe(0);
      expect(pin.code).toBe(0);
      expect(audit.code).toBe(0);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails pin-mcp without fingerprint', async () => {
    const root = makeTempWorkspace('trust-failure');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });
      const result = await runCli(['trust', 'pin-mcp', 'https://mcp.local'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('Please specify a fingerprint');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
