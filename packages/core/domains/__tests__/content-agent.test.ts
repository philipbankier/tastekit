import { describe, expect, it } from 'vitest';
import { getDomainById, getDomainRubric, listDomains } from '../index.js';

describe('content-agent domain', () => {
  it('registers content-agent with rubric coverage', () => {
    const domain = getDomainById('content-agent');
    const rubric = getDomainRubric('content-agent');
    const listed = listDomains().find(d => d.id === 'content-agent');

    expect(domain).toBeDefined();
    expect(domain?.name).toBe('Content Agent');
    expect(domain?.recommended_tools).toContain('web-search');
    expect(domain?.vocabulary?.drift_verb).toBe('Voice drift');
    expect(rubric).toBeDefined();
    expect(rubric?.dimensions.length).toBeGreaterThanOrEqual(16);
    expect(rubric?.dimensions.some(d => d.id === 'brand_voice')).toBe(true);
    expect(rubric?.dimensions.some(d => d.id === 'content_workflow')).toBe(true);
    expect(listed?.has_rubric).toBe(true);
  });
});
