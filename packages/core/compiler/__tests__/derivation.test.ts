import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  buildDerivationState,
  writeDerivationState,
  readDerivationState,
  canResume,
} from '../derivation.js';

describe('DerivationState', () => {
  function createWorkspace(): string {
    return mkdtempSync(join(tmpdir(), 'tastekit-derivation-'));
  }

  it('maps interview coverage into dimension resolutions', () => {
    const state = buildDerivationState(
      {
        session_id: 'session-1',
        domain_id: 'development-agent',
        interview: {
          dimension_coverage: [
            {
              dimension_id: 'focus',
              status: 'covered',
              summary: 'Prefers correctness first',
              extracted_facts: ['Correctness > speed'],
              anti_signals: ['No fluff'],
            },
            {
              dimension_id: 'tone',
              status: 'not_started',
            },
          ],
        },
      },
      '0.5.0',
    );

    expect(state.schema_version).toBe('derivation.v1');
    expect(state.dimension_resolutions).toHaveLength(2);
    expect(state.dimension_resolutions[0]).toMatchObject({
      dimension_id: 'focus',
      confidence: 1.5,
      summary: 'Prefers correctness first',
      extracted_facts: ['Correctness > speed'],
      anti_signals: ['No fluff'],
    });
    expect(state.dimension_resolutions[1].confidence).toBe(0);
  });

  it('writes and reads derivation state round-trip', () => {
    const workspacePath = createWorkspace();

    const state = buildDerivationState(
      {
        session_id: 'session-2',
        interview: {
          dimension_coverage: [
            {
              dimension_id: 'style',
              status: 'in_progress',
              confidence: 0.6,
              summary: 'Prefers concise updates',
              extracted_facts: ['Short status updates'],
              anti_signals: [],
            },
          ],
        },
      },
      '0.5.0',
    );
    state.completed_steps.push('constitution');

    writeDerivationState(workspacePath, state);
    const read = readDerivationState(workspacePath);

    expect(read).toBeTruthy();
    expect(read?.session_id).toBe('session-2');
    expect(read?.completed_steps).toEqual(['constitution']);
    expect(read?.dimension_resolutions[0].confidence).toBe(0.6);

    rmSync(workspacePath, { recursive: true, force: true });
  });

  it('supports resume checks for partial and complete compilations', () => {
    const workspacePath = createWorkspace();

    const partial = buildDerivationState({ session_id: 'session-3' }, '0.5.0');
    partial.completed_steps = ['constitution', 'guardrails'];
    writeDerivationState(workspacePath, partial);
    expect(canResume(workspacePath)).toBe(true);

    const complete = buildDerivationState({ session_id: 'session-4' }, '0.5.0');
    complete.completed_steps = ['constitution', 'guardrails', 'memory', 'skills', 'playbooks'];
    writeDerivationState(workspacePath, complete);
    expect(canResume(workspacePath)).toBe(false);

    rmSync(workspacePath, { recursive: true, force: true });
  });

  it('returns null for corrupt derivation state', () => {
    const workspacePath = createWorkspace();
    const opsPath = join(workspacePath, 'ops');
    mkdirSync(opsPath, { recursive: true });
    writeFileSync(join(opsPath, 'derivation.v1.yaml'), 'not: [valid: yaml', 'utf-8');

    expect(readDerivationState(workspacePath)).toBeNull();

    rmSync(workspacePath, { recursive: true, force: true });
  });
});
