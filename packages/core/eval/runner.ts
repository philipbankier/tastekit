import { EvalPackV1, EvalScenario } from '../schemas/evalpack.js';
import { Judge, JudgmentResult, LLMJudgeProvider } from './judge.js';

/**
 * Eval Runner
 *
 * Runs evaluation packs and produces reports.
 * Accepts an optional executor function for running scenarios against a real agent.
 */

export interface EvalResult {
  scenario_id: string;
  passed: boolean;
  score: number;
  judgments: JudgmentResult[];
  outputs: any;
}

export interface EvalReport {
  evalpack_id: string;
  timestamp: string;
  results: EvalResult[];
  overall_score: number;
  passed: boolean;
}

/** Function that executes a scenario and returns the agent's output */
export type ScenarioExecutor = (scenario: EvalScenario) => Promise<any>;

export class EvalRunner {
  private judge: Judge;
  private executor?: ScenarioExecutor;

  constructor(opts?: { llmProvider?: LLMJudgeProvider; executor?: ScenarioExecutor }) {
    this.judge = new Judge(opts?.llmProvider);
    this.executor = opts?.executor;
  }

  async runEvalPack(evalPack: EvalPackV1): Promise<EvalReport> {
    const results: EvalResult[] = [];

    for (const scenario of evalPack.scenarios) {
      const result = await this.runScenario(scenario, evalPack);
      results.push(result);
    }

    const overallScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;
    const passed = results.length > 0 && results.every(r => r.passed);

    return {
      evalpack_id: evalPack.id,
      timestamp: new Date().toISOString(),
      results,
      overall_score: overallScore,
      passed,
    };
  }

  private async runScenario(scenario: EvalScenario, evalPack: EvalPackV1): Promise<EvalResult> {
    let outputs: any;

    if (this.executor) {
      // Use the provided executor to run the scenario against a real agent
      outputs = await this.executor(scenario);
    } else {
      // Without an executor, use the scenario's setup inputs as a passthrough.
      // This allows judging static outputs (e.g., from trace replay or manual testing).
      outputs = scenario.setup.inputs;
    }

    const judgments = await this.judge.judgeOutputs(
      outputs,
      evalPack.judging,
      scenario.expected
    );

    const totalScore = judgments.length > 0
      ? judgments.reduce((sum, j) => sum + j.score, 0) / judgments.length
      : 0;
    const passed = judgments.length > 0 && judgments.every(j => j.passed);

    return {
      scenario_id: scenario.scenario_id,
      passed,
      score: totalScore,
      judgments,
      outputs,
    };
  }
}
