import { describe, expect, it } from 'vitest';
import { getDomainById, getDomainRubric, listDomains } from '../index.js';

describe('content-agent domain', () => {
  it('registers content-agent as a first-class domain with rubric coverage', () => {
    const domains = listDomains();
    const domain = getDomainById('content-agent');
    const listed = domains.find(d => d.id === 'content-agent');

    expect(domain).toBeDefined();
    expect(domain?.name).toBe('Content Agent');
    expect(domain?.recommended_tools).toContain('web-search');
    expect(listed?.has_rubric).toBe(true);
    expect(listed?.is_stub).toBe(false);
  });

  it('exposes content-specific interview dimensions', () => {
    const rubric = getDomainRubric('content-agent');

    expect(rubric).toBeDefined();
    expect(rubric?.dimensions.length).toBeGreaterThanOrEqual(10);
    expect(rubric?.dimensions.some(d => d.id === 'brand_voice')).toBe(true);
    expect(rubric?.dimensions.some(d => d.id === 'evidence_and_claims')).toBe(true);
    expect(rubric?.dimensions.some(d => d.id === 'anti_generic_standards')).toBe(true);
  });
});
