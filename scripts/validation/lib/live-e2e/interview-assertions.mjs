const FATIGUE_SIGNAL_PATTERNS = [
  /\bcan we compress\b/i,
  /\bcompress (?:this|some of this|the rest)\b/i,
  /\bi(?:'m| am)?\s+(?:a bit )?(?:fried|tired)\b/i,
  /\bgetting (?:long|repetitive|tiring)\b/i,
  /\btoo many questions\b/i,
  /\bcircling (?:the )?same themes\b/i,
  /\bwe (?:could|can) noodle forever\b/i,
  /\brepeating myself\b/i,
  /\bvariations of the same question\b/i,
  /\bkeep answering (?:discrete|abstract)?\s*questions\b/i,
  /\brather (?:react to|refine|see) a draft\b/i,
  /\bget to a draft\b/i,
  /\bshow me (?:a|the) draft\b/i,
  /\bsend me (?:a|the) draft\b/i,
  /\bkeep going piece by piece\b/i,
];

export function transcriptHasFatigueSignal(events = []) {
  return events.some(event => {
    if (event?.type !== 'simulated_user_message') return false;
    const reply = event.data?.reply;
    if (typeof reply !== 'string') return false;
    return FATIGUE_SIGNAL_PATTERNS.some(pattern => pattern.test(reply));
  });
}

export function shouldWarnMissingFatigueEvent(state, events = []) {
  const recordedFatigueEvents = state?.metacognition?.fatigue_events?.length ?? 0;
  return recordedFatigueEvents === 0 && transcriptHasFatigueSignal(events);
}

export function fullCompositionCompletionGaps(state) {
  const dimensionCoverage = Array.isArray(state?.dimension_coverage)
    ? state.dimension_coverage
    : [];
  const incompleteDimensionIds = dimensionCoverage
    .filter(coverage => !isDimensionCovered(coverage))
    .map(coverage => coverage.dimension_id)
    .filter(id => typeof id === 'string' && id.length > 0);
  const assumptions = Array.isArray(state?.metacognition?.unresolved_assumptions)
    ? state.metacognition.unresolved_assumptions
    : [];
  const finishNowDimensionIds = assumptions
    .filter(assumption => assumption?.source === 'user_finish_now')
    .map(assumption => assumption.dimension_id)
    .filter(id => typeof id === 'string' && id.length > 0);

  return {
    incompleteDimensionIds,
    finishNowDimensionIds,
  };
}

function isDimensionCovered(coverage) {
  if (!coverage || typeof coverage !== 'object') return false;
  if (coverage.status === 'covered') return true;
  const confidence = typeof coverage.confidence === 'number' ? coverage.confidence : 0;
  const threshold = typeof coverage.confidence_threshold === 'number' ? coverage.confidence_threshold : 1.5;
  return confidence >= threshold;
}
