import { describe, expect, it } from 'vitest';
import {
  createDefaultAbDemoPlan,
  createDemoRunMatrix,
  renderOnePagerHtml,
  scoreDeterministicRun,
  summarizeDemoRuns,
} from '../index.js';

describe('TasteKit A/B demo one-pager', () => {
  it('defines dev, content, and general demo tracks with fairness controls', () => {
    const plan = createDefaultAbDemoPlan();

    expect(plan.tracks.map(track => track.id)).toEqual(['dev', 'content', 'general']);
    expect(plan.fairness_controls).toContain('same-model');
    expect(plan.fairness_controls).toContain('fresh-workspace');
    expect(plan.trials_per_cell).toBe(3);
  });

  it('scores deterministic run evidence without an LLM judge', () => {
    const score = scoreDeterministicRun({
      tests_passed: true,
      constraints_met: true,
      regression_added: true,
      public_api_unchanged: true,
      final_answer_verified: true,
      skill_evidence_found: true,
    });

    expect(score.correctness).toBe(1);
    expect(score.taste_adherence).toBeGreaterThan(0.7);
    expect(score.evidence).toBe(1);
  });

  it('creates paired baseline and TasteKit run cells for every track and trial', () => {
    const matrix = createDemoRunMatrix(createDefaultAbDemoPlan(), {
      model: 'codex-cli',
      trialsPerCell: 3,
    });

    expect(matrix).toHaveLength(18);
    expect(matrix.filter(run => run.variant === 'baseline')).toHaveLength(9);
    expect(matrix.filter(run => run.variant === 'tastekit')).toHaveLength(9);
    expect(matrix.every(run => run.model === 'codex-cli')).toBe(true);
    expect(matrix.some(run => run.track_id === 'general' && run.variant === 'tastekit')).toBe(true);
  });

  it('summarizes baseline and TasteKit averages by track', () => {
    const summary = summarizeDemoRuns([
      { track_id: 'dev', variant: 'baseline', trial: 1, score: 40 },
      { track_id: 'dev', variant: 'baseline', trial: 2, score: 60 },
      { track_id: 'dev', variant: 'tastekit', trial: 1, score: 90 },
      { track_id: 'dev', variant: 'tastekit', trial: 2, score: 70 },
    ]);

    expect(summary).toEqual([
      { track_id: 'dev', baseline: 50, tastekit: 80 },
    ]);
  });

  it('renders a visual static HTML one-pager with diagrams and score strips', () => {
    const html = renderOnePagerHtml({
      plan: createDefaultAbDemoPlan(),
      generated_at: '2026-05-10T00:00:00.000Z',
      summary: [
        { track_id: 'dev', baseline: 44, tastekit: 86 },
        { track_id: 'content', baseline: 51, tastekit: 88 },
        { track_id: 'general', baseline: 48, tastekit: 82 },
      ],
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<svg');
    expect(html).toContain('Dev Agent');
    expect(html).toContain('Content Agent');
    expect(html).toContain('General Agent');
    expect(html).toContain('score-strip');
    expect(html).toContain('Same model');
    expect(html).not.toContain('Lorem');
  });
});
