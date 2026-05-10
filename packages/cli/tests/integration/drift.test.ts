import { describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, fixturePath, makeTempWorkspace, runCli } from '../helpers/run-cli.js';
import { ConstitutionV1Schema } from '@actrun_ai/tastekit-core/schemas';

describe('tastekit drift', () => {
  it('detects drift on fixture traces and generates consolidation plan', async () => {
    const root = makeTempWorkspace('drift-success');
    const workspace = join(root, 'workspace');

    try {
      cpSync(fixturePath('e2e', 'v2', 'workspace'), workspace, { recursive: true });

      const detect = await runCli(['drift', 'detect'], { cwd: workspace });
      expect(detect.code).toBe(0);

      mkdirSync(join(workspace, '.tastekit', 'memory'), { recursive: true });
      writeFileSync(
        join(workspace, '.tastekit', 'memory', 'entry-1.json'),
        JSON.stringify({ content: 'Remember this', salience: 0.8, timestamp: new Date().toISOString() }),
        'utf-8',
      );

      const consolidate = await runCli(['drift', 'memory-consolidate'], { cwd: workspace });
      expect(consolidate.code).toBe(0);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('drift apply preserves the locked schema (writes only validated artifacts)', async () => {
    const root = makeTempWorkspace('drift-apply-validation');
    const tastekitDir = join(root, '.tastekit');
    const constitutionPath = join(tastekitDir, 'constitution.v1.json');
    const proposalsDir = join(tastekitDir, 'proposals');
    try {
      mkdirSync(proposalsDir, { recursive: true });

      const validConstitution = {
        schema_version: 'constitution.v1' as const,
        generated_at: '2026-01-15T10:00:00.000Z',
        generator_version: '1.0.0',
        user_scope: 'single_user' as const,
        principles: [
          { id: 'starter', priority: 1, statement: 'Starter principle', applies_to: ['*'] },
        ],
        tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [] },
        tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5 },
        evidence_policy: { require_citations_for: [], uncertainty_language_rules: [] },
        taboos: { never_do: [], must_escalate: [] },
      };
      writeFileSync(constitutionPath, JSON.stringify(validConstitution, null, 2), 'utf-8');

      // A proposal that mirrors what detector.ts produces: no id, hardcoded high priority,
      // both invalid for the locked schema before normalization.
      const proposal = {
        proposal_id: 'p-001',
        proposed_changes: {
          constitution: {
            add_principle: {
              statement: 'Always defer destructive operations to the user.',
              priority: 10,
            },
          },
        },
      };
      writeFileSync(join(proposalsDir, 'p-001.json'), JSON.stringify(proposal), 'utf-8');

      const result = await runCli(['drift', 'apply', 'p-001'], { cwd: root });
      expect(result.code).toBe(0);

      const merged = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
      const validation = ConstitutionV1Schema.safeParse(merged);
      expect(validation.success).toBe(true);

      // Priorities renumbered to 1..N regardless of what the proposal asked for.
      expect(merged.principles.map((p: { priority: number }) => p.priority)).toEqual([1, 2]);
      // New principle got a slug ID, not numeric.
      expect(merged.principles[1].id).not.toMatch(/^principle_\d+$/);
      expect(merged.principles[1].id).toMatch(/[a-z]/);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('drift apply refuses to apply when on-disk constitution is already invalid', async () => {
    const root = makeTempWorkspace('drift-apply-precheck');
    const tastekitDir = join(root, '.tastekit');
    const constitutionPath = join(tastekitDir, 'constitution.v1.json');
    const proposalsDir = join(tastekitDir, 'proposals');
    try {
      mkdirSync(proposalsDir, { recursive: true });

      writeFileSync(
        constitutionPath,
        JSON.stringify({
          schema_version: 'constitution.v1',
          generated_at: '2026-01-15T10:00:00.000Z',
          generator_version: '0.5.0',
          user_scope: 'single_user',
          principles: [],
          tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [] },
          tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5 },
          evidence_policy: { require_citations_for: [], uncertainty_language_rules: [] },
          taboos: { never_do: [], must_escalate: [] },
        }),
        'utf-8',
      );

      writeFileSync(
        join(proposalsDir, 'p-002.json'),
        JSON.stringify({
          proposal_id: 'p-002',
          proposed_changes: {
            constitution: { add_principle: { statement: 'Some new principle.' } },
          },
        }),
        'utf-8',
      );

      const result = await runCli(['drift', 'apply', 'p-002'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toMatch(/fails ConstitutionV1Schema/i);
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails applying an unknown proposal id', async () => {
    const root = makeTempWorkspace('drift-failure');

    try {
      mkdirSync(join(root, '.tastekit'), { recursive: true });
      const result = await runCli(['drift', 'apply', 'unknown-proposal'], { cwd: root });
      expect(result.code).not.toBe(0);
      expect(result.stderr + result.stdout).toContain('Proposal not found');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
