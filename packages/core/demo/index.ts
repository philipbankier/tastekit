export type DemoTrackId = 'dev' | 'content' | 'general';

export interface DemoTrack {
  id: DemoTrackId;
  title: string;
  profile: string;
  task_goal: string;
  tastekit_advantage: string;
  deterministic_gates: string[];
}

export interface AbDemoPlan {
  title: string;
  trials_per_cell: number;
  harness: string;
  model_policy: string;
  fairness_controls: string[];
  tracks: DemoTrack[];
}

export interface DeterministicRunEvidence {
  tests_passed?: boolean;
  constraints_met?: boolean;
  regression_added?: boolean;
  public_api_unchanged?: boolean;
  final_answer_verified?: boolean;
  skill_evidence_found?: boolean;
}

export interface DeterministicRunScore {
  correctness: number;
  taste_adherence: number;
  evidence: number;
  overall: number;
}

export interface DemoSummaryScore {
  track_id: DemoTrackId;
  baseline: number;
  tastekit: number;
}

export type DemoVariant = 'baseline' | 'tastekit';

export interface DemoRunCell {
  run_id: string;
  track_id: DemoTrackId;
  variant: DemoVariant;
  trial: number;
  model: string;
  harness: string;
  profile: string;
  task_goal: string;
}

export interface DemoRunMatrixOptions {
  model: string;
  trialsPerCell?: number;
}

export interface CompletedDemoRun {
  track_id: DemoTrackId;
  variant: DemoVariant;
  trial: number;
  score: number;
}

export interface OnePagerReport {
  plan: AbDemoPlan;
  generated_at: string;
  summary: DemoSummaryScore[];
}

export function createDefaultAbDemoPlan(): AbDemoPlan {
  return {
    title: 'TasteKit A/B Agent Demo',
    trials_per_cell: 3,
    harness: 'AutoClaw with Codex CLI provider when preflight succeeds',
    model_policy: 'Use the same model, temperature, timeout, workspace fixture, and task prompt per paired run.',
    fairness_controls: [
      'same-model',
      'same-harness',
      'same-task',
      'fresh-workspace',
      'same-timeout',
      'same-evaluator',
    ],
    tracks: [
      {
        id: 'dev',
        title: 'Dev Agent',
        profile: 'development-agent',
        task_goal: 'Fix a real bug, add regression coverage, avoid API churn, and report exact verification.',
        tastekit_advantage: 'Engineering taste should appear as scoped edits, test discipline, and concise handoff.',
        deterministic_gates: [
          'Unit tests pass',
          'Regression test added',
          'Public API unchanged',
          'Final answer reports verification',
        ],
      },
      {
        id: 'content',
        title: 'Content Agent',
        profile: 'content-agent',
        task_goal: 'Draft audience-specific launch or founder-update content from source material.',
        tastekit_advantage: 'Editorial taste should appear as voice fit, evidence restraint, and anti-generic language.',
        deterministic_gates: [
          'Length and format constraints met',
          'Banned phrases absent',
          'Unsupported claims avoided',
          'Voice brief reflected',
        ],
      },
      {
        id: 'general',
        title: 'General Agent',
        profile: 'general-agent + development/content capability packs',
        task_goal: 'Handle a mixed task: inspect a code change, summarize impact, then draft release copy.',
        tastekit_advantage: 'General taste should survive context switching while invoking task-specific capability skills.',
        deterministic_gates: [
          'Dev subtask passes checks',
          'Content subtask meets voice rules',
          'Context switching remains coherent',
          'Capability evidence captured',
        ],
      },
    ],
  };
}

export function scoreDeterministicRun(evidence: DeterministicRunEvidence): DeterministicRunScore {
  const correctnessSignals = [
    evidence.tests_passed,
    evidence.constraints_met,
    evidence.regression_added,
    evidence.public_api_unchanged,
  ].filter(value => value !== undefined) as boolean[];

  const evidenceSignals = [
    evidence.final_answer_verified,
    evidence.skill_evidence_found,
  ].filter(value => value !== undefined) as boolean[];

  const correctness = averageBooleans(correctnessSignals);
  const evidenceScore = averageBooleans(evidenceSignals);
  const tasteSignals = [
    evidence.constraints_met,
    evidence.final_answer_verified,
    evidence.skill_evidence_found,
  ].filter(value => value !== undefined) as boolean[];
  const tasteAdherence = averageBooleans(tasteSignals);
  const overall = roundScore((correctness * 0.45) + (tasteAdherence * 0.35) + (evidenceScore * 0.2));

  return {
    correctness,
    taste_adherence: tasteAdherence,
    evidence: evidenceScore,
    overall,
  };
}

