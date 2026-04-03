import { z } from 'zod';
import { join } from 'path';
import { writeFileSafe, readFileIfExists } from '../utils/filesystem.js';
import { stringifyYAML, parseYAML } from '../utils/yaml.js';

/**
 * Derivation State — Context Resilience Protocol
 *
 * Written as the FIRST step of compilation. Contains a complete snapshot
 * of resolved configuration so any subsequent step can resume statelessly.
 * Inspired by arscontexta's ops/derivation.md pattern.
 */

export const DimensionResolutionSchema = z.object({
  dimension_id: z.string(),
  confidence: z.number().min(0).default(0),
  summary: z.string(),
  extracted_facts: z.array(z.string()),
  anti_signals: z.array(z.string()).default([]),
});

export const DerivationStateSchema = z.object({
  schema_version: z.literal('derivation.v1'),
  created_at: z.string().datetime(),
  session_id: z.string(),
  domain_id: z.string().optional(),
  generator_version: z.string(),

  /** Resolved interview signals (from interviewer) */
  dimension_resolutions: z.array(DimensionResolutionSchema),

  /** The structured answers that feed the compiler */
  structured_answers: z.any().optional(),

  /** Compilation progress tracking */
  completed_steps: z.array(z.string()),

  /** Artifacts written so far */
  artifacts_written: z.array(z.string()),

  /** Vocabulary map (when domain vocabulary is active) */
  vocabulary_map: z.record(z.string()).optional(),
});

export type DerivationState = z.infer<typeof DerivationStateSchema>;
export type DimensionResolution = z.infer<typeof DimensionResolutionSchema>;

/**
 * Write derivation state to the ops directory.
 * Uses YAML for human readability.
 */
export function writeDerivationState(workspacePath: string, state: DerivationState): void {
  const derivationPath = getDerivationPath(workspacePath);
  writeFileSafe(derivationPath, stringifyYAML(state));
}

/**
 * Read derivation state from the ops directory.
 * Returns null if no derivation state exists.
 */
export function readDerivationState(workspacePath: string): DerivationState | null {
  const derivationPath = getDerivationPath(workspacePath);
  const content = readFileIfExists(derivationPath);
  if (!content) return null;

  try {
    const parsed = parseYAML(content);
    return DerivationStateSchema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Check whether a derivation state exists and can be resumed.
 * Returns true if there's an incomplete derivation (not all steps done).
 */
export function canResume(workspacePath: string): boolean {
  const state = readDerivationState(workspacePath);
  if (!state) return false;

  const ALL_STEPS = ['constitution', 'guardrails', 'memory', 'skills', 'playbooks'];
  return !ALL_STEPS.every(step => state.completed_steps.includes(step));
}

/**
 * Build initial derivation state from a session.
 */
export function buildDerivationState(
  session: { session_id: string; domain_id?: string; interview?: { dimension_coverage: any[] }; structured_answers?: any },
  generatorVersion: string,
): DerivationState {
  const resolutions: DimensionResolution[] = [];

  // Extract dimension resolutions from interview coverage
  if (session.interview?.dimension_coverage) {
    for (const dim of session.interview.dimension_coverage) {
      resolutions.push({
        dimension_id: dim.dimension_id,
        confidence: dim.confidence ?? (dim.status === 'covered' ? 1.5 : 0),
        summary: dim.summary ?? '',
        extracted_facts: dim.extracted_facts ?? [],
        anti_signals: dim.anti_signals ?? [],
      });
    }
  }

  return {
    schema_version: 'derivation.v1',
    created_at: new Date().toISOString(),
    session_id: session.session_id,
    domain_id: session.domain_id,
    generator_version: generatorVersion,
    dimension_resolutions: resolutions,
    structured_answers: session.structured_answers,
    completed_steps: [],
    artifacts_written: [],
  };
}

/**
 * Get the path for the derivation state file.
 * Checks both three-space layout (ops/) and flat layout.
 */
function getDerivationPath(workspacePath: string): string {
  // Three-space layout: .tastekit/ops/derivation.v1.yaml
  return join(workspacePath, 'ops', 'derivation.v1.yaml');
}
