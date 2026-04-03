/**
 * Generator Types
 *
 * Shared context and block interface for CLAUDE.md generation.
 */

import type { ConstitutionV1 } from '../schemas/constitution.js';
import type { GuardrailsV1 } from '../schemas/guardrails.js';
import type { MemoryV1 } from '../schemas/memory.js';
import type { BindingsV1 } from '../schemas/bindings.js';
import type { SkillsManifestV1 } from '../schemas/skills.js';

/**
 * Vocabulary map for domain-specific terminology in generated output.
 */
export interface VocabularyMap {
  principles_heading?: string;
  guardrails_heading?: string;
  skills_heading?: string;
  constitution_label?: string;
  skill_label?: string;
  playbook_label?: string;
  compile_verb?: string;
  drift_verb?: string;
  custom?: Record<string, string>;
}

/**
 * All compiled artifacts + config needed to generate a CLAUDE.md.
 */
export interface GeneratorContext {
  /** TasteKit version */
  generator_version: string;

  /** Compiled constitution (principles, tone, tradeoffs) */
  constitution?: ConstitutionV1;

  /** Compiled guardrails (permissions, approvals, rate limits) */
  guardrails?: GuardrailsV1;

  /** Compiled memory policy */
  memory?: MemoryV1;

  /** MCP bindings */
  bindings?: BindingsV1;

  /** Skills manifest */
  skills?: SkillsManifestV1;

  /** Domain ID (e.g., 'general-agent') */
  domain_id?: string;

  /** Domain-specific vocabulary */
  vocabulary?: VocabularyMap;

  /** Whether playbooks were compiled */
  has_playbooks?: boolean;

  /** Whether an eval pack exists */
  has_evalpack?: boolean;
}

/**
 * A generator block is a pure function that produces a markdown section
 * or null if not applicable.
 */
export type GeneratorBlock = (ctx: GeneratorContext) => string | null;
