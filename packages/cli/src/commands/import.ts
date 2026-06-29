import { Command, createOption } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { detail, hint, handleError } from '../ui.js';
import { ConstitutionV1Schema, type ConstitutionV1 } from '@kairox_ai/tastekit-core/schemas';
import { getCliPackageVersion } from '../version.js';

function principleIdFromStatement(statement: string, index: number, used: Set<string>): string {
  const slug = statement.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  const base = slug.length > 0 ? slug : `unnamed_principle_${index}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  used.add(candidate);
  return candidate;
}

function writeValidatedConstitution(constitutionPath: string, constitution: ConstitutionV1, spinner: ReturnType<typeof ora>): void {
  const validation = ConstitutionV1Schema.safeParse(constitution);
  if (!validation.success) {
    const issues = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    spinner.fail(chalk.red(`Imported artifact fails ConstitutionV1Schema: ${issues}`));
    throw new Error(`tastekit import produced an invalid constitution.v1 artifact: ${issues}`);
  }
  writeFileSync(constitutionPath, JSON.stringify(validation.data, null, 2), 'utf-8');
}

export const importCommand = new Command('import')
  .description('Import from runtime format, SOUL.md, or Agent File (.af)')
  .addOption(createOption('--target <adapter>', 'Source format').choices(['claude-code', 'manus', 'openclaw', 'autopilots', 'soul-md', 'agent-file']))
  .option('--source <path>', 'Source path or directory')
  .action(async (options) => {
    if (!options.target) {
      console.error(chalk.red('Please specify a source format with --target'));
      console.log(chalk.gray('Available: claude-code, manus, openclaw, autopilots, soul-md, agent-file'));
      process.exit(1);
    }

    if (!options.source) {
      console.error(chalk.red('Please specify a source path with --source'));
      process.exit(1);
    }

    if (options.target === 'soul-md') {
      await importSoulMd(options.source);
      return;
    }

    if (options.target === 'agent-file') {
      await importAgentFile(options.source);
      return;
    }

    console.error(chalk.yellow(`Import from ${options.target} adapter format not yet implemented.`));
    console.log(chalk.cyan('Use --target soul-md or --target agent-file to import.'));
    process.exit(1);
  });

/**
 * Import from OpenClaw SOUL.md and IDENTITY.md files into TasteKit constitution.
 */
async function importSoulMd(sourcePath: string): Promise<void> {
  const spinner = ora('Importing from SOUL.md...').start();

  try {
    // Try to find SOUL.md and IDENTITY.md
    const soulPath = existsSync(join(sourcePath, 'SOUL.md'))
      ? join(sourcePath, 'SOUL.md')
      : existsSync(sourcePath) && sourcePath.endsWith('.md')
        ? sourcePath
        : null;

    if (!soulPath) {
      spinner.fail(chalk.red(`SOUL.md not found at ${sourcePath}`));
      process.exit(1);
    }

    const soulContent = readFileSync(soulPath, 'utf-8');

    // Try to read IDENTITY.md from same directory
    const identityPath = join(soulPath, '..', 'IDENTITY.md');
    const identityContent = existsSync(identityPath)
      ? readFileSync(identityPath, 'utf-8')
      : null;

    // Parse SOUL.md sections
    const sections = parseMdSections(soulContent);
    const identitySections = identityContent ? parseMdSections(identityContent) : {};

    // Build constitution from parsed content
    const constitution = buildConstitutionFromSoul(sections, identitySections);

    // Write to .tastekit/
    const tastekitDir = join(process.cwd(), '.tastekit');
    const constitutionPath = join(tastekitDir, 'constitution.v1.json');
    mkdirSync(tastekitDir, { recursive: true });

    writeValidatedConstitution(constitutionPath, constitution, spinner);

    spinner.succeed(chalk.green('Imported SOUL.md into TasteKit constitution'));
    console.log('');
    detail('SOUL.md', soulPath);
    if (identityContent) {
      detail('IDENTITY.md', identityPath);
    }
    detail('Artifact', constitutionPath);
    console.log('');
    hint('tastekit compile', 'generate remaining artifacts');
  } catch (error) {
    handleError(error, spinner);
  }
}

function parseMdSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.split('\n');
  let currentSection = '_preamble';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = headingMatch[1].trim().toLowerCase();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

/**
 * Import from Letta Agent File (.af) format into TasteKit constitution.
 *
 * Extracts persona/soul/preferences blocks and agent system prompt.
 * Ignores runtime state (messages, llm_config, tools).
 */
async function importAgentFile(sourcePath: string): Promise<void> {
  const spinner = ora('Importing from Agent File (.af)...').start();

  try {
    if (!existsSync(sourcePath)) {
      spinner.fail(chalk.red(`File not found: ${sourcePath}`));
      process.exit(1);
    }

    const raw = readFileSync(sourcePath, 'utf-8');
    const af = JSON.parse(raw);

    // Support both v2 (top-level arrays) and v1 (flat agent) formats
    const agents = af.agents || (af.agent_type ? [af] : []);
    const blocks = af.blocks || [];

    if (agents.length === 0) {
      spinner.fail(chalk.red('No agents found in the .af file'));
      process.exit(1);
    }

    const agent = agents[0];

    // Resolve blocks referenced by the agent
    const agentBlockIds = new Set(agent.block_ids || []);
    const agentBlocks: Array<{ label: string; value: string; read_only?: boolean }> =
      blocks.filter((b: any) => agentBlockIds.has(b.id));

    // If no block_ids, try inline blocks or use all blocks
    if (agentBlocks.length === 0 && blocks.length > 0) {
      agentBlocks.push(...blocks);
    }

    const constitution = buildConstitutionFromAgentFile(agent, agentBlocks);

    // Write to .tastekit/
    const tastekitDir = join(process.cwd(), '.tastekit');
    const constitutionPath = join(tastekitDir, 'constitution.v1.json');
    mkdirSync(tastekitDir, { recursive: true });

    writeValidatedConstitution(constitutionPath, constitution, spinner);

    spinner.succeed(chalk.green('Imported Agent File (.af) into TasteKit constitution'));
    console.log('');
    detail('Agent File', sourcePath);
    detail('Agent', agent.name || 'unnamed');
    detail('Blocks found', String(agentBlocks.length));
    detail('Artifact', constitutionPath);
    console.log('');
    hint('tastekit compile', 'generate remaining artifacts');
  } catch (error) {
    handleError(error, spinner);
  }
}

function buildConstitutionFromAgentFile(
  agent: any,
  blocks: Array<{ label: string; value: string; read_only?: boolean }>
): ConstitutionV1 {
  const rawStatements: string[] = [];

  const personalityBlocks = ['persona', 'soul', 'custom_instructions'];
  for (const block of blocks) {
    if (!personalityBlocks.includes(block.label)) continue;
    const bullets = block.value.split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.replace(/^[\s*-]+/, '').trim())
      .filter(l => l.length > 0);
    if (bullets.length > 0) {
      rawStatements.push(...bullets);
    } else if (block.value.trim().length > 0) {
      rawStatements.push(...block.value.split('\n').map(l => l.trim()).filter(Boolean));
    }
  }

  if (rawStatements.length === 0 && agent.system) {
    rawStatements.push(...agent.system.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 10).slice(0, 10));
  }

  if (rawStatements.length === 0) {
    rawStatements.push("Apply the imported agent's general taste when no specific principle applies.");
  }

  const usedIds = new Set<string>();
  return finalizeImportedConstitution({
    rawStatements,
    voiceKeywords: blocks
      .filter(b => ['preferences', 'conversation_patterns'].includes(b.label))
      .flatMap(b => b.value.split(/[,\n]/).map(w => w.replace(/^[\s*-]+/, '').trim()).filter(w => w.length > 0 && w.length < 30))
      .slice(0, 10),
    forbiddenPhrases: blocks
      .filter(b => b.read_only && b.label !== 'persona')
      .flatMap(b => b.value.split('\n')
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
        .map(l => l.replace(/^[\s*-]+/, '').trim())
        .filter(l => l.length > 0 && /never|avoid|don't/i.test(l)))
      .slice(0, 10),
    importMetadata: {
      source: 'agent-file',
      imported_at: new Date().toISOString(),
      ...(agent.name ? { agent_name: agent.name } : {}),
      ...(agent.description ? { agent_description: agent.description } : {}),
    },
    usedIds,
  });
}

function buildConstitutionFromSoul(
  soul: Record<string, string>,
  identity: Record<string, string>
): ConstitutionV1 {
  const rawStatements: string[] = [];

  for (const [section, content] of Object.entries(soul)) {
    if (section === '_preamble') continue;
    const bullets = content.split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.replace(/^[\s*-]+/, '').trim())
      .filter(l => l.length > 0);
    if (bullets.length > 0) {
      rawStatements.push(...bullets);
    } else if (content.trim().length > 0) {
      rawStatements.push(content.trim().split('\n')[0]);
    }
  }

  if (rawStatements.length === 0) {
    rawStatements.push("Apply the imported SOUL's general taste when no specific principle applies.");
  }

  const voiceKeywords: string[] = [];
  for (const key of ['voice', 'tone', 'personality', 'communication style']) {
    const content = soul[key] || identity[key];
    if (!content) continue;
    voiceKeywords.push(
      ...content.split(/[,\n]/).map(w => w.replace(/^[\s*-]+/, '').trim()).filter(w => w.length > 0 && w.length < 30),
    );
  }

  const forbiddenPhrases: string[] = [];
  for (const key of ['avoid', "don't", 'never', 'restrictions', 'taboos']) {
    const content = soul[key];
    if (!content) continue;
    forbiddenPhrases.push(
      ...content.split('\n')
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
        .map(l => l.replace(/^[\s*-]+/, '').trim())
        .filter(l => l.length > 0),
    );
  }

  const usedIds = new Set<string>();
  return finalizeImportedConstitution({
    rawStatements,
    voiceKeywords: voiceKeywords.slice(0, 10),
    forbiddenPhrases: forbiddenPhrases.slice(0, 10),
    importMetadata: {
      source: 'soul-md',
      imported_at: new Date().toISOString(),
    },
    usedIds,
  });
}

function finalizeImportedConstitution(input: {
  rawStatements: string[];
  voiceKeywords: string[];
  forbiddenPhrases: string[];
  importMetadata: Record<string, unknown>;
  usedIds: Set<string>;
}): ConstitutionV1 {
  const statements = input.rawStatements.slice(0, 20);
  const principles = statements.map((statement, index) => ({
    id: principleIdFromStatement(statement, index, input.usedIds),
    priority: index + 1,
    statement,
    rationale: `Imported from ${input.importMetadata.source}`,
    applies_to: ['*'],
  }));

  return {
    schema_version: 'constitution.v1',
    generated_at: new Date().toISOString(),
    generator_version: getCliPackageVersion(),
    user_scope: 'single_user',
    principles,
    tone: {
      voice_keywords: input.voiceKeywords,
      forbidden_phrases: input.forbiddenPhrases,
      formatting_rules: [],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.5,
      cost_sensitivity: 0.5,
      autonomy_level: 0.5,
    },
    evidence_policy: {
      require_citations_for: [],
      uncertainty_language_rules: [],
    },
    taboos: {
      never_do: input.forbiddenPhrases.slice(0, 5),
      must_escalate: [],
    },
    extensions: {
      'x-tastekit-import': input.importMetadata,
    },
  };
}
