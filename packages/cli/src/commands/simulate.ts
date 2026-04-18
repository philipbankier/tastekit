import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { getGlobalOptions, detail, handleError, jsonOutput } from '../ui.js';

type JsonRecord = Record<string, unknown>;

interface CompiledArtifacts {
  constitution: any;
  guardrails: any;
  memory: any;
  skills: any;
  config?: any;
  session?: any;
  bindings?: any;
}

interface GuardrailTrigger {
  kind: 'permission' | 'approval' | 'rate_limit';
  id: string;
  source: string;
  tool_ref?: string;
  match_reasons: string[];
}

const EXPORT_ADAPTERS = ['claude-code', 'openclaw', 'manus', 'autopilots'];

export const simulateCommand = new Command('simulate')
  .description('Dry-run a compiled TasteKit agent')
  .option('--scenario <text>', 'Hypothetical user request to test against compiled guardrails')
  .action(async (options: { scenario?: string }, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = join(process.cwd(), '.tastekit');

    if (!existsSync(workspacePath)) {
      handleError(new Error('No TasteKit workspace found. Run `tastekit init` first.'));
    }

    try {
      const compiled = loadCompiledArtifacts(workspacePath);
      const summary = buildSimulationSummary(compiled);
      const scenario = options.scenario
        ? {
            text: options.scenario,
            triggered_guardrails: matchScenarioAgainstGuardrails(options.scenario, compiled.guardrails),
          }
        : undefined;

      if (globals.json) {
        jsonOutput({
          ...summary,
          scenario,
        });
        return;
      }

      renderPlainText(summary, scenario);
    } catch (error) {
      handleError(error);
    }
  });

function loadCompiledArtifacts(workspacePath: string): CompiledArtifacts {
  const constitution = readArtifact(workspacePath, [
    'constitution.v1.json',
    'self/constitution.v1.json',
  ]);
  const guardrails = readArtifact(workspacePath, [
    'guardrails.v1.yaml',
    'self/guardrails.v1.yaml',
  ]);
  const memory = readArtifact(workspacePath, [
    'memory.v1.yaml',
    'self/memory.v1.yaml',
  ]);
  const skills = readArtifact(workspacePath, [
    'skills/manifest.v1.yaml',
    'knowledge/skills/manifest.v1.yaml',
  ]);

  if (!constitution || !guardrails || !memory || !skills) {
    throw new Error('Compiled artifacts not found. Run `tastekit compile` first.');
  }

  const config = readOptionalArtifact(workspacePath, ['tastekit.yaml']);
  const session = readOptionalArtifact(workspacePath, ['session.json']);
  const bindings = readOptionalArtifact(workspacePath, ['bindings.v1.json']);

  return { constitution, guardrails, memory, skills, config, session, bindings };
}

function readOptionalArtifact(workspacePath: string, candidates: string[]): any | undefined {
  for (const relativePath of candidates) {
    const artifactPath = join(workspacePath, relativePath);
    if (!existsSync(artifactPath)) continue;
    return parseYamlOrJson(readFileSync(artifactPath, 'utf-8'));
  }
  return undefined;
}

function readArtifact(workspacePath: string, candidates: string[]): any {
  const artifact = readOptionalArtifact(workspacePath, candidates);
  if (!artifact) {
    return null;
  }
  return artifact;
}

function parseYamlOrJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return YAML.parse(raw);
  }
}