export function createDemoRunMatrix(plan: AbDemoPlan, options: DemoRunMatrixOptions): DemoRunCell[] {
  const trialsPerCell = options.trialsPerCell ?? plan.trials_per_cell;
  const variants: DemoVariant[] = ['baseline', 'tastekit'];
  const cells: DemoRunCell[] = [];

  for (const track of plan.tracks) {
    for (const variant of variants) {
      for (let trial = 1; trial <= trialsPerCell; trial += 1) {
        cells.push({
          run_id: `${track.id}-${variant}-${trial}`,
          track_id: track.id,
          variant,
          trial,
          model: options.model,
          harness: plan.harness,
          profile: variant === 'tastekit' ? track.profile : 'baseline-autoclaw',
          task_goal: track.task_goal,
        });
      }
    }
  }

  return cells;
}

export function summarizeDemoRuns(runs: CompletedDemoRun[]): DemoSummaryScore[] {
  const grouped = new Map<DemoTrackId, { baseline: number[]; tastekit: number[] }>();

  for (const run of runs) {
    const group = grouped.get(run.track_id) ?? { baseline: [], tastekit: [] };
    group[run.variant].push(run.score);
    grouped.set(run.track_id, group);
  }

  return [...grouped.entries()].map(([track_id, group]) => ({
    track_id,
    baseline: averageNumbers(group.baseline),
    tastekit: averageNumbers(group.tastekit),
  }));
}

