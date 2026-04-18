import { describe, expect, it } from 'vitest';
import { getDomainById, getDomainRubric, listDomains } from '../index.js';

describe('development-agent domain', () => {
  it('getDomainById returns development-agent definition', () => {
    const domain = getDomainById('development-agent');
    expect(domain).toBeDefined();
    expect(domain!.id).toBe('development-agent');
    expect(domain!.name).toBe('Development Agent');
    expect(domain!.description).toBeTruthy();
    expect(domain!.version).toBeTruthy();
  });

  it('development-agent has recommended tools', () => {
    const domain = getDomainById('development-agent');
    expect(domain!.recommended_tools.length).toBeGreaterThan(0);
    expect(domain!.recommended_tools).toContain('git-integration');
  });

  it('development-agent has vocabulary overrides', () => {
    const domain = getDomainById('development-agent');
    expect(domain!.vocabulary).toBeDefined();
    expect(domain!.vocabulary!.drift_verb).toBe('Standards drift');
  });

  it('getDomainRubric returns rubric with dimensions', () => {
    const rubric = getDomainRubric('development-agent');
    expect(rubric).toBeDefined();
    expect(rubric!.dimensions.length).toBeGreaterThan(0);
  });

  it('listDomains includes development-agent with correct metadata', () => {
    const domains = listDomains();
    const devAgent = domains.find(d => d.id === 'development-agent');
    expect(devAgent).toBeDefined();
    expect(devAgent!.has_rubric).toBe(true);
    expect(devAgent!.is_stub).toBe(false);
  });

  it('getDomainById returns undefined for nonexistent domain', () => {
    expect(getDomainById('research-agent')).toBeDefined();
    expect(getDomainById('nonexistent')).toBeUndefined();
  });

  it('getDomainRubric returns undefined for nonexistent domain', () => {
    expect(getDomainRubric('sales-agent')).toBeUndefined();
  });
});
