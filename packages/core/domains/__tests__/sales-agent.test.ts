import { describe, expect, it } from 'vitest';
import { getDomainById, getDomainRubric, listDomains } from '../index.js';

describe('sales-agent domain', () => {
  it('registers sales-agent with rubric coverage', () => {
    const domain = getDomainById('sales-agent');
    const rubric = getDomainRubric('sales-agent');
    const listed = listDomains().find(d => d.id === 'sales-agent');

    expect(domain).toBeDefined();
    expect(domain?.name).toBe('Sales Agent');
    expect(domain?.recommended_tools).toContain('crm');
    expect(domain?.vocabulary?.drift_verb).toBe('Pipeline drift');
    expect(rubric).toBeDefined();
    expect(rubric?.dimensions.length).toBeGreaterThanOrEqual(16);
    expect(rubric?.dimensions.some(d => d.id === 'outreach_style')).toBe(true);
    expect(rubric?.dimensions.some(d => d.id === 'pipeline_management')).toBe(true);
    expect(listed?.has_rubric).toBe(true);
  });
});
