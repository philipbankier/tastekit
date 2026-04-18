/**
 * TasteKit Domains Registry
 *
 * Central registry of available domains.
 * Ships with general-agent + development-agent.
 */

import { DevelopmentAgentDomain } from './development-agent/domain.js';
import { ContentAgentDomain } from './content-agent/domain.js';
import { GeneralAgentDomain } from './general-agent/domain.js';
import { ResearchAgentDomain } from './research-agent/domain.js';
import { DevelopmentAgentRubric } from './development-agent/rubric.js';
import { ContentAgentRubric } from './content-agent/rubric.js';
import { GeneralAgentRubric } from './general-agent/rubric.js';
import { ResearchAgentRubric } from './research-agent/rubric.js';
import { DomainRubric } from '../interview/rubric.js';

export const AVAILABLE_DOMAINS = [
  ContentAgentDomain,
  DevelopmentAgentDomain,
  GeneralAgentDomain,
  ResearchAgentDomain,
] as const;

const DOMAIN_RUBRICS: Record<string, DomainRubric> = {
  'content-agent': ContentAgentRubric,
  'development-agent': DevelopmentAgentRubric,
  'general-agent': GeneralAgentRubric,
  'research-agent': ResearchAgentRubric,
};

export function getDomainById(id: string) {
  return AVAILABLE_DOMAINS.find(d => d.id === id);
}

export function getDomainRubric(id: string): DomainRubric | undefined {
  return DOMAIN_RUBRICS[id];
}

export function listDomains() {
  return AVAILABLE_DOMAINS.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    version: d.version,
    is_stub: d.version.includes('stub'),
    has_rubric: d.id in DOMAIN_RUBRICS,
  }));
}

export * from './content-agent/index.js';
export * from './development-agent/index.js';
export * from './general-agent/index.js';
export * from './research-agent/index.js';
