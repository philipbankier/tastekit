import { z } from 'zod';
import { EvalJudging, EvalJudgingRule, EvalScenarioExpected } from '../schemas/evalpack.js';

/**
 * Judge
 *
 * Judges outputs against rubrics and expectations.
 * Supports deterministic checks, regex matching, JSON schema validation,
 * and LLM-as-judge evaluation.
 */

export interface JudgmentResult {
  rule_id: string;
  passed: boolean;
  score: number;
  reason?: string;
}

export interface LLMJudgeProvider {
  /** Call an LLM with a prompt and return the response text */
  complete(prompt: string): Promise<string>;
}

export class Judge {
  private llmProvider?: LLMJudgeProvider;

  constructor(llmProvider?: LLMJudgeProvider) {
    this.llmProvider = llmProvider;
  }

  async judgeOutputs(
    outputs: any,
    judging: EvalJudging,
    expected: EvalScenarioExpected
  ): Promise<JudgmentResult[]> {
    const results: JudgmentResult[] = [];

    for (const rule of judging.rules) {
      const result = await this.applyRule(rule, outputs, expected);
      results.push(result);
    }

    return results;
  }

  private async applyRule(rule: EvalJudgingRule, outputs: any, expected: EvalScenarioExpected): Promise<JudgmentResult> {
    switch (rule.type) {
      case 'deterministic':
        return this.applyDeterministicRule(rule, outputs, expected);

      case 'regex':
        return this.applyRegexRule(rule, outputs);

      case 'schema':
        return this.applySchemaRule(rule, outputs);

      case 'llm_judge':
        return this.applyLLMJudge(rule, outputs);

      default:
        return {
          rule_id: rule.rule_id,
          passed: false,
          score: 0,
          reason: `Unknown rule type: ${rule.type}`,
        };
    }
  }

  private applyDeterministicRule(rule: EvalJudgingRule, outputs: any, expected: EvalScenarioExpected): JudgmentResult {
    const outputStr = typeof outputs === 'string' ? outputs : JSON.stringify(outputs);

    // Check required outputs are present
    if (expected.required_outputs && expected.required_outputs.length > 0) {
      const missing = expected.required_outputs.filter(field => {
        if (typeof outputs === 'object' && outputs !== null) {
          return !(field in outputs);
        }
        return !outputStr.includes(field);
      });

      if (missing.length > 0) {
        return {
          rule_id: rule.rule_id,
          passed: false,
          score: 0,
          reason: `Missing required outputs: ${missing.join(', ')}`,
        };
      }
    }

    // Check rubric thresholds if pattern specifies a rubric to check
    if (rule.pattern && expected.thresholds) {
      const rubricId = rule.pattern;
      const threshold = expected.thresholds[rubricId];
      if (threshold !== undefined) {
        const present = outputStr.toLowerCase().includes(rubricId.toLowerCase());
        return {
          rule_id: rule.rule_id,
          passed: present,
          score: present ? 1.0 : 0.0,
          reason: present ? undefined : `Rubric "${rubricId}" not satisfied in output`,
        };
      }
    }

    // Default: check output is non-empty
    const hasContent = outputStr.length > 0 && outputStr !== '{}' && outputStr !== 'null';
    return {
      rule_id: rule.rule_id,
      passed: hasContent,
      score: hasContent ? 1.0 : 0.0,
      reason: hasContent ? undefined : 'Output is empty',
    };
  }

  private applyRegexRule(rule: EvalJudgingRule, outputs: any): JudgmentResult {
    if (!rule.pattern) {
      return {
        rule_id: rule.rule_id,
        passed: false,
        score: 0,
        reason: 'No pattern specified',
      };
    }

    const regex = new RegExp(rule.pattern);
    const outputStr = typeof outputs === 'string' ? outputs : JSON.stringify(outputs);
    const matches = regex.test(outputStr);

    return {
      rule_id: rule.rule_id,
      passed: matches,
      score: matches ? 1.0 : 0.0,
      reason: matches ? undefined : `Pattern /${rule.pattern}/ did not match output`,
    };
  }