function buildSimulationSummary(compiled: CompiledArtifacts): JsonRecord {
  const principleCount = compiled.constitution?.principles?.length ?? 0;
  const permissionCount = compiled.guardrails?.permissions?.length ?? 0;
  const approvalCount = compiled.guardrails?.approvals?.length ?? 0;
  const rateLimitCount = compiled.guardrails?.rate_limits?.length ?? 0;
  const guardrailCount = permissionCount + approvalCount + rateLimitCount;
  const skillCount = compiled.skills?.skills?.length ?? 0;
  const autonomyValue = Number(compiled.constitution?.tradeoffs?.autonomy_level ?? 0);
  const autonomy = describeAutonomy(autonomyValue);
  const memory = summarizeMemoryPolicy(compiled.memory);
  const domain = compiled.config?.domain_id || compiled.session?.domain_id || 'general-agent';
  const mcpServers = compiled.bindings?.servers ?? [];

  return {
    domain,
    principles: principleCount,
    guardrails: guardrailCount,
    skills: skillCount,
    adapters: EXPORT_ADAPTERS,
    autonomy,
    memory_policy: memory,
    guardrail_breakdown: {
      permissions: permissionCount,
      approvals: approvalCount,
      rate_limits: rateLimitCount,
    },
    mcp: {
      servers: mcpServers.length,
      tools: mcpServers.flatMap((server: any) => server.tools ?? []).length,
    },
  };
}

function describeAutonomy(value: number): { value: number; level: string; meaning: string } {
  if (value < 0.25) {
    return { value, level: 'low', meaning: 'Asks before most actions and keeps changes tightly scoped.' };
  }
  if (value < 0.5) {
    return { value, level: 'medium', meaning: 'Acts on safe reads and contained work, escalates risky changes.' };
  }
  if (value < 0.85) {
    return { value, level: 'high', meaning: 'Executes most tasks independently and pauses for destructive operations.' };
  }
  return { value, level: 'full', meaning: 'Operates with minimal intervention and only escalates hard safety boundaries.' };
}

function summarizeMemoryPolicy(memory: any): JsonRecord {
  return {
    runtime_target: memory?.runtime_target ?? 'generic',
    stores: memory?.stores?.length ?? 0,
    update_mode: memory?.write_policy?.update_mode ?? 'append',
    salience_rules: memory?.write_policy?.salience_rules?.length ?? 0,
    revisit_triggers: memory?.write_policy?.revisit_triggers ?? [],
    pii_handling: memory?.write_policy?.pii_handling ?? {},
    ttl_days: memory?.retention_policy?.ttl_days ?? null,
    prune_strategy: memory?.retention_policy?.prune_strategy ?? 'manual',
  };
}

function matchScenarioAgainstGuardrails(scenario: string, guardrails: any): GuardrailTrigger[] {
  const normalizedScenario = scenario.toLowerCase();
  const permissions = guardrails?.permissions ?? [];
  const approvals = guardrails?.approvals ?? [];
  const rateLimits = guardrails?.rate_limits ?? [];

  const matches: GuardrailTrigger[] = [];

  for (const permission of permissions) {
    const reasons = collectPermissionReasons(normalizedScenario, permission);
    if (reasons.length === 0) continue;
    matches.push({
      kind: 'permission',
      id: permission.scope_id,
      source: permission.source ?? 'compiled',
      tool_ref: permission.tool_ref,
      match_reasons: reasons,
    });
  }

  for (const approval of approvals) {
    const reasons = collectApprovalReasons(normalizedScenario, approval.when);
    if (reasons.length === 0) continue;
    matches.push({
      kind: 'approval',
      id: approval.rule_id,
      source: approval.source ?? 'compiled',
      match_reasons: reasons,
    });
  }

  for (const rateLimit of rateLimits) {
    const reasons = collectTextMatches(normalizedScenario, [rateLimit.tool_ref]);
    if (reasons.length === 0) continue;
    matches.push({
      kind: 'rate_limit',
      id: `${rateLimit.tool_ref}:${rateLimit.window}`,
      source: rateLimit.source ?? 'compiled',
      tool_ref: rateLimit.tool_ref,
      match_reasons: reasons.map((reason) => `tool match: ${reason}`),
    });
  }

  return matches;
}

function collectPermissionReasons(normalizedScenario: string, permission: any): string[] {
  const reasons: string[] = [];
  const toolMatches = collectTextMatches(normalizedScenario, [permission.tool_ref]);
  if (toolMatches.length > 0) {
    reasons.push(...toolMatches.map((match) => `tool_ref matched ${match}`));
  }

  for (const op of permission.ops ?? []) {
    if (normalizedScenario.includes(String(op).toLowerCase())) {
      reasons.push(`op matched ${op}`);
    }
  }

  const resourceMatches = collectTextMatches(normalizedScenario, permission.resources ?? []);
  if (resourceMatches.length > 0) {
    reasons.push(...resourceMatches.map((match) => `resource matched ${match}`));
  }

  return reasons;
}

