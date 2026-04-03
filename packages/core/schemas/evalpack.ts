import { z } from 'zod';

/**
 * EvalPack v1 Schema
 * 
 * Evaluation scenarios with setup, expectations, and judging criteria.
 */

export const EvalScenarioSetupSchema = z.object({
  inputs: z.record(z.any()).describe('Input data for the scenario'),
  resources: z.array(z.string()).optional().describe('Required resources'),
  context: z.string().optional().describe('Additional context'),
});

export const EvalScenarioExpectedSchema = z.object({
  rubrics: z.array(z.string()).describe('Rubric identifiers to apply'),
  thresholds: z.record(z.number()).describe('Minimum scores by rubric'),
  required_outputs: z.array(z.string()).optional().describe('Required output fields'),
});

export const EvalJudgingRuleSchema = z.object({
  rule_id: z.string(),
  type: z.enum(['deterministic', 'llm_judge', 'regex', 'schema']),
  pattern: z.string().optional().describe('Pattern for regex/schema rules'),
  template: z.string().optional().describe('LLM judge prompt template'),
  weight: z.number().min(0).max(1).default(1),
});

export const EvalJudgingSchema = z.object({
  rules: z.array(EvalJudgingRuleSchema),
  output_format: z.string().describe('Required output format'),
});

export const EvalScenarioSchema = z.object({
  scenario_id: z.string(),
  name: z.string(),
  description: z.string(),
  setup: EvalScenarioSetupSchema,
  expected: EvalScenarioExpectedSchema,
});

export const EvalPackV1Schema = z.object({
  schema_version: z.literal('evalpack.v1'),
  
  id: z.string(),
  name: z.string(),
  description: z.string(),
  
  scenarios: z.array(EvalScenarioSchema),
  judging: EvalJudgingSchema,
});

export type EvalPackV1 = z.infer<typeof EvalPackV1Schema>;
export type EvalScenario = z.infer<typeof EvalScenarioSchema>;
export type EvalScenarioSetup = z.infer<typeof EvalScenarioSetupSchema>;
export type EvalScenarioExpected = z.infer<typeof EvalScenarioExpectedSchema>;
export type EvalJudging = z.infer<typeof EvalJudgingSchema>;
export type EvalJudgingRule = z.infer<typeof EvalJudgingRuleSchema>;
