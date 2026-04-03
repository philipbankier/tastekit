import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit onboard error handling', () => {
  it('fails when no workspace exists', async () => {
    const root = makeTempWorkspace('onboard-no-workspace');

    try {
      const result = await runCli(['onboard'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('No TasteKit workspace found');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails when workspace config is missing', async () => {
    const root = makeTempWorkspace('onboard-no-config');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });
      const result = await runCli(['onboard'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('No tastekit.yaml found');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails cleanly for unsupported provider override', async () => {
    const root = makeTempWorkspace('onboard-provider');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });
      writeFileSync(
        join(root, '.tastekit', 'tastekit.yaml'),
        `version: "1.0.0"\nproject_name: test\ncreated_at: "2026-02-20T00:00:00.000Z"\ndomain_id: development-agent\nonboarding:\n  depth: quick\n  completed: false\n`,
        'utf-8',
      );

      const result = await runCli(['onboard', '--provider', 'unsupported-provider'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('Unknown LLM provider');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
