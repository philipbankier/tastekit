import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { compilePlaybooks } from '../playbook-compiler.js';
import { PlaybookV1Schema } from '../../schemas/playbook.js';
import { SessionState } from '../../schemas/workspace.js';
import { ConstitutionV1 } from '../../schemas/constitution.js';
import { parseYAML } from '../../utils/yaml.js';
import { ensureDir } from '../../utils/filesystem.js';

function makeConstitution(): ConstitutionV1 {
  return {
    schema_version: 'constitution.v1',
    generated_at: '2026-01-15T10:00:00.000Z',
    generator_version: '0.5.0',
    user_scope: 'single_user',
    principles: [
      { id: 'p1', priority: 1, statement: 'Be thorough', rationale: 'Core', applies_to: ['*'] },
    ],
    tone: { voice_keywords: ['professional'], forbidden_phrases: [], formatting_rules: [] },
    tradeoffs: { accuracy_vs_speed: 0.7, cost_sensitivity: 0.5, autonomy_level: 0.5 },
    evidence_policy: { require_citations_for: [], uncertainty_language_rules: [] },
    taboos: { never_do: [], must_escalate: [] },
    trace_map: {},
  };
}

function makeSession(domainId: string): SessionState {
  return {
    session_id: 'test',
    started_at: '2026-01-15T10:00:00.000Z',
    last_updated_at: '2026-01-15T10:00:00.000Z',
    depth: 'guided',
    current_step: 'done',
    completed_steps: [],
    answers: {},
    domain_id: domainId,
  };
}

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'tastekit-playbook-test-'));
  ensureDir(join(tempDir, '.tastekit', 'skills'));
  ensureDir(join(tempDir, '.tastekit', 'playbooks'));
  ensureDir(join(tempDir, '.tastekit', 'traces'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('compilePlaybooks', () => {
  it('generates playbook files for content-agent', async () => {
    const artifacts = await compilePlaybooks({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession('content-agent'),
      constitution: makeConstitution(),
    });

    expect(artifacts.length).toBeGreaterThan(0);
    for (const artifactPath of artifacts) {
      expect(artifactPath).toMatch(/playbooks\/.+\.v1\.yaml$/);
    }
  });

  it('playbook files validate against schema', async () => {
    const artifacts = await compilePlaybooks({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession('content-agent'),
      constitution: makeConstitution(),
    });

    for (const artifactPath of artifacts) {
      const fullPath = join(tempDir, '.tastekit', artifactPath);
      expect(existsSync(fullPath)).toBe(true);
      const content = parseYAML(readFileSync(fullPath, 'utf-8'));
      const result = PlaybookV1Schema.safeParse(content);
      expect(result.success).toBe(true);
    }
  });

  it('generates playbooks for sales-agent', async () => {
    const artifacts = await compilePlaybooks({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession('sales-agent'),
      constitution: makeConstitution(),
    });

    expect(artifacts.length).toBeGreaterThan(0);
  });

  it('generates playbooks for research-agent', async () => {
    const artifacts = await compilePlaybooks({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession('research-agent'),
      constitution: makeConstitution(),
    });

    expect(artifacts.length).toBeGreaterThan(0);
  });

  it('generates generic playbook when no domain specified', async () => {
    const artifacts = await compilePlaybooks({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession(''),
      constitution: makeConstitution(),
    });

    expect(artifacts.length).toBe(1);
    const fullPath = join(tempDir, '.tastekit', artifacts[0]);
    const content = parseYAML(readFileSync(fullPath, 'utf-8'));
    expect(PlaybookV1Schema.safeParse(content).success).toBe(true);
  });

  it('each playbook has steps and stop conditions', async () => {
    const artifacts = await compilePlaybooks({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession('content-agent'),
      constitution: makeConstitution(),
    });

    for (const artifactPath of artifacts) {
      const fullPath = join(tempDir, '.tastekit', artifactPath);
      const playbook = parseYAML(readFileSync(fullPath, 'utf-8'));
      expect(playbook.steps.length).toBeGreaterThan(0);
      expect(playbook.stop_conditions).toBeDefined();
    }
  });
});
