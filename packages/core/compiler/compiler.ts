import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { SessionState } from '../schemas/workspace.js';
import { ConstitutionV1, ConstitutionV1Schema } from '../schemas/constitution.js';
import { atomicWrite } from '../utils/filesystem.js';
import { ensureDir, resolvePlaybooksPath, resolveSkillsPath } from '../utils/filesystem.js';
import { stringifyYAML } from '../utils/yaml.js';
import { mergeManagedRegion } from '../generators/managed-region.js';
import { compileConstitution } from './constitution-compiler.js';
import { compileGuardrails } from './guardrails-compiler.js';
import { compileMemoryPolicy } from './memory-compiler.js';
import { compileSkills } from './skills-compiler.js';
import { compilePlaybooks } from './playbook-compiler.js';
import {
  DerivationState,
  readDerivationState,
  writeDerivationState,
  buildDerivationState,
} from './derivation.js';

/**
 * Main compiler orchestrator
 *
 * Step-tracked with derivation state for context resilience.
 * Writes derivation.v1.yaml FIRST, then compiles each artifact
 * and persists progress after each step. Supports --resume.
 */

export interface CompilationOptions {
  workspacePath: string;
  session: SessionState;
  generatorVersion: string;
  /** If true, resume from existing derivation state */
  resume?: boolean;
}

export interface CompilationResult {
  success: boolean;
  artifacts: string[];
  errors?: string[];
  /** Whether this was a resumed compilation */
  resumed?: boolean;
}

/** All compiler step IDs in execution order */
const ALL_STEPS = ['constitution', 'guardrails', 'memory', 'skills', 'playbooks'] as const;

/**
 * Steps that consume `constitution.v1.json` and must rerun if the constitution
 * is invalidated on resume. Order does not matter (the main loop re-iterates
 * `ALL_STEPS` and runs whichever are missing from `completed_steps`).
 */
const STEPS_DEPENDENT_ON_CONSTITUTION = ['constitution', 'skills', 'playbooks'];

