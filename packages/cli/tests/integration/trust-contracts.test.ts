import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit trust contract paths', () => {
  it('writes trust policy to canonical root contract path', async () => {
    const root = makeTempWorkspace('trust-contract-path');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const init = await runCli(['trust', 'init'], { cwd: root });
      expect(init.code).toBe(0);

      const canonicalTrust = join(root, '.tastekit', 'trust.v1.json');
      expect(existsSync(canonicalTrust)).toBe(true);

      const trust = JSON.parse(readFileSync(canonicalTrust, 'utf-8'));
      expect(trust.schema_version).toBe('trust.v1');
      expect(trust.update_policy.require_review).toBe(true);
    } finally {
      cleanupWorkspace(root);
    }
  });
});
