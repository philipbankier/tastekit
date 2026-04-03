import { join } from 'path';
import { SessionState } from '../schemas/workspace.js';
import { atomicWrite } from '../utils/filesystem.js';
import { ensureDir, resolvePlaybooksPath, resolveSkillsPath } from '../utils/filesystem.js';
import { stringifyYAML } from '../utils/yaml.js';
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
    const { readFileSync, existsSync } = await import('fs');

    if (existsSync(constitutionPath)) {
      constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
      const soulMd = generateSoulMd({
        generator_version: generatorVersion,
        constitution: constitution as any,
        domain_id: session.domain_id,
      });
      atomicWrite(join(workspacePath, '..', 'SOUL.md'), soulMd);
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
        constitution: constitution as any,
        domain_id: session.domain_id,
      });
      atomicWrite(join(workspacePath, '..', 'AGENTS.md'), agentsMd);
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
