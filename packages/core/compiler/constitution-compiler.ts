import { ConstitutionV1, ConstitutionV1Schema } from '../schemas/constitution.js';
import type { DimensionCoverage, SessionState } from '../schemas/workspace.js';
import type { StructuredAnswers } from '../interview/interviewer.js';

type CompositionMode = 'quick' | 'guided' | 'operator' | 'full_taste_composition';

interface TasteKitCompositionDimension {
  dimension_id: string;
  status: 'not_started' | 'in_progress' | 'covered' | 'skipped';
  summary?: string;
  facts?: string[];
  anti_signals?: string[];
  confidence?: number;
  confidence_threshold?: number;
  source_turns?: number[];
}

interface TasteKitCompositionExtension {
  schema_version: 'tastekit.composition.v1';
  mode: CompositionMode;
  domain_id?: string;
  domain_specific: Record<string, unknown>;
  dimensions: Record<string, TasteKitCompositionDimension>;
}

const COMPOSITION_EXTENSION_KEY = 'x-tastekit-composition';

/**
 * Constitution compiler
 *
 * Compiles onboarding answers into a constitution.v1.json artifact.
 * Dual-path: uses rich StructuredAnswers from LLM interview if available,
 * otherwise falls back to legacy flat-answer compilation.
 */

export function compileConstitution(
  session: SessionState,
  generatorVersion: string
): ConstitutionV1 {
  const result = session.structured_answers
    ? compileFromStructuredAnswers(
        session.structured_answers as StructuredAnswers,
        session,
        generatorVersion,
      )
    : compileLegacy(session, generatorVersion);

  const validation = ConstitutionV1Schema.safeParse(result);
  if (!validation.success) {
    const issues = validation.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(
      `compileConstitution produced an artifact that fails ConstitutionV1Schema: ${issues}. ` +
      `This is a producer bug — the schema is the lock. Fix the compiler, do not loosen the schema.`
    );
  }
  return validation.data;
}

