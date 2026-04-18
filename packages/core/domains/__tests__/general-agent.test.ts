import { describe, expect, it } from 'vitest';
import { getDomainById, getDomainRubric, listDomains } from '../index.js';

describe('general-agent domain registry', () => {
  it('lists general-agent as an available domain with rubric coverage', () => {
    const domains = listDomains();
    const general = domains.find(d => d.id === 'general-agent');

    expect(domains).toHaveLength(6);
    expect(general).toBeDefined();
    expect(general?.name).toBe('General Agent');
    expect(general?.has_rubric).toBe(true);
    expect(domains.some(d => d.id === 'content-agent')).toBe(true);
    expect(domains.some(d => d.id === 'research-agent')).toBe(true);
    expect(domains.some(d => d.id === 'sales-agent')).toBe(true);
    expect(domains.some(d => d.id === 'support-agent')).toBe(true);
  });

  it('exposes a rubric with expected dimensional coverage', () => {
    const domain = getDomainById('general-agent');
    const rubric = getDomainRubric('general-agent');

    expect(domain).toBeDefined();
    expect(rubric).toBeDefined();
    expect(rubric?.dimensions.length).toBe(18);
    expect(rubric?.dimensions.some(d => d.id === 'mission_scope')).toBe(true);
    expect(rubric?.dimensions.some(d => d.id === 'governance_auditability')).toBe(true);
  });
});