export function renderOnePagerHtml(report: OnePagerReport): string {
  const { plan } = report;
  const scoreByTrack = new Map(report.summary.map(score => [score.track_id, score]));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(plan.title)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172026;
      --muted: #5c6b73;
      --line: #d8e0e4;
      --paper: #f7f9fa;
      --panel: #ffffff;
      --taste: #0f8b8d;
      --base: #9a6b35;
      --dev: #315c99;
      --content: #a23e48;
      --general: #4c6b36;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--paper);
    }
    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 18px 0 22px;
    }
    header {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 20px;
      align-items: end;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 30px;
      line-height: 1.05;
      letter-spacing: 0;
    }
    .lede {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.38;
      max-width: 720px;
    }
    .meta {
      display: grid;
      gap: 6px;
      justify-items: end;
      font-size: 12px;
      color: var(--muted);
    }
    .shell {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 12px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 1px 2px rgba(23, 32, 38, 0.04);
    }
    .map-panel { margin-bottom: 12px; }
    .map-title, .section-title {
      margin: 0 0 10px;
      font-size: 13px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    svg text { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    .task-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .task-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      min-height: 226px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .task-card h2 {
      margin: 0;
      font-size: 16px;
      letter-spacing: 0;
    }
    .pill {
      display: inline-flex;
      width: fit-content;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 10px;
      color: #fff;
      background: var(--taste);
    }
    .task-card p {
      margin: 0;
      font-size: 11px;
      line-height: 1.34;
      color: var(--muted);
    }
    .gates {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 6px;
      font-size: 11px;
    }
    .gates li {
      display: grid;
      grid-template-columns: 16px 1fr;
      gap: 6px;
      align-items: start;
    }
    .check {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #dff3ef;
      border: 1px solid #8bc7bd;
      margin-top: 1px;
    }
    aside {
      display: grid;
      gap: 12px;
      align-content: start;
    }
    .controls {
      display: grid;
      gap: 9px;
    }
    .control {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 8px;
      align-items: center;
      font-size: 11px;
    }
    .control-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #eef5f5;
      color: var(--taste);
      font-weight: 700;
    }
    .score-strip {
      display: grid;
      gap: 12px;
    }
    .score-row {
      display: grid;
      gap: 5px;
    }
    .score-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--muted);
    }
    .bars {
      display: grid;
      gap: 4px;
    }
    .bar {
      height: 9px;
      border-radius: 999px;
      background: #edf1f2;
      overflow: hidden;
    }
    .bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
    }
    .bar.base span { background: var(--base); }
    .bar.taste span { background: var(--taste); }
    .legend {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: var(--muted);
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 4px;
    }
    .pipeline {
      margin-top: 12px;
    }
    @media (max-width: 900px) {
      header, .shell, .task-grid { grid-template-columns: 1fr; }
      .meta { justify-items: start; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>${escapeHtml(plan.title)}</h1>
        <p class="lede">A paired comparison suite showing how TasteKit changes agent behavior across software work, content work, and mixed general-agent work without changing the harness or model.</p>
      </div>
      <div class="meta">
        <span>Generated ${escapeHtml(report.generated_at)}</span>
        <span>${plan.trials_per_cell} trials per cell</span>
        <span>${escapeHtml(plan.harness)}</span>
      </div>
    </header>

    <section class="panel map-panel">
      <p class="map-title">Experiment Map</p>
      ${renderExperimentMapSvg()}
    </section>

    <div class="shell">
      <div>
        <section class="panel">
          <p class="section-title">Task Tracks</p>
          <div class="task-grid">
            ${plan.tracks.map(track => renderTaskCard(track)).join('\n')}
          </div>
        </section>
        <section class="panel pipeline">
          <p class="section-title">Run Pipeline</p>
          ${renderPipelineSvg()}
        </section>
      </div>

      <aside>
        <section class="panel">
          <p class="section-title">Fairness Controls</p>
          <div class="controls">
            ${plan.fairness_controls.map(renderFairnessControl).join('\n')}
          </div>
        </section>
        <section class="panel">
          <p class="section-title">Score Strip</p>
          <div class="legend">
            <span><i class="dot" style="background:var(--base)"></i>Baseline</span>
            <span><i class="dot" style="background:var(--taste)"></i>TasteKit</span>
          </div>
          <div class="score-strip">
            ${plan.tracks.map(track => renderScoreRow(track, scoreByTrack.get(track.id))).join('\n')}
          </div>
        </section>
      </aside>
    </div>
  </main>
</body>
</html>`;
}

function averageBooleans(values: boolean[]): number {
  if (values.length === 0) return 0;
  return roundScore(values.filter(Boolean).length / values.length);
}

function averageNumbers(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTaskCard(track: DemoTrack): string {
  return `<article class="task-card">
  <span class="pill">${escapeHtml(track.profile)}</span>
  <h2>${escapeHtml(track.title)}</h2>
  <p>${escapeHtml(track.task_goal)}</p>
  <p><strong>TasteKit signal:</strong> ${escapeHtml(track.tastekit_advantage)}</p>
  <ul class="gates">
    ${track.deterministic_gates.map(gate => `<li><span class="check"></span><span>${escapeHtml(gate)}</span></li>`).join('\n')}
  </ul>
</article>`;
}

function renderFairnessControl(control: string): string {
  const words = control.split('-');
  const label = words
    .map((part, index) => index === 0 ? capitalize(part) : part)
    .join(' ');
  return `<div class="control"><span class="control-icon">=</span><span>${escapeHtml(label)}</span></div>`;
}

function capitalize(input: string): string {
  if (input.length === 0) return input;
  return `${input.charAt(0).toUpperCase()}${input.slice(1)}`;
}

function renderScoreRow(track: DemoTrack, score?: DemoSummaryScore): string {
  const baseline = score?.baseline ?? 0;
  const tastekit = score?.tastekit ?? 0;
  return `<div class="score-row">
  <div class="score-label"><strong>${escapeHtml(track.title)}</strong><span>${baseline} / ${tastekit}</span></div>
  <div class="bars">
    <div class="bar base"><span style="width:${clampPercent(baseline)}%"></span></div>
    <div class="bar taste"><span style="width:${clampPercent(tastekit)}%"></span></div>
  </div>
</div>`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function renderExperimentMapSvg(): string {
  return `<svg viewBox="0 0 1080 230" role="img" aria-label="TasteKit A/B experiment map" width="100%" height="230">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#80919a"></path>
    </marker>
  </defs>
  <rect x="20" y="18" width="180" height="184" rx="8" fill="#e8f5f5" stroke="#b8dede"></rect>
  <text x="110" y="52" text-anchor="middle" font-size="18" font-weight="700" fill="#0f5f60">Taste Profiles</text>
  <text x="110" y="86" text-anchor="middle" font-size="13" fill="#43666a">dev</text>
  <text x="110" y="114" text-anchor="middle" font-size="13" fill="#43666a">content</text>
  <text x="110" y="142" text-anchor="middle" font-size="13" fill="#43666a">general + packs</text>

  <rect x="250" y="18" width="150" height="48" rx="8" fill="#edf2fb" stroke="#b9cae7"></rect>
  <text x="325" y="48" text-anchor="middle" font-size="15" font-weight="700" fill="#315c99">Dev Agent</text>
  <rect x="250" y="92" width="150" height="48" rx="8" fill="#f9eaec" stroke="#e6bdc2"></rect>
  <text x="325" y="122" text-anchor="middle" font-size="15" font-weight="700" fill="#a23e48">Content Agent</text>
  <rect x="250" y="166" width="150" height="48" rx="8" fill="#edf4e9" stroke="#c9dbc0"></rect>
  <text x="325" y="196" text-anchor="middle" font-size="15" font-weight="700" fill="#4c6b36">General Agent</text>

  <rect x="470" y="60" width="180" height="108" rx="8" fill="#fff7ed" stroke="#ddb882"></rect>
  <text x="560" y="98" text-anchor="middle" font-size="16" font-weight="700" fill="#7a4d1f">Baseline</text>
  <text x="560" y="124" text-anchor="middle" font-size="12" fill="#705b43">AutoClaw</text>
  <text x="560" y="144" text-anchor="middle" font-size="12" fill="#705b43">no TasteKit</text>

  <rect x="720" y="46" width="170" height="136" rx="8" fill="#ffffff" stroke="#d8e0e4"></rect>
  <text x="805" y="84" text-anchor="middle" font-size="16" font-weight="700" fill="#172026">Same Harness</text>
  <text x="805" y="112" text-anchor="middle" font-size="12" fill="#5c6b73">model</text>
  <text x="805" y="134" text-anchor="middle" font-size="12" fill="#5c6b73">timeout</text>
  <text x="805" y="156" text-anchor="middle" font-size="12" fill="#5c6b73">workspace</text>

  <rect x="940" y="60" width="120" height="108" rx="8" fill="#eef5f5" stroke="#bddbdb"></rect>
  <text x="1000" y="98" text-anchor="middle" font-size="15" font-weight="700" fill="#0f5f60">Scored</text>
  <text x="1000" y="126" text-anchor="middle" font-size="12" fill="#43666a">outputs</text>
  <text x="1000" y="148" text-anchor="middle" font-size="12" fill="#43666a">diffs + logs</text>

  <path d="M200 74 C220 74 226 42 250 42" stroke="#80919a" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
  <path d="M200 114 C220 114 226 116 250 116" stroke="#80919a" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
  <path d="M200 154 C220 154 226 190 250 190" stroke="#80919a" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
  <path d="M400 42 C520 42 610 50 720 88" stroke="#80919a" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
  <path d="M400 116 H720" stroke="#80919a" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
  <path d="M400 190 C520 190 610 182 720 150" stroke="#80919a" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
  <path d="M650 114 H720" stroke="#80919a" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
  <path d="M890 114 H940" stroke="#80919a" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
</svg>`;
}

function renderPipelineSvg(): string {
  const labels = ['Profiles', 'Export', 'Paired Runs', 'Artifacts', 'Scoring', 'One-Pager'];
  const nodes = labels.map((label, index) => {
    const x = 32 + index * 155;
    return `<g>
      <circle cx="${x}" cy="54" r="24" fill="#eef5f5" stroke="#bddbdb"></circle>
      <text x="${x}" y="60" text-anchor="middle" font-size="15" font-weight="700" fill="#0f5f60">${index + 1}</text>
      <text x="${x}" y="100" text-anchor="middle" font-size="12" fill="#5c6b73">${escapeHtml(label)}</text>
    </g>`;
  }).join('\n');

  const lines = labels.slice(1).map((_, index) => {
    const x1 = 58 + index * 155;
    const x2 = 160 + index * 155;
    return `<path d="M${x1} 54 H${x2}" stroke="#80919a" stroke-width="2" marker-end="url(#arrow2)"></path>`;
  }).join('\n');

  return `<svg viewBox="0 0 850 128" role="img" aria-label="Demo run pipeline" width="100%" height="128">
  <defs>
    <marker id="arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#80919a"></path>
    </marker>
  </defs>
  ${lines}
  ${nodes}
</svg>`;
}
