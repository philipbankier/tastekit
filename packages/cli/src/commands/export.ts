import { Command, createOption } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { generateAgentsMd } from '@actrun_ai/tastekit-core/generators';
import { resolveArtifactPath, resolveSkillsPath } from '@actrun_ai/tastekit-core/utils';
import { detail, hint, handleError } from '../ui.js';

const ADAPTERS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'manus': 'Manus',
  'openclaw': 'OpenClaw',
  'autopilots': 'Autopilots',
};

export const exportCommand = new Command('export')
  .description('Export to runtime adapter format')
  .addOption(createOption('--target <adapter>', 'Target adapter').choices(['claude-code', 'manus', 'openclaw', 'autopilots', 'agents-md', 'agent-file']))
  .option('--out <dir>', 'Output directory', './export')
  .action(async (options) => {
    if (!options.target) {
      console.error(chalk.red('Please specify a target adapter with --target'));
      console.log(chalk.gray('Available targets: claude-code, manus, openclaw, autopilots, agents-md, agent-file'));
      process.exit(1);
    }

    const workspacePath = process.cwd();
    const tastekitDir = join(workspacePath, '.tastekit');

    if (!existsSync(tastekitDir)) {
      console.error(chalk.red('No .tastekit directory found. Run `tastekit init` first.'));
      process.exit(1);
    }

    const constitutionPath = resolveArtifactPath(tastekitDir, 'constitution');
    if (!existsSync(constitutionPath)) {
      console.error(chalk.red('No compiled artifacts found. Run `tastekit compile` first.'));
      process.exit(1);
    }

    // Handle Agent File (.af) export
    if (options.target === 'agent-file') {
      const spinner = ora('Generating Agent File (.af) from TasteKit artifacts...').start();
      try {
        const constitution = parseYamlOrJson(constitutionPath);

        // Read guardrails if available
        const guardrailsPath = resolveArtifactPath(tastekitDir, 'guardrails');
        const guardrails = existsSync(guardrailsPath)
          ? parseYamlOrJson(guardrailsPath)
          : null;

        const af = generateAgentFile(constitution, guardrails);
        const outDir = options.out === './export' ? workspacePath : options.out;
        mkdirSync(outDir, { recursive: true });
        const outPath = join(outDir, 'agent.af');
        writeFileSync(outPath, JSON.stringify(af, null, 2), 'utf-8');
        spinner.succeed(chalk.green(`Agent File exported to ${outPath}`));
      } catch (error) {
        handleError(error, spinner);
      }
      return;
    }

    // Handle AGENTS.md export as a special case
    if (options.target === 'agents-md') {
      const spinner = ora('Generating AGENTS.md from TasteKit artifacts...').start();
      try {
        const constitution = parseYamlOrJson(constitutionPath);
        const skillsManifestPath = join(resolveSkillsPath(tastekitDir), 'manifest.v1.yaml');
        const skills = existsSync(skillsManifestPath)
          ? parseYamlOrJson(skillsManifestPath)
          : undefined;
        const configPath = join(tastekitDir, 'tastekit.yaml');
        const config = existsSync(configPath)
          ? parseYamlOrJson(configPath)
          : undefined;
        const agentsMd = generateAgentsMd({
          generator_version: constitution.generator_version || '0.5.0',
          constitution,
          skills,
          domain_id: config?.domain_id,
        });
        const outPath = join(options.out === './export' ? workspacePath : options.out, 'AGENTS.md');
        mkdirSync(join(outPath, '..'), { recursive: true });
        writeFileSync(outPath, agentsMd, 'utf-8');
        spinner.succeed(chalk.green(`AGENTS.md exported to ${outPath}`));
      } catch (error) {
        handleError(error, spinner);
      }
      return;
    }

    if (!ADAPTERS[options.target]) {
      console.error(chalk.red(`Unknown adapter: ${options.target}`));
      console.log(chalk.gray(`Available: ${Object.keys(ADAPTERS).join(', ')}, agents-md`));
      process.exit(1);
    }

    const spinner = ora(`Exporting to ${ADAPTERS[options.target]} format...`).start();

    try {
      // Dynamically load the adapter
      const adapterModule = await loadAdapter(options.target);
      const adapter = new adapterModule();

      const outDir = options.out;
      mkdirSync(outDir, { recursive: true });

      await adapter.export(tastekitDir, outDir, {
        includeSkills: true,
        includePlaybooks: true,
      });

      spinner.succeed(chalk.green(`Exported to ${outDir}/`));
      detail('Target', ADAPTERS[options.target]);
      detail('Files written to', `${outDir}/`);
    } catch (error) {
      handleError(error, spinner);
    }
  });

async function loadAdapter(target: string): Promise<any> {
  switch (target) {
    case 'claude-code': {
      const mod = await import('@actrun_ai/tastekit-adapters/claude-code');
      return mod.ClaudeCodeAdapter;
    }
    case 'manus': {
      const mod = await import('@actrun_ai/tastekit-adapters/manus');
      return mod.ManusAdapter;
    }
    case 'openclaw': {
      const mod = await import('@actrun_ai/tastekit-adapters/openclaw');
      return mod.OpenClawAdapter;
    }
    case 'autopilots': {
      const mod = await import('@actrun_ai/tastekit-adapters/autopilots');
      return mod.AutopilotsAdapter;
    }
    default:
      throw new Error(`Unknown adapter: ${target}`);
  }
}