function principleIdFromStatement(statement: string, index: number, used: Set<string>): string {
  const slug = statement
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const base = slug.length > 0 ? slug : `unnamed_principle_${index}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  used.add(candidate);
  return candidate;
}

function fallbackPrinciple(): ConstitutionV1['principles'][number] {
  return {
    id: 'apply_user_taste',
    priority: 1,
    statement: 'Apply the user\'s general taste and preferences when no specific principle applies.',
    rationale: 'Default fallback when onboarding produced no explicit principles. Re-run onboarding to capture concrete principles.',
    applies_to: ['*'],
  };
}

/**
 * Rich compilation from LLM interview structured answers.
 * Populates fields that the legacy path leaves empty (examples, formatting_rules,
 * evidence_policy, taboos, rationale).
 */
function compileFromStructuredAnswers(
  sa: StructuredAnswers,
  session: SessionState,
  generatorVersion: string,
): ConstitutionV1 {
  const usedIds = new Set<string>();
  const principles: ConstitutionV1['principles'] = sa.principles.map((p, index) => ({
    id: principleIdFromStatement(p.statement, index, usedIds),
    priority: index + 1,
    statement: p.statement,
    rationale: p.rationale,
    applies_to: p.applies_to,
    examples_good: p.examples_good,
    examples_bad: p.examples_bad,
  }));
  if (principles.length === 0) {
    principles.push(fallbackPrinciple());
  }

  const tone = {
    voice_keywords: sa.tone.voice_keywords,
    forbidden_phrases: sa.tone.forbidden_phrases,
    formatting_rules: sa.tone.formatting_rules,
  };

  const tradeoffs = {
    accuracy_vs_speed: sa.tradeoffs.accuracy_vs_speed,
    cost_sensitivity: sa.tradeoffs.cost_sensitivity,
    autonomy_level: sa.tradeoffs.autonomy_level,
  };

  const evidence_policy = {
    require_citations_for: sa.evidence_policy.require_citations_for,
    uncertainty_language_rules: sa.evidence_policy.uncertainty_language_rules,
  };

  const taboos = {
    never_do: sa.taboos.never_do,
    must_escalate: sa.taboos.must_escalate,
  };

  // Build trace_map with dimension-level traceability
  const trace_map: Record<string, any> = {
    _session_id: session.session_id,
    _llm_provider: session.llm_provider,
    _domain_id: session.domain_id,
  };

  principles.forEach((p, i) => {
    const source = sa.principles[i];
    trace_map[p.id] = {
      source_dimension: source?.source_dimension ?? 'fallback_empty_principles',
    };
  });

  trace_map['_tone'] = { source_dimensions: sa.tone.source_dimensions };
  trace_map['_tradeoffs'] = { source_dimensions: sa.tradeoffs.source_dimensions };
  trace_map['_evidence_policy'] = { source_dimensions: sa.evidence_policy.source_dimensions };
  trace_map['_taboos'] = { source_dimensions: sa.taboos.source_dimensions };

  const composition = buildCompositionExtension(sa, session);
  if (Object.keys(composition.domain_specific).length > 0) {
    trace_map['_domain_specific'] = {
      source_dimensions: Object.keys(composition.domain_specific),
    };
  }

  return {
    schema_version: 'constitution.v1',
    generated_at: new Date().toISOString(),
    generator_version: generatorVersion,
    user_scope: 'single_user',
    principles,
    tone,
    tradeoffs,
    evidence_policy,
    taboos,
    trace_map,
    extensions: {
      [COMPOSITION_EXTENSION_KEY]: composition,
    },
  };
}

function buildCompositionExtension(
  sa: StructuredAnswers,
  session: SessionState,
): TasteKitCompositionExtension {
  const domainSpecific = toJsonSafeRecord(sa.domain_specific);
  return {
    schema_version: 'tastekit.composition.v1',
    mode: session.depth as CompositionMode,
    ...(session.domain_id ? { domain_id: session.domain_id } : {}),
    domain_specific: domainSpecific,
    dimensions: buildCompositionDimensions(session.interview?.dimension_coverage ?? []),
  };
}

function buildCompositionDimensions(
  coverage: DimensionCoverage[],
): Record<string, TasteKitCompositionDimension> {
  const dimensions: Record<string, TasteKitCompositionDimension> = {};

  for (const dim of coverage) {
    if (!dim.dimension_id) continue;

    const entry: TasteKitCompositionDimension = {
      dimension_id: dim.dimension_id,
      status: dim.status,
    };

    if (dim.summary) entry.summary = dim.summary;

    const facts = dim.extracted_facts?.filter(isNonEmptyString);
    if (facts && facts.length > 0) entry.facts = facts;

    const antiSignals = dim.anti_signals?.filter(isNonEmptyString);
    if (antiSignals && antiSignals.length > 0) entry.anti_signals = antiSignals;

    if (Number.isFinite(dim.confidence)) entry.confidence = dim.confidence;
    if (Number.isFinite(dim.confidence_threshold)) {
      entry.confidence_threshold = dim.confidence_threshold;
    }

    const sourceTurns = uniqueSortedNumbers([
      ...(dim.relevant_turns ?? []),
      ...(dim.signals ?? []).map(signal => signal.turn_number),
    ]);
    if (sourceTurns.length > 0) entry.source_turns = sourceTurns;

    dimensions[dim.dimension_id] = entry;
  }

  return dimensions;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniqueSortedNumbers(values: unknown[]): number[] {
  return Array.from(new Set(
    values.filter((value): value is number => (
      typeof value === 'number' && Number.isInteger(value) && value >= 0
    )),
  )).sort((a, b) => a - b);
}

function toJsonSafeRecord(value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) return {};

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const safe = toJsonSafeValue(child, new Set());
    if (safe !== undefined) result[key] = safe;
  }
  return result;
}

function toJsonSafeValue(value: unknown, seen: Set<object>): unknown {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  if (Array.isArray(value)) {
    const safeArray = value
      .map(item => toJsonSafeValue(item, seen))
      .filter(item => item !== undefined);
    return safeArray;
  }

  if (isPlainRecord(value)) {
    if (seen.has(value)) return undefined;
    seen.add(value);
    const safeObject: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const safe = toJsonSafeValue(child, seen);
      if (safe !== undefined) safeObject[key] = safe;
    }
    seen.delete(value);
    return safeObject;
  }

  return undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Legacy compilation from flat session.answers (backward compat).
 * Original code from the hardcoded wizard flow.
 */
function compileLegacy(
  session: SessionState,
  generatorVersion: string,
): ConstitutionV1 {
  const { answers } = session;

  const usedIds = new Set<string>();
  const principleStatements = answers.goals?.key_principles
    ? answers.goals.key_principles.split(',').map((p: string) => p.trim()).filter(Boolean)
    : [];

  const principles: ConstitutionV1['principles'] = principleStatements.map((statement: string, index: number) => ({
    id: principleIdFromStatement(statement, index, usedIds),
    priority: 1,
    statement,
    rationale: `Derived from onboarding session ${session.session_id}`,
    applies_to: ['*'],
  }));

  if (answers.goals?.primary_goal) {
    const goalStatement = `Primary goal: ${answers.goals.primary_goal}`;
    principles.unshift({
      id: principleIdFromStatement(goalStatement, 0, usedIds),
      priority: 1,
      statement: goalStatement,
      rationale: 'User-defined primary goal',
      applies_to: ['*'],
    });
  }

  if (principles.length === 0) {
    principles.push(fallbackPrinciple());
  }

  principles.forEach((p, i) => {
    p.priority = i + 1;
  });

  // Compile tone
  const voiceKeywords = answers.tone?.voice_keywords || [];
  const forbiddenPhrases = answers.tone?.forbidden_phrases
    ? answers.tone.forbidden_phrases.split(',').map((p: string) => p.trim()).filter(Boolean)
    : [];

  // Compile tradeoffs
  const tradeoffs = {
    accuracy_vs_speed: answers.tradeoffs?.accuracy_vs_speed || 0.5,
    cost_sensitivity: 0.5,
    autonomy_level: answers.tradeoffs?.autonomy_level || 0.5,
  };

  return {
    schema_version: 'constitution.v1',
    generated_at: new Date().toISOString(),
    generator_version: generatorVersion,
    user_scope: 'single_user',

    principles,

    tone: {
      voice_keywords: voiceKeywords,
      forbidden_phrases: forbiddenPhrases,
      formatting_rules: [],
    },

    tradeoffs,

    evidence_policy: {
      require_citations_for: ['facts', 'statistics', 'claims'],
      uncertainty_language_rules: [
        'Use "likely" or "probably" for uncertain statements',
        'Use "I don\'t know" when information is unavailable',
      ],
    },

    taboos: {
      never_do: [
        'Share personal information without consent',
        'Make decisions with irreversible consequences without approval',
      ],
      must_escalate: [
        'Financial transactions',
        'Legal decisions',
        'Medical advice',
      ],
    },

    trace_map: {
      _session_id: session.session_id,
      _answers: answers,
    },
  };
}
