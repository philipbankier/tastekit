import { describe, expect, it } from 'vitest';
import { getDomainById, getDomainRubric, listDomains } from '../index.js';

describe('support-agent domain', () => {
  it('registers support-agent with rubric coverage', () => {
    const domain = getDomainById('support-agent');
    const rubric = getDomainRubric('support-agent');
    const listed = listDomains().find(d => d.id === 'support-agent');

    expect(domain).toBeDefined();
    expect(domain?.name).toBe('Support Agent');
    expect(domain?.recommended_tools).toContain('ticketing-system');
    expect(domain?.vocabulary?.drift_verb).toBe('Service drift');
    expect(rubric).toBeDefined();
    expect(rubric?.dimensions.length).toBeGreaterThanOrEqual(16);
    expect(rubric?.dimensions.some(d => d.id === 'response_tone')).toBe(true);
    expect(rubric?.dimensions.some(d => d.id === 'troubleshooting_methodology')).toBe(true);
    expect(listed?.has_rubric).toBe(true);
  });
});
