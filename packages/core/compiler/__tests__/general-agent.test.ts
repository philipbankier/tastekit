import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import YAML from 'yaml';
import { compilePlaybooks } from '../playbook-compiler.js';
import { compileSkills } from '../skills-compiler.js';
import { ConstitutionV1 } from '../../schemas/constitution.js';
import { SessionState } from '../../schemas/workspace.js';

function makeWorkspacePath(): string {
  return mkdtempSync(join(tmpdir(), 'tastekit-general-agent-'));
}

function makeSession(): SessionState {
  return {
    session_id: 'general-agent-test-session',
    started_at: '2026-02-22T00:00:00.000Z',
    last_updated_at: '2026-02-22T00:00:00.000Z',
    depth: 'guided',
    current_step: 'complete',
    completed_steps: ['welcome', 'interview'],
    answers: {},
    domain_id: 'general-agent',
  };
}

function makeConstitution(): ConstitutionV1 {
  return {
    schema_version: 'constitution.v1',
    generated_at: '2026-02-22T00:00:00.000Z',
    generator_version: '0.5.0',
    user_scope: 'single_user',
    principles: [
      {
        id: 'principle_1',
        priority: 1,
        statement: 'Prefer clear, verifiable progress over speculative output.',
        rationale: 'Operational reliability matters most.',
        applies_to: ['*'],
      },
    ],
    tone: {
      voice_keywords: ['direct', 'concise'],
      forbidden_phrases: [],
      formatting_rules: ['Use explicit checklists for execution summaries.'],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.65,
      cost_sensitivity: 0.4,
      autonomy_level: 0.6,
    },
    evidence_policy: {
      require_citations_for: ['facts', 'claims'],
      uncertainty_language_rules: ['Use explicit confidence language for uncertain claims.'],
    },
    taboos: {
      never_do: ['Take irreversible actions without explicit approval.'],
      must_escalate: ['Legal, financial, and security-sensitive actions.'],
    },
    trace_map: {},
  };
}

describe('general-agent compilation outputs', () => {
  it('compiles dedicated general-agent skills with graph metadata', async () => {
    const workspacePath = makeWorkspacePath();

    try {
      const artifacts = await compileSkills({
        workspacePath,
        session: makeSession(),
        constitution: makeConstitution(),
      });

      expect(artifacts).toContain('skills/manifest.v1.yaml');

      const manifestPath = join(workspacePath, 'skills', 'manifest.v1.yaml');
      expect(existsSync(manifestPath)).toBe(true);

      const manifest = YAML.parse(readFileSync(manifestPath, 'utf-8')) as {
        skills: Array<{ skill_id: string; prerequisites?: string[]; feeds_into?: string[] }>;
      };

      const ids = manifest.skills.map(s => s.skill_id).sort();
      expect(ids).toEqual(['context-synthesis', 'task-orchestration']);

      const orchestration = manifest.skills.find(s => s.skill_id === 'task-orchestration');
      expect(orchestration?.prerequisites).toContain('context-synthesis');

      const synthesis = manifest.skills.find(s => s.skill_id === 'context-synthesis');
      expect(synthesis?.feeds_into).toContain('task-orchestration');
    } finally {
      rmSync(workspacePath, { recursive: true, force: true });
    }
  });

  it('compiles dedicated general-agent playbooks', async () => {
    const workspacePath = makeWorkspacePath();

    try {
      const artifacts = await compilePlaybooks({
        workspacePath,
        session: makeSession(),
        constitution: makeConstitution(),
      });

      expect(artifacts).toContain('playbooks/general-task-execution.v1.yaml');
      expect(artifacts).toContain('playbooks/research-then-act.v1.yaml');

      const playbooksPath = join(workspacePath, 'playbooks');
      const taskExecutionPath = join(playbooksPath, 'general-task-execution.v1.yaml');
      const researchThenActPath = join(playbooksPath, 'research-then-act.v1.yaml');

      expect(existsSync(taskExecutionPath)).toBe(true);
      expect(existsSync(researchThenActPath)).toBe(true);

      const taskExecution = YAML.parse(readFileSync(taskExecutionPath, 'utf-8')) as { id: string; steps: Array<{ step_id: string }> };
      const researchThenAct = YAML.parse(readFileSync(researchThenActPath, 'utf-8')) as { id: string; steps: Array<{ step_id: string }> };

      expect(taskExecution.id).toBe('general-task-execution');
      expect(taskExecution.steps.map(s => s.step_id)).toContain('execute-work');

      expect(researchThenAct.id).toBe('research-then-act');
      expect(researchThenAct.steps.map(s => s.step_id)).toContain('capture-context');
    } finally {
      rmSync(workspacePath, { recursive: true, force: true });
    }
  });
});
