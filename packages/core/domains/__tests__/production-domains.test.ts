import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { compileSkills } from '../../compiler/skills-compiler.js';
import { getDimensionsForDepth } from '../../interview/universal-rubric.js';
import type { ConstitutionV1 } from '../../schemas/constitution.js';
import type { SessionState } from '../../schemas/workspace.js';
import { parseYAML } from '../../utils/yaml.js';
import { getDomainById, getDomainRubric, listDomains } from '../index.js';

const PRODUCTION_DOMAIN_IDS = [
  'development-agent',
  'general-agent',
  'content-agent',
  'research-agent',
  'sales-agent',
  'support-agent',
] as const;

const RECOVERED_DOMAIN_SKILLS = {
  'research-agent': ['web-research', 'competitive-analysis'],
  'sales-agent': ['lead-qualification', 'outreach-email'],
  'support-agent': ['ticket-triage', 'response-draft'],
} as const;

const RECOVERED_DOMAIN_IDS = Object.keys(RECOVERED_DOMAIN_SKILLS);

function duplicateIds(ids: string[]): string[] {
  return [...new Set(ids)].filter(id => ids.indexOf(id) !== ids.lastIndexOf(id));
}

function makeConstitution(): ConstitutionV1 {
  return {
    schema_version: 'constitution.v1',
    generated_at: '2026-01-15T10:00:00.000Z',
    generator_version: '1.0.0',
    user_scope: 'single_user',
    principles: [
      { id: 'p1', priority: 1, statement: 'Be thorough', rationale: 'Core', applies_to: ['*'] },
    ],
    tone: { voice_keywords: ['professional'], forbidden_phrases: [], formatting_rules: [] },
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

describe('first-class domain registry', () => {
  it('registers all six first-class domains', () => {
    expect(listDomains().map(domain => domain.id).sort()).toEqual([...PRODUCTION_DOMAIN_IDS].sort());
  });

  it('exposes non-stub definitions and rubrics for every first-class domain', () => {
    for (const domainId of PRODUCTION_DOMAIN_IDS) {
      const domain = getDomainById(domainId);
      const listed = listDomains().find(item => item.id === domainId);
      const rubric = getDomainRubric(domainId);

      expect(domain, domainId).toBeDefined();
      expect(domain!.version, domainId).not.toContain('stub');
      expect(domain!.description, domainId).toBeTruthy();
      expect(domain!.use_cases.length, domainId).toBeGreaterThan(0);
      expect(domain!.recommended_tools.length, domainId).toBeGreaterThan(0);

      expect(listed, domainId).toBeDefined();
      expect(listed!.has_rubric, domainId).toBe(true);
      expect(listed!.is_stub, domainId).toBe(false);

      expect(rubric, domainId).toBeDefined();
      expect(rubric!.domain_id).toBe(domainId);
      expect(rubric!.version, domainId).not.toContain('stub');
      expect(rubric!.dimensions.length, domainId).toBeGreaterThan(0);

      if (RECOVERED_DOMAIN_IDS.includes(domainId)) {
        expect(domain!.version, domainId).toBe('0.2.0');
        expect(rubric!.version, domainId).toBe('0.2.0');
      }
    }
  });

  it('provides complete rubric fields for skill generation', () => {
    for (const domainId of PRODUCTION_DOMAIN_IDS) {
      const rubric = getDomainRubric(domainId);
      expect(rubric, domainId).toBeDefined();

      for (const dimension of rubric!.dimensions) {
        expect(dimension.id, `${domainId}:${dimension.id}`).toBeTruthy();
        expect(dimension.name, `${domainId}:${dimension.id}`).toBeTruthy();
        expect(dimension.description, `${domainId}:${dimension.id}`).toBeTruthy();
        expect(dimension.maps_to.length, `${domainId}:${dimension.id}`).toBeGreaterThan(0);
        expect(dimension.depth_tiers.length, `${domainId}:${dimension.id}`).toBeGreaterThan(0);
        expect(dimension.priority, `${domainId}:${dimension.id}`).toBeTruthy();
        expect(dimension.question_budget, `${domainId}:${dimension.id}`).toBeDefined();
        expect(dimension.exploration_hints.length, `${domainId}:${dimension.id}`).toBeGreaterThan(0);
        expect(dimension.coverage_criteria.length, `${domainId}:${dimension.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('has complete quick/guided/operator depth ladders without duplicate merged IDs', () => {
    for (const domainId of PRODUCTION_DOMAIN_IDS) {
      const rubric = getDomainRubric(domainId);
      expect(rubric, domainId).toBeDefined();

      const quick = getDimensionsForDepth(rubric!, 'quick');
      const guided = getDimensionsForDepth(rubric!, 'guided');
      const operator = getDimensionsForDepth(rubric!, 'operator');

      expect(quick.length, `${domainId}:quick`).toBeGreaterThan(0);
      expect(guided.length, `${domainId}:guided`).toBeGreaterThan(quick.length);
      expect(operator.length, `${domainId}:operator`).toBeGreaterThan(guided.length);

      for (const [depth, dimensions] of [
        ['quick', quick],
        ['guided', guided],
        ['operator', operator],
      ] as const) {
        expect(duplicateIds(dimensions.map(dimension => dimension.id)), `${domainId}:${depth}`).toEqual([]);
      }
    }
  });
});

describe('recovered first-class domain skills', () => {
  it('exports the historical research, sales, and support skill sets', async () => {
    const modules = {
      'research-agent': await import('../research-agent/skills/index.js'),
      'sales-agent': await import('../sales-agent/skills/index.js'),
      'support-agent': await import('../support-agent/skills/index.js'),
    };

    for (const [domainId, expectedSkillIds] of Object.entries(RECOVERED_DOMAIN_SKILLS)) {
      const exportName = `${domainId
        .split('-')
        .map(part => `${part[0]!.toUpperCase()}${part.slice(1)}`)
        .join('')}Skills`;
      const skills = modules[domainId as keyof typeof modules][exportName] as Array<{
        skill_id: string;
        name: string;
        description: string;
        risk_level: string;
        required_tools: string[];
        skill_md_content: string;
      }>;

      expect(skills, domainId).toBeDefined();
      expect(skills.map(skill => skill.skill_id).sort(), domainId).toEqual([...expectedSkillIds].sort());

      for (const skill of skills) {
        expect(skill.name, skill.skill_id).toBeTruthy();
        expect(skill.description, skill.skill_id).toBeTruthy();
        expect(skill.risk_level, skill.skill_id).toBeTruthy();
        expect(Array.isArray(skill.required_tools), skill.skill_id).toBe(true);
        expect(skill.skill_md_content, skill.skill_id).toContain('## Purpose');
      }
    }
  });

  it('compiles recovered domain skills instead of generic fallback skills', async () => {
    for (const [domainId, expectedSkillIds] of Object.entries(RECOVERED_DOMAIN_SKILLS)) {
      const tempDir = mkdtempSync(join(tmpdir(), 'tastekit-recovered-skills-'));

      try {
        await compileSkills({
          workspacePath: tempDir,
          session: makeSession(domainId),
          constitution: makeConstitution(),
        });

        const manifest = parseYAML(readFileSync(join(tempDir, 'skills', 'manifest.v1.yaml'), 'utf-8')) as {
          skills: Array<{ skill_id: string }>;
        };
        expect(manifest.skills.map(skill => skill.skill_id).sort(), domainId).toEqual([...expectedSkillIds].sort());
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
