import { describe, expect, it } from 'vitest';
import { getDimensionsForDepth } from '../../interview/universal-rubric.js';
import { getDomainRubric, listDomains } from '../index.js';

function idsFor(domainId: string, depth: 'quick' | 'guided' | 'operator') {
  const rubric = getDomainRubric(domainId);
  if (!rubric) throw new Error(`Missing rubric for ${domainId}`);
  return getDimensionsForDepth(rubric, depth).map(d => d.id);
}

function expectNoDuplicateIds(ids: string[]) {
  const duplicates = [...new Set(ids)].filter(id => ids.indexOf(id) !== ids.lastIndexOf(id));
  expect(duplicates).toEqual([]);
}

describe('domain rubric depth composition', () => {
  it('never duplicates dimension ids after universal dimensions are merged', () => {
    for (const domain of listDomains()) {
      for (const depth of ['quick', 'guided', 'operator'] as const) {
        expectNoDuplicateIds(idsFor(domain.id, depth));
      }
    }
  });

  it('ships the complete development-agent depth ladder', () => {
    expect(idsFor('development-agent', 'quick')).toHaveLength(9);
    expect(idsFor('development-agent', 'guided')).toHaveLength(22);
    expect(idsFor('development-agent', 'operator')).toHaveLength(31);
  });

  it('uses guided as the balanced default tier while keeping full operator composition available', () => {
    const guided = idsFor('development-agent', 'guided');
    const full = idsFor('development-agent', 'operator');

    expect(guided).toContain('testing_output_expectations');
    expect(guided).not.toContain('incident_response');
    expect(full).toContain('incident_response');
    expect(full.length).toBeGreaterThan(guided.length);
  });
});
