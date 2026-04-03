import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit skills lifecycle', () => {
  it('skills report shows no-traces message when traces dir missing', async () => {
    const root = makeTempWorkspace('skills-report-no-traces');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const result = await runCli(['skills', 'report'], { cwd: root });
      expect(result.code).toBe(0);
      expect(result.stdout + result.stderr).toContain('No traces found');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('skills report shows no-data message when no skill events in traces', async () => {
    const root = makeTempWorkspace('skills-report-empty');
    const tracesDir = join(root, '.tastekit', 'traces');

    try {
      mkdirSync(tracesDir, { recursive: true });
      // Write a trace with no skill_id — should produce no skill data
      writeFileSync(
        join(tracesDir, 'test.jsonl'),
        '{"schema_version":"trace_event.v1","run_id":"r1","timestamp":"2026-01-01T00:00:00.000Z","actor":"agent","event_type":"plan"}\n',
      );

      const result = await runCli(['skills', 'report'], { cwd: root });
      expect(result.code).toBe(0);
      expect(result.stdout + result.stderr).toContain('No skill execution data');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('skills inspect shows no-data message for unknown skill', async () => {
    const root = makeTempWorkspace('skills-inspect-unknown');
    const tracesDir = join(root, '.tastekit', 'traces');

    try {
      mkdirSync(tracesDir, { recursive: true });
      writeFileSync(
        join(tracesDir, 'test.jsonl'),
        '{"schema_version":"trace_event.v1","run_id":"r1","timestamp":"2026-01-01T00:00:00.000Z","actor":"agent","event_type":"plan","skill_id":"other-skill"}\n',
      );

      const result = await runCli(['skills', 'inspect', 'nonexistent-skill'], { cwd: root });
      expect(result.code).toBe(0);
      expect(result.stdout + result.stderr).toContain('No execution data found');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('skills history shows no-version message for unknown skill', async () => {
    const root = makeTempWorkspace('skills-history-empty');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const result = await runCli(['skills', 'history', 'nonexistent-skill'], { cwd: root });
      expect(result.code).toBe(0);
      expect(result.stdout + result.stderr).toContain('No version history');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('skills rollback fails for nonexistent version', async () => {
    const root = makeTempWorkspace('skills-rollback-fail');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });

      const result = await runCli(['skills', 'rollback', 'some-skill', '99'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('Version 99 not found');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