function readCachedConstitution(constitutionPath: string): ConstitutionV1 | null {
  try {
    const data = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
    const parsed = ConstitutionV1Schema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function refreshCachedConstitutionVersion(constitutionPath: string, constitution: ConstitutionV1, generatorVersion: string): void {
  if (constitution.generator_version === generatorVersion) return;
  atomicWrite(
    constitutionPath,
    JSON.stringify({ ...constitution, generator_version: generatorVersion }, null, 2),
  );
}

function shouldRegenerateStaleConstitution(session: SessionState): boolean {
  return !!session.structured_answers && !!session.interview?.metacognition;
}

function mergeMarkdownArtifact(path: string, generated: string): string {
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : undefined;
  return mergeManagedRegion(existing, generated);
}

export async function compile(options: CompilationOptions): Promise<CompilationResult> {
  const { workspacePath, session, generatorVersion, resume } = options;
  ensureDir(workspacePath);
  ensureDir(resolveSkillsPath(workspacePath));
  ensureDir(resolvePlaybooksPath(workspacePath));

  // Step 0: Build or read derivation state
  let derivation: DerivationState;
  let resumed = false;

  if (resume) {
    const existing = readDerivationState(workspacePath);
    if (existing && existing.completed_steps.length > 0) {
      derivation = existing;
      resumed = true;
    } else {
      derivation = buildDerivationState(session, generatorVersion);
      writeDerivationState(workspacePath, derivation);
    }
  } else {
    derivation = buildDerivationState(session, generatorVersion);
    writeDerivationState(workspacePath, derivation);
  }

  // Resume safety: invalidate the cached `constitution` step if the on-disk
  // artifact fails the locked schema. Otherwise downstream steps (skills,
  // playbooks, SOUL.md, AGENTS.md) would consume an out-of-spec file.
  // When invalidating constitution, also invalidate every step that consumes
  // it, so downstream artifacts get regenerated against the new constitution.
  if (derivation.completed_steps.includes('constitution')) {
    const constitutionPath = join(workspacePath, 'constitution.v1.json');
    const cachedConstitution = existsSync(constitutionPath)
      ? readCachedConstitution(constitutionPath)
      : null;
    if (!cachedConstitution) {
      derivation.completed_steps = derivation.completed_steps.filter(
        s => !STEPS_DEPENDENT_ON_CONSTITUTION.includes(s),
      );
      writeDerivationState(workspacePath, derivation);
    } else if (cachedConstitution.generator_version !== generatorVersion) {
      if (shouldRegenerateStaleConstitution(session)) {
        derivation.completed_steps = derivation.completed_steps.filter(
          s => !STEPS_DEPENDENT_ON_CONSTITUTION.includes(s),
        );
      } else {
        refreshCachedConstitutionVersion(constitutionPath, cachedConstitution, generatorVersion);
        derivation.completed_steps = derivation.completed_steps.filter(
          s => s === 'constitution' || !STEPS_DEPENDENT_ON_CONSTITUTION.includes(s),
        );
      }
      writeDerivationState(workspacePath, derivation);
    }
  }

  // Run each compilation step, skipping already-completed ones
  for (const stepId of ALL_STEPS) {
    if (derivation.completed_steps.includes(stepId)) continue;

    try {
      const artifacts = await runStep(stepId, workspacePath, session, generatorVersion);
      derivation.completed_steps.push(stepId);
      derivation.artifacts_written.push(...artifacts);
      writeDerivationState(workspacePath, derivation);
    } catch (error) {
      // Derivation state is already persisted — can resume from here
      return {
        success: false,
        artifacts: derivation.artifacts_written,
        errors: [error instanceof Error ? error.message : String(error)],
        resumed,
      };
    }
  }

  let constitution: unknown;

  // Generate SOUL.md
  try {
    const { generateSoulMd } = await import('../generators/soul-md-generator.js');
    const constitutionPath = join(workspacePath, 'constitution.v1.json');

    if (existsSync(constitutionPath)) {
      constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
      const soulMd = generateSoulMd({
        generator_version: generatorVersion,
        constitution: constitution as ConstitutionV1,
        domain_id: session.domain_id,
      });
      const soulPath = join(workspacePath, '..', 'SOUL.md');
      atomicWrite(soulPath, mergeMarkdownArtifact(soulPath, soulMd));
      if (!derivation.artifacts_written.includes('SOUL.md')) {
        derivation.artifacts_written.push('SOUL.md');
      }
    }
  } catch {
    // Non-fatal
  }

  // Generate AGENTS.md
  try {
    if (constitution) {
      const { generateAgentsMd } = await import('../generators/agents-md-generator.js');
      const agentsMd = generateAgentsMd({
        generator_version: generatorVersion,
        constitution: constitution as ConstitutionV1,
        domain_id: session.domain_id,
      });
      const agentsPath = join(workspacePath, '..', 'AGENTS.md');
      atomicWrite(agentsPath, mergeMarkdownArtifact(agentsPath, agentsMd));
      if (!derivation.artifacts_written.includes('AGENTS.md')) {
        derivation.artifacts_written.push('AGENTS.md');
      }
    }
  } catch {
    // Non-fatal
  }

  writeDerivationState(workspacePath, derivation);

  return {
    success: true,
    artifacts: derivation.artifacts_written,
    resumed,
  };
}

/**
 * Run a single compilation step.
 * Returns the list of artifact paths written.
 */
async function runStep(
  stepId: string,
  workspacePath: string,
  session: SessionState,
  generatorVersion: string,
): Promise<string[]> {
  switch (stepId) {
    case 'constitution': {
      const constitution = compileConstitution(session, generatorVersion);
      const path = join(workspacePath, 'constitution.v1.json');
      atomicWrite(path, JSON.stringify(constitution, null, 2));
      return ['constitution.v1.json'];
    }

    case 'guardrails': {
      const guardrails = compileGuardrails(session);
      const path = join(workspacePath, 'guardrails.v1.yaml');
      atomicWrite(path, stringifyYAML(guardrails));
      return ['guardrails.v1.yaml'];
    }

    case 'memory': {
      const memory = compileMemoryPolicy(session);
      const path = join(workspacePath, 'memory.v1.yaml');
      atomicWrite(path, stringifyYAML(memory));
      return ['memory.v1.yaml'];
    }

    case 'skills': {
      const constitutionPath = join(workspacePath, 'constitution.v1.json');
      const { readFileSync } = await import('fs');
      const constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));

      const skillArtifacts = await compileSkills({
        workspacePath,
        session,
        constitution,
      });
      return skillArtifacts;
    }

    case 'playbooks': {
      const constitutionPath = join(workspacePath, 'constitution.v1.json');
      const { readFileSync } = await import('fs');
      const constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));

      const playbookArtifacts = await compilePlaybooks({
        workspacePath,
        session,
        constitution,
      });
      return playbookArtifacts;
    }

    default:
      return [];
  }
}
