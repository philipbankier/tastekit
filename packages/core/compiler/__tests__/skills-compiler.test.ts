import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { compileSkills } from '../skills-compiler.js';
import { SkillsManifestV1Schema } from '../../schemas/skills.js';
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
    tone: { voice_keywords: ['professional'], forbidden_phrases: ['lol'], formatting_rules: [] },
    tradeoffs: { accuracy_vs_speed: 0.7, cost_sensitivity: 0.5, autonomy_level: 0.5 },
    evidence_policy: { require_citations_for: ['facts'], uncertainty_language_rules: [] },
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
  tempDir = mkdtempSync(join(tmpdir(), 'tastekit-skills-test-'));
  ensureDir(join(tempDir, '.tastekit', 'skills'));
  ensureDir(join(tempDir, '.tastekit', 'playbooks'));
  ensureDir(join(tempDir, '.tastekit', 'traces'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('compileSkills', () => {
  it('generates manifest for general-agent domain', async () => {
    const artifacts = await compileSkills({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession('general-agent'),
      constitution: makeConstitution(),
    });

    expect(artifacts).toContain('skills/manifest.v1.yaml');
    const manifestPath = join(tempDir, '.tastekit', 'skills', 'manifest.v1.yaml');
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = parseYAML(readFileSync(manifestPath, 'utf-8'));
    expect(SkillsManifestV1Schema.safeParse(manifest).success).toBe(true);
    expect(manifest.skills.length).toBeGreaterThan(0);
  });

  it('generates manifest for development-agent domain', async () => {
    const artifacts = await compileSkills({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession('development-agent'),
      constitution: makeConstitution(),
    });

    expect(artifacts).toContain('skills/manifest.v1.yaml');
    const manifestPath = join(tempDir, '.tastekit', 'skills', 'manifest.v1.yaml');
    const manifest = parseYAML(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.skills.length).toBeGreaterThan(0);
  });

  it('writes SKILL.md files for each domain skill', async () => {
    await compileSkills({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession('development-agent'),
      constitution: makeConstitution(),
    });

    const manifestPath = join(tempDir, '.tastekit', 'skills', 'manifest.v1.yaml');
    const manifest = parseYAML(readFileSync(manifestPath, 'utf-8'));

    for (const skill of manifest.skills) {
      const skillMdPath = join(tempDir, '.tastekit', 'skills', skill.skill_id, 'SKILL.md');
      expect(existsSync(skillMdPath)).toBe(true);
      const content = readFileSync(skillMdPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('generates generic skill when no domain specified', async () => {
    const artifacts = await compileSkills({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession(''),
      constitution: makeConstitution(),
    });

    const manifestPath = join(tempDir, '.tastekit', 'skills', 'manifest.v1.yaml');
    const manifest = parseYAML(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.skills.length).toBe(1);
    expect(manifest.skills[0].skill_id).toBe('general-task');
  });

  it('generic skill includes constitution principles', async () => {
    await compileSkills({
      workspacePath: join(tempDir, '.tastekit'),
      session: makeSession(''),
      constitution: makeConstitution(),
    });

    const skillMdPath = join(tempDir, '.tastekit', 'skills', 'general-task', 'SKILL.md');
    const content = readFileSync(skillMdPath, 'utf-8');
    expect(content).toContain('Be thorough');
    expect(content).toContain('professional');
  });
});
