import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { compile } from '../compiler.js';
import { writeDerivationState, buildDerivationState } from '../derivation.js';
import type { SessionState } from '../../schemas/workspace.js';

function makeSession(): SessionState {
  return {
    session_id: 'resume-test',
    started_at: '2026-01-15T10:00:00.000Z',
    last_updated_at: '2026-01-15T10:05:00.000Z',
    depth: 'guided',
    current_step: 'done',
    completed_steps: ['intro', 'goals'],
    answers: {
      goals: {
        primary_goal: 'Test the resume gate',
        key_principles: 'Lock holds even on resume',
      },
    },
  } as SessionState;
}

const workspaces: string[] = [];

afterEach(() => {
  for (const w of workspaces) {
    rmSync(w, { recursive: true, force: true });
  }
  workspaces.length = 0;
});

function newWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'tastekit-compile-resume-'));
  const tastekitDir = join(root, '.tastekit');
  mkdirSync(tastekitDir, { recursive: true });
  workspaces.push(root);
  return tastekitDir;
}

describe('compile resume safety — schema lock holds across cached steps', () => {
  it('regenerates the constitution if the cached file fails ConstitutionV1Schema', async () => {
    const workspace = newWorkspace();
    const constitutionPath = join(workspace, 'constitution.v1.json');

    // Plant an invalid (pre-W0b shape) constitution that would have passed the loose schema.
    writeFileSync(
      constitutionPath,
      JSON.stringify({
        schema_version: 'constitution.v1',
        generated_at: '2026-01-15T10:00:00.000Z',
        generator_version: '0.5.0',
        user_scope: 'single_user',
        principles: [
          { id: 'principle_0', priority: 1, statement: 'Old shape', applies_to: ['*'] },
        ],
        tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [] },
        tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5 },
        evidence_policy: { require_citations_for: [], uncertainty_language_rules: [] },
        taboos: { never_do: [], must_escalate: [] },
        imported_from: 'pre-w0b',
      }),
      'utf-8',
    );

    // Mark constitution as 'completed' so the compiler would skip without the gate.
    const derivation = buildDerivationState(makeSession(), '0.5.0');
    derivation.completed_steps = ['constitution'];
    writeDerivationState(workspace, derivation);

    const result = await compile({
      workspacePath: workspace,
      session: makeSession(),
      generatorVersion: '0.5.0',
      resume: true,
    });

    expect(result.success).toBe(true);

    const reloaded = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
    expect(reloaded.principles[0].id).not.toBe('principle_0');
    expect(reloaded).not.toHaveProperty('imported_from');
  });

  it('invalidates downstream steps (skills, playbooks) when constitution is regenerated', async () => {
    const workspace = newWorkspace();
    const constitutionPath = join(workspace, 'constitution.v1.json');

    writeFileSync(
      constitutionPath,
      JSON.stringify({
        schema_version: 'constitution.v1',
        generated_at: '2026-01-15T10:00:00.000Z',
        generator_version: '0.5.0',
        user_scope: 'single_user',
        principles: [{ id: 'principle_0', priority: 1, statement: 'Old shape', applies_to: ['*'] }],
        tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [] },
        tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5 },
        evidence_policy: { require_citations_for: [], uncertainty_language_rules: [] },
        taboos: { never_do: [], must_escalate: [] },
        forbidden_extra: 'should fail strict',
      }),
      'utf-8',
    );

    const derivation = buildDerivationState(makeSession(), '0.5.0');
    derivation.completed_steps = ['constitution', 'guardrails', 'memory', 'skills', 'playbooks'];
    writeDerivationState(workspace, derivation);

    const result = await compile({
      workspacePath: workspace,
      session: makeSession(),
      generatorVersion: '0.5.0',
      resume: true,
    });
    expect(result.success).toBe(true);

    const { readDerivationState } = await import('../derivation.js');
    const persisted = readDerivationState(workspace);
    expect(persisted).not.toBeNull();
    expect(persisted!.completed_steps).toContain('constitution');
    expect(persisted!.completed_steps).toContain('skills');
    expect(persisted!.completed_steps).toContain('playbooks');
  });

  it('honors the cached constitution when it is valid (no needless regeneration)', async () => {
    const workspace = newWorkspace();
    const constitutionPath = join(workspace, 'constitution.v1.json');

    const validCached = {
      schema_version: 'constitution.v1' as const,
      generated_at: '2026-01-15T10:00:00.000Z',
      generator_version: '1.0.0',
      user_scope: 'single_user' as const,
      principles: [
        { id: 'cached_principle', priority: 1, statement: 'Already valid', applies_to: ['*'] },
      ],
      tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [] },
      tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5 },
      evidence_policy: { require_citations_for: [], uncertainty_language_rules: [] },
      taboos: { never_do: [], must_escalate: [] },
    };
    writeFileSync(constitutionPath, JSON.stringify(validCached), 'utf-8');

    const derivation = buildDerivationState(makeSession(), '1.0.0');
    derivation.completed_steps = ['constitution'];
    writeDerivationState(workspace, derivation);

    const result = await compile({
      workspacePath: workspace,
      session: makeSession(),
      generatorVersion: '1.0.0',
      resume: true,
    });

    expect(result.success).toBe(true);
    const reloaded = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
    expect(reloaded.principles[0].id).toBe('cached_principle');
  });
});
