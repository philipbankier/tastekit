import { TraceEvent } from '../schemas/trace.js';
import { SkillExecutionRecord, SkillPerformanceReport } from '../schemas/skills.js';

/**
 * Skill Tracker — Per-Skill Execution Observation
 *
 * Aggregates trace events into per-skill execution records and performance reports.
 * This closes the "observe" gap: traces capture skill_id on every event, but nothing
 * previously rolled up success rates per skill.
 */

/**
 * Walk trace events, group by (skill_id, run_id), and determine outcome for each run.
 *
 * Outcome rules:
 *  - 'failure' if any error event exists for this skill+run
 *  - 'partial' if user corrections exist but no errors
 *  - 'success' otherwise
 */
export function aggregateSkillRuns(events: TraceEvent[]): SkillExecutionRecord[] {
  // Group events by (skill_id, run_id)
  const groups = new Map<string, TraceEvent[]>();

  for (const event of events) {
    if (!event.skill_id) continue;
    const key = `${event.skill_id}::${event.run_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }

  const records: SkillExecutionRecord[] = [];

  for (const [key, groupEvents] of groups) {
    const [skillId, runId] = key.split('::');

    const errors = groupEvents.filter(e => e.event_type === 'error');
    const corrections = groupEvents.filter(
      e => e.event_type === 'approval_response' && e.data?.approved === false,
    );
    const userCorrections = groupEvents.filter(
      e => e.event_type === 'artifact_written' && e.actor === 'user',
    );

    // Determine outcome
    let outcome: 'success' | 'failure' | 'partial';
    if (errors.length > 0) {
      outcome = 'failure';
    } else if (corrections.length > 0 || userCorrections.length > 0) {
      outcome = 'partial';
    } else {
      outcome = 'success';
    }

    // Calculate duration from first to last event
    const timestamps = groupEvents.map(e => new Date(e.timestamp).getTime());
    const duration = timestamps.length > 1
      ? Math.max(...timestamps) - Math.min(...timestamps)
      : 0;

    // Extract user feedback from observations
    const feedback = groupEvents
      .filter(e => e.event_type === 'observation' && e.observation_category === 'quality')
      .map(e => (e.data?.description as string) ?? '')
      .filter(Boolean)
      .join('; ');

    records.push({
      skill_id: skillId,
      run_id: runId,
      timestamp: groupEvents[0].timestamp,
      outcome,
      error_count: errors.length,
      user_corrections: corrections.length + userCorrections.length,
      duration_ms: duration,
      user_feedback: feedback || undefined,
    });
  }

  return records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Roll up execution records into per-skill performance reports.
 */
export function getSkillPerformance(records: SkillExecutionRecord[]): SkillPerformanceReport[] {
  const bySkill = new Map<string, SkillExecutionRecord[]>();

  for (const record of records) {
    if (!bySkill.has(record.skill_id)) bySkill.set(record.skill_id, []);
    bySkill.get(record.skill_id)!.push(record);
  }

  const reports: SkillPerformanceReport[] = [];

  for (const [skillId, skillRecords] of bySkill) {
    const total = skillRecords.length;
    const successes = skillRecords.filter(r => r.outcome === 'success').length;
    const successRate = total > 0 ? successes / total : 0;

    const avgDuration = total > 0
      ? skillRecords.reduce((sum, r) => sum + r.duration_ms, 0) / total
      : 0;

    // Aggregate failure reasons from feedback
    const failureReasons: Record<string, number> = {};
    for (const record of skillRecords) {
      if (record.outcome === 'failure' || record.outcome === 'partial') {
        const reason = record.user_feedback || `errors:${record.error_count}`;
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      }
    }

    // Detect trend by comparing first half to second half
    const trend = detectTrend(skillRecords);

    reports.push({
      skill_id: skillId,
      total_runs: total,
      success_rate: Math.round(successRate * 1000) / 1000,
      avg_duration_ms: Math.round(avgDuration),
      failure_reasons: failureReasons,
      trend,
    });
  }

  return reports;
}

/**
 * Rank skills by failure rate (worst-first).
 */
export function rankByFailureRate(reports: SkillPerformanceReport[]): SkillPerformanceReport[] {
  return [...reports].sort((a, b) => a.success_rate - b.success_rate);
}

/**
 * Detect trend by comparing success rate of first half vs second half of runs.
 */
function detectTrend(records: SkillExecutionRecord[]): 'improving' | 'stable' | 'degrading' {
  if (records.length < 4) return 'stable';

  const mid = Math.floor(records.length / 2);
  const firstHalf = records.slice(0, mid);
  const secondHalf = records.slice(mid);

  const firstRate = firstHalf.filter(r => r.outcome === 'success').length / firstHalf.length;
  const secondRate = secondHalf.filter(r => r.outcome === 'success').length / secondHalf.length;

  const delta = secondRate - firstRate;
  if (delta > 0.1) return 'improving';
  if (delta < -0.1) return 'degrading';
  return 'stable';
}