function collectApprovalReasons(normalizedScenario: string, whenExpression: string): string[] {
  const reasons = new Set<string>();
  const quotedTerms = Array.from(whenExpression.matchAll(/"([^"]+)"/g)).map((match) => match[1]);

  for (const term of quotedTerms) {
    const normalizedTerm = normalizePattern(term);
    if (normalizedTerm && normalizedScenario.includes(normalizedTerm)) {
      reasons.add(`expression matched "${term}"`);
    }
  }

  for (const op of ['read', 'write', 'delete', 'execute', 'post', 'publish', 'admin']) {
    if (whenExpression.toLowerCase().includes(op) && normalizedScenario.includes(op)) {
      reasons.add(`expression matched op ${op}`);
    }
  }

  return Array.from(reasons);
}

function collectTextMatches(normalizedScenario: string, patterns: string[]): string[] {
  const matches: string[] = [];

  for (const pattern of patterns) {
    const normalizedPattern = normalizePattern(pattern);
    if (!normalizedPattern) continue;

    if (normalizedPattern === '*' || normalizedPattern === '*:*') {
      continue;
    }

    const fragments = normalizedPattern
      .split(/[:/|]/)
      .map((fragment) => fragment.trim())
      .filter((fragment) => fragment.length >= 3 && fragment !== '*');

    if (fragments.some((fragment) => normalizedScenario.includes(fragment))) {
      matches.push(pattern);
    }
  }

  return matches;
}

function normalizePattern(value: string): string {
  return value.toLowerCase().replace(/[*"]/g, '').trim();
}

function renderPlainText(summary: JsonRecord, scenario?: { text: string; triggered_guardrails: GuardrailTrigger[] }): void {
  console.log(chalk.bold('TasteKit Simulation'));
  console.log('');
  detail('Domain', String(summary.domain));
  detail('Principles', String(summary.principles));
  detail('Guardrails', `${summary.guardrails} total`);
  detail('Skills', String(summary.skills));
  detail('Export adapters', (summary.adapters as string[]).join(', '));

  const autonomy = summary.autonomy as { value: number; level: string; meaning: string };
  console.log('');
  detail('Autonomy', `${autonomy.level} (${autonomy.value.toFixed(2)})`);
  console.log(chalk.gray(`  ${autonomy.meaning}`));

  const memory = summary.memory_policy as ReturnType<typeof summarizeMemoryPolicy>;
  console.log('');
  detail('Memory runtime', String(memory.runtime_target));
  detail('Memory stores', String(memory.stores));
  detail('Update mode', String(memory.update_mode));
  detail('Retention', memory.ttl_days ? `${memory.ttl_days} days / ${memory.prune_strategy}` : String(memory.prune_strategy));

  const mcp = summary.mcp as { servers: number; tools: number };
  if (mcp.servers > 0) {
    console.log('');
    detail('MCP servers', String(mcp.servers));
    detail('MCP tools', String(mcp.tools));
  }

  if (!scenario) return;

  console.log('');
  console.log(chalk.bold('Scenario Check'));
  console.log(chalk.gray(`  ${scenario.text}`));

  if (scenario.triggered_guardrails.length === 0) {
    console.log(chalk.gray('  No guardrails matched this scenario.'));
    return;
  }

  for (const trigger of scenario.triggered_guardrails) {
    const sourceSuffix = trigger.source === 'mcp' ? chalk.cyan(' [mcp]') : '';
    console.log(`  ${chalk.cyan(trigger.kind)} ${chalk.bold(trigger.id)}${sourceSuffix}`);
    if (trigger.tool_ref) {
      console.log(chalk.gray(`    tool: ${trigger.tool_ref}`));
    }
    console.log(chalk.gray(`    ${trigger.match_reasons.join('; ')}`));
  }
}
