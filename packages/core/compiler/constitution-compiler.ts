import { ConstitutionV1 } from '../schemas/constitution.js';
import { SessionState } from '../schemas/workspace.js';
import { StructuredAnswers } from '../interview/interviewer.js';

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
  // If session has structured_answers from LLM interview, use the rich path
  if (session.structured_answers) {
    return compileFromStructuredAnswers(
      session.structured_answers as StructuredAnswers,
      session,
      generatorVersion,
    );
  }

  // Otherwise, fall back to legacy flat-answer compilation
  return compileLegacy(session, generatorVersion);
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
  const principles = sa.principles.map((p, index) => ({
    id: `principle_${index}`,
    priority: p.priority,
    statement: p.statement,
    rationale: p.rationale,
    applies_to: p.applies_to,
    examples_good: p.examples_good,
    examples_bad: p.examples_bad,
  }));

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
    trace_map[p.id] = { source_dimension: source.source_dimension };
  });

  trace_map['_tone'] = { source_dimensions: sa.tone.source_dimensions };
  trace_map['_tradeoffs'] = { source_dimensions: sa.tradeoffs.source_dimensions };
  trace_map['_evidence_policy'] = { source_dimensions: sa.evidence_policy.source_dimensions };
  trace_map['_taboos'] = { source_dimensions: sa.taboos.source_dimensions };

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
  };
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

  // Parse principles from onboarding
  const principleStatements = answers.goals?.key_principles
    ? answers.goals.key_principles.split(',').map((p: string) => p.trim())
    : [];

  const principles = principleStatements.map((statement: string, index: number): any => ({
    id: `principle_${index + 1}`,
    priority: index + 1,
    statement,
    rationale: `Derived from onboarding session ${session.session_id}`,
    applies_to: ['*'],
  }));

  // Add primary goal as top principle
  if (answers.goals?.primary_goal) {
    principles.unshift({
      id: 'principle_0',
      priority: 1,
      statement: `Primary goal: ${answers.goals.primary_goal}`,
      rationale: 'User-defined primary goal',
      applies_to: ['*'],
    });

    // Adjust priorities
    principles.forEach((p: any, i: number) => {
      p.priority = i + 1;
    });
  }

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
