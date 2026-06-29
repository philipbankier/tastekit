import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';
import { ConstitutionV1Schema } from '@kairox_ai/tastekit-core/schemas';

describe('tastekit import', () => {
  it('imports from SOUL.md and Agent File fixtures', async () => {
    const root = makeTempWorkspace('import-success');

    try {
      const soulResult = await runCli(
        ['import', '--target', 'soul-md', '--source', fixturePath('import', 'soul')],
        { cwd: root },
      );
      expect(soulResult.code).toBe(0);
      expect(existsSync(join(root, '.tastekit', 'constitution.v1.json'))).toBe(true);

      const agentResult = await runCli(
        ['import', '--target', 'agent-file', '--source', fixturePath('import', 'agent', 'agent.af')],
        { cwd: root },
      );
      expect(agentResult.code).toBe(0);
      expect(existsSync(join(root, '.tastekit', 'constitution.v1.json'))).toBe(true);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('imported constitutions validate against the locked v1 schema (both soul-md and agent-file paths)', async () => {
    const root = makeTempWorkspace('import-validates');
    try {
      const soulResult = await runCli(
        ['import', '--target', 'soul-md', '--source', fixturePath('import', 'soul')],
        { cwd: root },
      );
      expect(soulResult.code).toBe(0);
      const soulConstitution = JSON.parse(
        readFileSync(join(root, '.tastekit', 'constitution.v1.json'), 'utf-8'),
      );
      const soulValidation = ConstitutionV1Schema.safeParse(soulConstitution);
      expect(soulValidation.success).toBe(true);

      const agentResult = await runCli(
        ['import', '--target', 'agent-file', '--source', fixturePath('import', 'agent', 'agent.af')],
        { cwd: root },
      );
      expect(agentResult.code).toBe(0);
      const agentConstitution = JSON.parse(
        readFileSync(join(root, '.tastekit', 'constitution.v1.json'), 'utf-8'),
      );
      const agentValidation = ConstitutionV1Schema.safeParse(agentConstitution);
      expect(agentValidation.success).toBe(true);
      expect(agentConstitution.extensions?.['x-tastekit-import']?.source).toBe('agent-file');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails when source file path is missing', async () => {
    const root = makeTempWorkspace('import-failure');

    try {
      const result = await runCli(
        ['import', '--target', 'agent-file', '--source', join(root, 'missing.af')],
        { cwd: root },
      );
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('File not found');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
