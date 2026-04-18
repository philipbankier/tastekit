import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import YAML from 'yaml';
import { compile } from '../compiler.js';
import type { SessionState } from '../../schemas/workspace.js';

function makeWorkspace(): string {
  return mkdtempSync(join(tmpdir(), 'tastekit-compiler-mcp-'));
}

function makeSession(): SessionState {
  return {
    session_id: 'session-mcp',
    started_at: '2026-01-15T10:00:00.000Z',
    last_updated_at: '2026-01-15T10:05:00.000Z',
    domain_id: 'development-agent',
    depth: 'guided',
    current_step: 'done',
    completed_steps: ['intro', 'goals', 'tone', 'tradeoffs'],
    answers: {
      goals: {
        primary_goal: 'Help with development work',
        key_principles: 'Be correct, Keep edits small',
      },
      tone: {
        voice_keywords: ['direct', 'technical'],
        forbidden_phrases: 'as an AI',
      },
      tradeoffs: {
        accuracy_vs_speed: 0.7,
        autonomy_level: 0.6,
      },
    },
  };
}

describe('compile MCP awareness', () => {
  it('adds MCP summary and MCP-sourced guardrail entries when bindings exist', async () => {
    const workspacePath = makeWorkspace();

    try {
      writeFileSync(
        join(workspacePath, 'bindings.v1.json'),
        JSON.stringify({
          schema_version: 'bindings.v1',
          servers: [
            {
              name: 'github',
              url: 'stdio://github',
              tools: [
                { tool_ref: 'pull_request', risk_hints: ['write'] },
                { tool_ref: 'delete_branch', risk_hints: ['destructive', 'high'] },
              ],
              resources: [{ resource_ref: 'github:repos', uri_pattern: 'repos/*' }],
              prompts: [{ prompt_ref: 'github:summary', description: 'Summarize repo changes' }],
              last_bind_at: '2026-01-15T10:00:00.000Z',
            },
          ],
        }, null, 2),
        'utf-8',
      );

      const result = await compile({
        workspacePath,
        session: makeSession(),
        generatorVersion: '0.5.0',
      });

      expect(result.success).toBe(true);

      const guardrails = YAML.parse(readFileSync(join(workspacePath, 'guardrails.v1.yaml'), 'utf-8'));
      expect(guardrails.mcp.tool_count).toBe(2);
      expect(guardrails.mcp.resource_count).toBe(1);
      expect(guardrails.mcp.servers[0].tools).toEqual(['github:pull_request', 'github:delete_branch']);

      const mcpPermission = guardrails.permissions.find((permission: any) => permission.source === 'mcp');
      expect(mcpPermission).toBeDefined();
      expect(mcpPermission.tool_ref).toMatch(/^github:/);

      const mcpApproval = guardrails.approvals.find((approval: any) => approval.source === 'mcp');
      expect(mcpApproval).toBeDefined();
      expect(mcpApproval.when).toContain('github:delete_branch');
    } finally {
      rmSync(workspacePath, { recursive: true, force: true });
    }
  });
});
