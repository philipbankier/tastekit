import { describe, expect, it } from 'vitest';
import { getDomainById, getDomainRubric, listDomains } from '../index.js';

describe('research-agent domain', () => {
  it('registers research-agent with rubric coverage', () => {
    const domain = getDomainById('research-agent');
    const rubric = getDomainRubric('research-agent');
    const listed = listDomains().find(d => d.id === 'research-agent');

    expect(domain).toBeDefined();
    expect(domain?.name).toBe('Research Agent');
    expect(domain?.recommended_tools).toContain('web-search');
    expect(domain?.vocabulary?.drift_verb).toBe('Evidence drift');
    expect(rubric).toBeDefined();
    expect(rubric?.dimensions.length).toBeGreaterThanOrEqual(18);
    expect(rubric?.dimensions.some(d => d.id === 'source_reliability')).toBe(true);
    expect(rubric?.dimensions.some(d => d.id === 'reproducibility')).toBe(true);
    expect(listed?.has_rubric).toBe(true);
  });
});
