import { describe, expect, it } from 'vitest';
import { analyzeSkillGraph, getPipelinePath, recommendNextSkill } from '../graph.js';
import type { SkillsManifestV1 } from '../../schemas/skills.js';

function manifest(skills: SkillsManifestV1['skills']): SkillsManifestV1 {
  return {
    schema_version: 'skills_manifest.v1',
    skills,
  };
}

describe('analyzeSkillGraph', () => {
  it('detects pipelines, hubs, orphans, and missing references', () => {
    const graph = manifest([
      {
        skill_id: 'capture',
        name: 'Capture',
        description: 'Capture data',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
        feeds_into: ['process'],
      },
      {
        skill_id: 'process',
        name: 'Process',
        description: 'Process data',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
        feeds_into: ['publish', 'audit', 'review'],
      },
      {
        skill_id: 'publish',
        name: 'Publish',
        description: 'Publish results',
        tags: [],
        risk_level: 'med',
        required_tools: [],
        compatible_runtimes: ['*'],
      },
      {
        skill_id: 'audit',
        name: 'Audit',
        description: 'Audit quality',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
      },
      {
        skill_id: 'review',
        name: 'Review',
        description: 'Review quality',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
      },
      {
        skill_id: 'orphan',
        name: 'Orphan',
        description: 'No links',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
      },
      {
        skill_id: 'missing',
        name: 'Missing',
        description: 'Missing refs',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
        prerequisites: ['ghost-prereq'],
        alternatives: ['ghost-alt'],
      },
    ]);

    const analysis = analyzeSkillGraph(graph);

    expect(analysis.pipelines.some(p => p.join(' -> ') === 'capture -> process -> publish')).toBe(true);
    expect(analysis.hubs).toContain('process');
    expect(analysis.orphans).toContain('orphan');
    expect(analysis.orphans).toContain('missing');
    expect(analysis.missing_refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ skill_id: 'missing', missing_ref: 'ghost-prereq', relationship: 'prerequisites' }),
        expect.objectContaining({ skill_id: 'missing', missing_ref: 'ghost-alt', relationship: 'alternatives' }),
      ]),
    );
  });

  it('detects cycles in skill relationships', () => {
    const graph = manifest([
      {
        skill_id: 'a',
        name: 'A',
        description: 'A',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
        feeds_into: ['b'],
      },
      {
        skill_id: 'b',
        name: 'B',
        description: 'B',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
        feeds_into: ['c'],
      },
      {
        skill_id: 'c',
        name: 'C',
        description: 'C',
        tags: [],
        risk_level: 'low',
        required_tools: [],
        compatible_runtimes: ['*'],
        feeds_into: ['a'],
      },
    ]);

    const analysis = analyzeSkillGraph(graph);
    expect(analysis.cycles.length).toBeGreaterThan(0);
    expect(analysis.cycles[0]).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });
});

describe('graph helpers', () => {
  const graph = manifest([
    {
      skill_id: 'capture',
      name: 'Capture',
      description: 'Capture data',
      tags: [],
      risk_level: 'low',
      required_tools: [],
      compatible_runtimes: ['*'],
      feeds_into: ['process'],
    },
    {
      skill_id: 'process',
      name: 'Process',
      description: 'Process data',
      tags: [],
      risk_level: 'low',
      required_tools: [],
      compatible_runtimes: ['*'],
      feeds_into: ['publish'],
    },
    {
      skill_id: 'publish',
      name: 'Publish',
      description: 'Publish data',
      tags: [],
      risk_level: 'med',
      required_tools: [],
      compatible_runtimes: ['*'],
      prerequisites: ['process'],
    },
  ]);

  it('builds a linear pipeline path from the first feed', () => {
    expect(getPipelinePath(graph, 'capture')).toEqual(['capture', 'process', 'publish']);
  });

  it('recommends next skills from feeds_into and prerequisites', () => {
    expect(recommendNextSkill(graph, 'process')).toEqual(['publish']);
  });
});
