import { Command, createOption } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { detail, hint, handleError } from '../ui.js';

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

    writeFileSync(
      constitutionPath,
      JSON.stringify(constitution, null, 2),
      'utf-8'
    );

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

    writeFileSync(
      constitutionPath,
      JSON.stringify(constitution, null, 2),
      'utf-8'
    );

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
): any {
  const principles: any[] = [];
  let priority = 1;

  // Extract personality from persona/soul blocks
  const personalityBlocks = ['persona', 'soul', 'custom_instructions'];
  for (const block of blocks) {
    if (personalityBlocks.includes(block.label)) {
      const bullets = block.value.split('\n')
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
        .map(l => l.replace(/^[\s*-]+/, '').trim())
        .filter(l => l.length > 0);

      if (bullets.length > 0) {
        for (const bullet of bullets) {
          principles.push({
            id: `af_${block.label}_${priority}`,
            statement: bullet,
            priority: priority++,
            applies_to: ['*'],
          });
        }
      } else if (block.value.trim().length > 0) {
        // Treat the whole block as a principle
        for (const line of block.value.split('\n').filter(l => l.trim().length > 0)) {
          principles.push({
            id: `af_${block.label}_${priority}`,
            statement: line.trim(),
            priority: priority++,
            applies_to: ['*'],
          });
        }
      }
    }
  }

  // Extract from system prompt if no blocks yielded principles
  if (principles.length === 0 && agent.system) {
    const lines = agent.system.split('\n')
      .filter((l: string) => l.trim().length > 10)
      .slice(0, 10);
    for (const line of lines) {
      principles.push({
        id: `af_system_${priority}`,
        statement: line.trim(),
        priority: priority++,
        applies_to: ['*'],
      });
    }
  }

  // Extract voice keywords from personality-related blocks
  const voiceKeywords: string[] = [];
  const preferenceBlocks = ['preferences', 'conversation_patterns'];
  for (const block of blocks) {
    if (preferenceBlocks.includes(block.label)) {
      const words = block.value.split(/[,\n]/)
        .map(w => w.replace(/^[\s*-]+/, '').trim())
        .filter(w => w.length > 0 && w.length < 30);
      voiceKeywords.push(...words.slice(0, 5));
    }
  }

  // Check for read-only blocks that might be constraints
  const forbiddenPhrases: string[] = [];
  for (const block of blocks) {
    if (block.read_only && block.label !== 'persona') {
      const lines = block.value.split('\n')
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
        .map(l => l.replace(/^[\s*-]+/, '').trim())
        .filter(l => l.length > 0 && (l.toLowerCase().includes('never') || l.toLowerCase().includes('avoid') || l.toLowerCase().includes("don't")));
      forbiddenPhrases.push(...lines.slice(0, 5));
    }
  }

  return {
    schema_version: 'constitution.v1',
    generator_version: '0.5.0',
    principles: principles.slice(0, 20),
    tone: {
      voice_keywords: voiceKeywords.slice(0, 10),
      forbidden_phrases: forbiddenPhrases.slice(0, 10),
    },
    tradeoffs: {
      autonomy_level: 'medium',
    },
    evidence_policy: {
      require_citations_for: [],
    },
    taboos: forbiddenPhrases.slice(0, 5),
    imported_from: 'agent-file',
    imported_at: new Date().toISOString(),
    agent_name: agent.name || undefined,
    agent_description: agent.description || undefined,
  };
}

function buildConstitutionFromSoul(
  soul: Record<string, string>,
  identity: Record<string, string>
): any {
  // Extract principles from SOUL.md sections
  const principles: any[] = [];
  let priority = 1;

  for (const [section, content] of Object.entries(soul)) {
    if (section === '_preamble') continue;

    // Extract bullet points as principles
    const bullets = content.split('\n')
      .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
      .map(l => l.replace(/^[\s*-]+/, '').trim())
      .filter(l => l.length > 0);

    if (bullets.length > 0) {
      for (const bullet of bullets) {
        principles.push({
          id: `soul_${section.replace(/\s+/g, '_')}_${priority}`,
          statement: bullet,
          priority: priority++,
        });
      }
    } else if (content.trim().length > 0) {
      principles.push({
        id: `soul_${section.replace(/\s+/g, '_')}`,
        statement: content.trim().split('\n')[0],
        priority: priority++,
      });
    }
  }

  // Extract voice keywords from identity or soul
  const voiceKeywords: string[] = [];
  const voiceSections = ['voice', 'tone', 'personality', 'communication style'];
  for (const key of voiceSections) {
    const content = soul[key] || identity[key];
    if (content) {
      const words = content.split(/[,\n]/)
        .map(w => w.replace(/^[\s*-]+/, '').trim())
        .filter(w => w.length > 0 && w.length < 30);
      voiceKeywords.push(...words);
    }
  }

  // Extract forbidden phrases
  const forbiddenPhrases: string[] = [];
  const avoidSections = ['avoid', 'don\'t', 'never', 'restrictions', 'taboos'];
  for (const key of avoidSections) {
    const content = soul[key];
    if (content) {
      const phrases = content.split('\n')
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
        .map(l => l.replace(/^[\s*-]+/, '').trim())
        .filter(l => l.length > 0);
      forbiddenPhrases.push(...phrases);
    }
  }

  return {
    schema_version: 'constitution.v1',
    generator_version: '0.5.0',
    principles: principles.slice(0, 20), // Cap at 20 for readability
    tone: {
      voice_keywords: voiceKeywords.slice(0, 10),
      forbidden_phrases: forbiddenPhrases.slice(0, 10),
    },
    tradeoffs: {
      autonomy_level: 'medium',
    },
    evidence_policy: {
      require_citations_for: [],
    },
    taboos: forbiddenPhrases.slice(0, 5),
    imported_from: 'soul-md',
    imported_at: new Date().toISOString(),
  };
}
