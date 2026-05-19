import { describe, expect, it } from 'vitest';
import { cpSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
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

  it('emits parseable JSON for eval run and replay machine modes', async () => {
    const root = makeTempWorkspace('eval-json');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v1', 'workspace'), workspace, { recursive: true });

      const run = await runCli(
        ['eval', 'run', '--pack', fixturePath('evals', 'basic-evalpack.yaml'), '--format', 'json'],
        { cwd: workspace },
      );
      expect(run.code).toBe(0);
      const runJson = JSON.parse(run.stdout);
      expect(runJson.evalpack_id).toBeTruthy();
      expect(Array.isArray(runJson.results)).toBe(true);

      const replay = await runCli(
        ['--json', 'eval', 'replay', '--trace', fixturePath('traces', 'replay.jsonl')],
        { cwd: workspace },
      );
      expect(replay.code).toBe(0);
      const replayJson = JSON.parse(replay.stdout);
      expect(replayJson.passed).toBe(true);
      expect(Array.isArray(replayJson.violations)).toBe(true);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('keeps eval run machine JSON compact while saving the full report', async () => {
    const root = makeTempWorkspace('eval-json-large-output');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v1', 'workspace'), workspace, { recursive: true });

      const largeResponse = 'challenge uncertainty evidence approval irreversible public action fatigue compress '.repeat(5000);
      const evalPackPath = join(root, 'large-output-evalpack.json');
      writeFileSync(evalPackPath, JSON.stringify({
        schema_version: 'evalpack.v1',
        id: 'large-output-machine-json',
        name: 'Large Output Machine JSON',
        scenarios: [
          {
            scenario_id: 'large-runtime-profile',
            name: 'Large runtime profile',
            setup: { inputs: { response: largeResponse } },
            expected: {
              rubrics: ['profile'],
              thresholds: { profile: 0.5 },
              required_outputs: ['response'],
            },
          },
        ],
        judging: {
          output_format: 'json',
          rules: [
            { rule_id: 'challenge', type: 'deterministic', pattern: 'challenge', weight: 1 },
          ],
        },
      }, null, 2), 'utf-8');

      const run = await runCli(
        ['eval', 'run', '--pack', evalPackPath, '--format', 'json'],
        { cwd: workspace },
      );
      expect(run.code).toBe(0);
      const runJson = JSON.parse(run.stdout);
      expect(runJson.passed).toBe(true);
      expect(runJson.report_path).toBeTruthy();
      expect(runJson.results[0].outputs).toBeUndefined();
      expect(runJson.results[0].output_keys).toEqual(['response']);

      const savedReport = JSON.parse(readFileSync(runJson.report_path, 'utf-8'));
      expect(savedReport.results[0].outputs.response).toBe(largeResponse);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('supports explicit full JSON eval output for callers that need raw outputs', async () => {
    const root = makeTempWorkspace('eval-full-json');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v1', 'workspace'), workspace, { recursive: true });

      const run = await runCli(
        ['eval', 'run', '--pack', fixturePath('evals', 'basic-evalpack.yaml'), '--format', 'full-json'],
        { cwd: workspace },
      );
      expect(run.code).toBe(0);
      const runJson = JSON.parse(run.stdout);
      expect(runJson.evalpack_id).toBeTruthy();
      expect(runJson.report_path).toBeTruthy();
      expect(runJson.results[0].outputs).toBeTruthy();
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('writes eval reports with sanitized filenames derived from pack ids', async () => {
    const root = makeTempWorkspace('eval-report-filename');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v1', 'workspace'), workspace, { recursive: true });

      const evalPackPath = join(root, 'unsafe-id-evalpack.json');
      writeFileSync(evalPackPath, JSON.stringify({
        schema_version: 'evalpack.v1',
        id: '../nested/id:with spaces',
        name: 'Unsafe ID Evalpack',
        scenarios: [
          {
            scenario_id: 'safe-report-path',
            name: 'Safe report path',
            setup: { inputs: { response: 'challenge evidence approval fatigue compress' } },
            expected: {
              rubrics: ['profile'],
              thresholds: { profile: 0.5 },
              required_outputs: ['response'],
            },
          },
        ],
        judging: {
          output_format: 'json',
          rules: [
            { rule_id: 'challenge', type: 'deterministic', pattern: 'challenge', weight: 1 },
          ],
        },
      }, null, 2), 'utf-8');

      const run = await runCli(
        ['eval', 'run', '--pack', evalPackPath, '--format', 'json'],
        { cwd: workspace },
      );
      expect(run.code).toBe(0);
      const runJson = JSON.parse(run.stdout);
      expect(basename(dirname(runJson.report_path))).toBe('eval-reports');
      expect(basename(runJson.report_path)).toMatch(/^nested-id-with-spaces_\d+\.json$/);
      const savedReport = JSON.parse(readFileSync(runJson.report_path, 'utf-8'));
      expect(savedReport.evalpack_id).toBe('../nested/id:with spaces');
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