  private applySchemaRule(rule: EvalJudgingRule, outputs: any): JudgmentResult {
    if (!rule.pattern) {
      return {
        rule_id: rule.rule_id,
        passed: false,
        score: 0,
        reason: 'No schema pattern specified',
      };
    }

    try {
      const schemaDesc = JSON.parse(rule.pattern);
      const zodSchema = this.jsonToZodSchema(schemaDesc);
      const result = zodSchema.safeParse(outputs);

      if (result.success) {
        return { rule_id: rule.rule_id, passed: true, score: 1.0 };
      } else {
        const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
        return {
          rule_id: rule.rule_id,
          passed: false,
          score: 0,
          reason: `Schema validation failed: ${issues.join('; ')}`,
        };
      }
    } catch (err: any) {
      return {
        rule_id: rule.rule_id,
        passed: false,
        score: 0,
        reason: `Schema parse error: ${err.message}`,
      };
    }
  }

  private async applyLLMJudge(rule: EvalJudgingRule, outputs: any): Promise<JudgmentResult> {
    if (!this.llmProvider) {
      return {
        rule_id: rule.rule_id,
        passed: false,
        score: 0,
        reason: 'LLM judge requires an LLMJudgeProvider. Pass one to the Judge constructor.',
      };
    }

    if (!rule.template) {
      return {
        rule_id: rule.rule_id,
        passed: false,
        score: 0,
        reason: 'LLM judge rule requires a template',
      };
    }

    const outputStr = typeof outputs === 'string' ? outputs : JSON.stringify(outputs, null, 2);
    const prompt = rule.template.replace('{{output}}', outputStr);

    try {
      const response = await this.llmProvider.complete(prompt);

      // Parse score from LLM response (expects "score: 0.X" or similar)
      const scoreMatch = response.match(/(?:score|rating)[\s:]*([0-9]*\.?[0-9]+)/i);
      const score = scoreMatch ? Math.min(1, Math.max(0, parseFloat(scoreMatch[1]))) : 0;

      const passSignals = /\b(pass|passed|yes|good|correct|acceptable)\b/i;
      const failSignals = /\b(fail|failed|no|bad|incorrect|unacceptable)\b/i;

      let passed: boolean;
      if (scoreMatch) {
        passed = score >= 0.7;
      } else if (passSignals.test(response)) {
        passed = !failSignals.test(response);
      } else {
        passed = false;
      }

      return {
        rule_id: rule.rule_id,
        passed,
        score: scoreMatch ? score : (passed ? 0.8 : 0.2),
        reason: response.slice(0, 500),
      };
    } catch (err: any) {
      return {
        rule_id: rule.rule_id,
        passed: false,
        score: 0,
        reason: `LLM judge error: ${err.message}`,
      };
    }
  }

  /**
   * Convert a simple JSON schema description to a Zod schema for validation.
   */
  private jsonToZodSchema(desc: any): z.ZodTypeAny {
    if (!desc || !desc.type) return z.any();

    switch (desc.type) {
      case 'string': return z.string();
      case 'number': return z.number();
      case 'boolean': return z.boolean();
      case 'array':
        return z.array(desc.items ? this.jsonToZodSchema(desc.items) : z.any());
      case 'object': {
        if (!desc.properties) return z.object({}).passthrough();
        const shape: Record<string, z.ZodTypeAny> = {};
        const required = new Set(desc.required ?? []);
        for (const [key, propDesc] of Object.entries(desc.properties)) {
          const propSchema = this.jsonToZodSchema(propDesc);
          shape[key] = required.has(key) ? propSchema : propSchema.optional();
        }
        return z.object(shape).passthrough();
      }
      default: return z.any();
    }
  }
}