function parseYamlOrJson(path: string): any {
  const content = readFileSync(path, 'utf-8');

  try {
    return JSON.parse(content);
  } catch {
    return YAML.parse(content);
  }
}

/**
 * Generate a Letta Agent File (.af) v2 from TasteKit artifacts.
 *
 * Maps constitution principles to a persona block, tone to system prompt,
 * and guardrails to tool_rules.
 */
function generateAgentFile(constitution: any, guardrails: any): any {
  const blocks: any[] = [];
  let blockIndex = 1;

  // Persona block from principles
  const personaLines: string[] = [];
  if (constitution.principles?.length > 0) {
    for (const p of constitution.principles) {
      personaLines.push(`- ${p.statement}`);
    }
  }
  if (constitution.tone?.voice_keywords?.length > 0) {
    personaLines.push('');
    personaLines.push(`Voice: ${constitution.tone.voice_keywords.join(', ')}`);
  }

  blocks.push({
    id: `block-${blockIndex++}`,
    label: 'persona',
    value: personaLines.join('\n') || 'A helpful assistant.',
    limit: 5000,
    description: 'Agent personality and behavioral guidance. Generated by TasteKit.',
    read_only: false,
    is_template: false,
    template_name: null,
  });

  // Preferences block from tone/tradeoffs
  const prefLines: string[] = [];
  if (constitution.tone?.forbidden_phrases?.length > 0) {
    prefLines.push('Avoid these phrases:');
    for (const phrase of constitution.tone.forbidden_phrases) {
      prefLines.push(`- "${phrase}"`);
    }
  }
  if (constitution.tone?.formatting_rules?.length > 0) {
    prefLines.push('');
    prefLines.push('Formatting:');
    for (const rule of constitution.tone.formatting_rules) {
      prefLines.push(`- ${rule}`);
    }
  }
  if (prefLines.length > 0) {
    blocks.push({
      id: `block-${blockIndex++}`,
      label: 'preferences',
      value: prefLines.join('\n'),
      limit: 5000,
      description: 'User preferences and constraints. Generated by TasteKit.',
      read_only: true,
      is_template: false,
      template_name: null,
    });
  }

  // Taboos as a read-only constraints block
  const tabooItems = constitution.taboos?.never_do || constitution.taboos || [];
  if (tabooItems.length > 0) {
    const tabooLines = ['Restrictions (never do):'];
    for (const taboo of tabooItems) {
      tabooLines.push(`- ${typeof taboo === 'string' ? taboo : taboo.statement || JSON.stringify(taboo)}`);
    }
    const escalateItems = constitution.taboos?.must_escalate || [];
    if (escalateItems.length > 0) {
      tabooLines.push('');
      tabooLines.push('Must escalate to human:');
      for (const item of escalateItems) {
        tabooLines.push(`- ${item}`);
      }
    }
    blocks.push({
      id: `block-${blockIndex++}`,
      label: 'custom_instructions',
      value: tabooLines.join('\n'),
      limit: 5000,
      description: 'Safety constraints and escalation rules. Generated by TasteKit.',
      read_only: true,
      is_template: false,
      template_name: null,
    });
  }

  // Build system prompt
  const systemLines: string[] = [
    'You are an AI assistant configured via TasteKit.',
  ];
  if (constitution.evidence_policy?.require_citations_for?.length > 0) {
    systemLines.push(`You must provide citations for: ${constitution.evidence_policy.require_citations_for.join(', ')}.`);
  }
  if (constitution.evidence_policy?.uncertainty_language_rules?.length > 0) {
    for (const rule of constitution.evidence_policy.uncertainty_language_rules) {
      systemLines.push(rule);
    }
  }

  // Map guardrails to tool_rules
  const toolRules: any[] = [];
  if (guardrails?.approvals) {
    for (const approval of guardrails.approvals) {
      if (approval.action === 'require_approval') {
        toolRules.push({
          type: 'require_approval',
          tool_name: '*',
          condition: approval.when,
        });
      }
    }
  }

  const agent: any = {
    id: 'agent-1',
    name: 'tastekit-agent',
    agent_type: 'letta_v1_agent',
    system: systemLines.join('\n'),
    description: `Agent generated from TasteKit constitution (v${constitution.generator_version || '0.5.0'})`,
    block_ids: blocks.map(b => b.id),
    tool_ids: [],
    tool_rules: toolRules.length > 0 ? toolRules : undefined,
    tags: ['origin:tastekit'],
    messages: [],
  };

  return {
    agents: [agent],
    groups: [],
    blocks,
    files: [],
    sources: [],
    tools: [],
    mcp_servers: [],
    metadata: {
      generator: 'tastekit',
      generator_version: constitution.generator_version || '0.5.0',
      exported_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };
}
