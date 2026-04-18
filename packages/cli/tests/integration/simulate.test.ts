import { describe, expect, it } from 'vitest';
import { cpSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit simulate', () => {
  it('renders a compiled workspace summary in plain text', async () => {
    const root = makeTempWorkspace('simulate-text');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const result = await runCli(['simulate'], { cwd: workspace });
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('TasteKit Simulation');
      expect(result.stdout).toContain('development-agent');
      expect(result.stdout).toContain('claude-code, openclaw, manus, autopilots');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('emits JSON and scenario matches when guardrails overlap', async () => {
    const root = makeTempWorkspace('simulate-json');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      writeFileSync(
        join(workspace, '.tastekit', 'bindings.v1.json'),
        JSON.stringify({
          schema_version: 'bindings.v1',
          servers: [
            {
              name: 'github',
              url: 'stdio://github',
              tools: [{ tool_ref: 'github:pull_request', risk_hints: ['write'] }],
              resources: [{ resource_ref: 'github:repos', uri_pattern: 'repos/*' }],
              prompts: [],
              last_bind_at: '2026-02-20T20:27:14.564Z',
            },
          ],
        }, null, 2),
        'utf-8',
      );

      const result = await runCli([
        '--json',
        'simulate',
        '--scenario',
        'Delete a repo file and then open a github pull_request',
      ], { cwd: workspace });

      expect(result.code).toBe(0);

      const parsed = JSON.parse(result.stdout);
      expect(parsed.domain).toBe('development-agent');
      expect(parsed.adapters).toEqual(['claude-code', 'openclaw', 'manus', 'autopilots']);
      expect(parsed.scenario.triggered_guardrails.length).toBeGreaterThan(0);
    } finally {
      cleanupWorkspace(root);
    }
  });
});
