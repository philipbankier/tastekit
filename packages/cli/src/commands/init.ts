import { Command, createOption } from 'commander';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import YAML from 'yaml';
import { listDomains, getDomainRubric } from '@actrun_ai/tastekit-core/domains';
import { autoDetectProvider, LLMProviderConfig } from '@actrun_ai/tastekit-core/llm';
import { ensureDir } from '@actrun_ai/tastekit-core/utils';
import { detail, hint, handleError } from '../ui.js';

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

type CanonicalOnboardingDepth = 'quick' | 'guided' | 'operator';
type OnboardingDepthInput = CanonicalOnboardingDepth | 'full' | 'full-taste-composition';

const DEPTH_CHOICES: OnboardingDepthInput[] = ['quick', 'guided', 'operator', 'full', 'full-taste-composition'];

function normalizeOnboardingDepth(depth: string): CanonicalOnboardingDepth {
  return depth === 'full' || depth === 'full-taste-composition'
    ? 'operator'
    : depth as CanonicalOnboardingDepth;
}

function formatDepthLabel(depth: CanonicalOnboardingDepth): string {
  switch (depth) {
    case 'quick':
      return 'Quick';
    case 'guided':
      return 'Guided';
    case 'operator':
      return 'Full Taste Composition';
  }
}

export const initCommand = new Command('init')
  .description('Initialize a new TasteKit workspace')
  .argument('[path]', 'Path to initialize workspace', '.')
  .option('--domain <id>', 'Domain ID (skip interactive selection)')
  .option(
    '--capability <pack>',
    'Optional capability pack for general-agent; repeat for multiple packs',
    (value: string, previous: string[] = []) => [...previous, value],
  )
  .addOption(createOption('--depth <type>', 'Onboarding depth').choices(DEPTH_CHOICES))
  .action(async (path: string, options: { domain?: string; depth?: string; capability?: string[] }) => {
    try {
      const workspacePath = join(process.cwd(), path, '.tastekit');

      // Check if workspace already exists
      if (existsSync(workspacePath)) {
        console.error(chalk.red('TasteKit workspace already exists at this location.'));
        console.log(chalk.gray('To reinitialize, delete .tastekit/ first.'));
        process.exit(1);
      }

      console.log(chalk.bold.cyan('\nTasteKit Workspace Setup\n'));

      // Domain selection
      let domainId: string;
      if (options.domain) {
        domainId = options.domain;
      } else {
        const domains = listDomains();
        const { selectedDomain } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedDomain',
          message: 'What type of agent are you building?',
          choices: domains.map(d => ({
            name: `${d.name}${d.is_stub ? chalk.gray(' (coming soon)') : ''}`,
            value: d.id,
            disabled: d.is_stub ? 'Not yet available' : false,
          })),
        }]);
        domainId = selectedDomain;
      }

      // Check if domain has a rubric
      const rubric = getDomainRubric(domainId);
      if (!rubric) {
        console.log(chalk.yellow(`Note: Domain "${domainId}" doesn't have an interview rubric yet.`));
        console.log(chalk.yellow('The onboarding will use universal dimensions only.'));
      }

      // Depth selection
      let depth: CanonicalOnboardingDepth;
      if (options.depth) {
        depth = normalizeOnboardingDepth(options.depth);
      } else {
        const { selectedDepth } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedDepth',
          message: 'How deep should the onboarding interview go?',
          choices: [
            { name: 'Quick (~5 min) - Essential preferences only', value: 'quick' },
            { name: 'Guided (~15 min) - Thorough profile', value: 'guided' },
            { name: 'Full Taste Composition - Deep exploration with examples', value: 'operator' },
          ],
          default: 'guided',
        }]);
        depth = selectedDepth;
      }

      // LLM provider detection
      let llmConfig: LLMProviderConfig | undefined;
      const envOllamaModel = process.env.OLLAMA_MODEL?.trim();
      if (envOllamaModel) {
        llmConfig = {
          provider: 'ollama',
          model: envOllamaModel,
          ...(process.env.OLLAMA_HOST?.trim() ? { base_url: process.env.OLLAMA_HOST.trim() } : {}),
        };
      } else {
        const detectSpinner = ora('Detecting LLM provider...').start();
        try {
          const detected = await autoDetectProvider();
          detectSpinner.succeed(`Detected LLM provider: ${chalk.bold(detected.provider)}`);

          const { useDetected } = await inquirer.prompt([{
            type: 'confirm',
            name: 'useDetected',
            message: `Use ${detected.provider} for onboarding interview?`,
            default: true,
          }]);

          if (useDetected) {
            if (detected.provider === 'ollama') {
              const model = await resolvePreferredOllamaModel(detected.base_url);
              if (model) {
                llmConfig = { ...detected, model };
              } else {
                const { selectedModel } = await inquirer.prompt([{
                  type: 'input',
                  name: 'selectedModel',
                  message: 'Ollama model name:',
                  default: 'llama3.1',
                }]);
                llmConfig = { ...detected, model: selectedModel };
              }
            } else {
              llmConfig = detected;
            }
          } else {
            llmConfig = await promptForProvider();
          }
        } catch {
          detectSpinner.warn('No LLM provider auto-detected');
          llmConfig = await promptForProvider();
        }
      }

      // Create workspace structure
      const createSpinner = ora('Creating workspace...').start();
      ensureDir(workspacePath);
      ensureDir(join(workspacePath, 'skills'));
      ensureDir(join(workspacePath, 'traces'));
      ensureDir(join(workspacePath, 'drift'));

      // Create tastekit.yaml with domain and LLM config
      const config: Record<string, unknown> = {
        version: '1.0.0',
        project_name: 'my-taste-profile',
        created_at: new Date().toISOString(),
        domain_id: domainId,
        onboarding: {
          depth,
          completed: false,
        },
      };

      const capabilityPacks = [...new Set(options.capability ?? [])];
      if (capabilityPacks.length > 0) {
        config.capability_packs = capabilityPacks;
      }

      if (llmConfig) {
        config.llm_provider = llmConfig;
      }

      writeFileSync(
        join(workspacePath, 'tastekit.yaml'),
        YAML.stringify(config),
      );

      createSpinner.succeed(chalk.green('TasteKit workspace initialized'));

      console.log('');
      detail('Domain', domainId);
      if (capabilityPacks.length > 0) {
        detail('Capability packs', capabilityPacks.join(', '));
      }
      detail('Depth', formatDepthLabel(depth));
      if (llmConfig) {
        detail('LLM', `${llmConfig.provider}${llmConfig.model ? ` (${llmConfig.model})` : ''}`);
      }

      console.log('');
      hint('tastekit onboard', 'start the interview');
    } catch (error) {
      handleError(error);
    }
  });

async function promptForProvider(): Promise<LLMProviderConfig> {
  const preferredFromEnv = process.env.OLLAMA_MODEL?.trim();
  const { provider } = await inquirer.prompt([{
    type: 'list',
    name: 'provider',
    message: 'Select your LLM provider:',
    default: preferredFromEnv ? 'ollama' : undefined,
    choices: [
      { name: 'Anthropic (Claude)', value: 'anthropic' },
      { name: 'OpenAI (GPT-4)', value: 'openai' },
      { name: 'Ollama (local)', value: 'ollama' },
    ],
  }]);

  const config: LLMProviderConfig = { provider };

  if (provider === 'ollama') {
    const suggestedModel = await resolvePreferredOllamaModel();
    const { model } = await inquirer.prompt([{
      type: 'input',
      name: 'model',
      message: 'Ollama model name:',
      default: suggestedModel ?? 'llama3.1',
    }]);
    if (model) config.model = model;
  } else {
    const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    if (!process.env[envVar]) {
      console.log(chalk.yellow(`\nNote: Set ${chalk.bold(envVar)} before running onboard.`));
    }
  }

  return config;
}

export async function detectInstalledOllamaModel(baseUrl = 'http://localhost:11434'): Promise<string | undefined> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) {
      return undefined;
    }

    const data = await response.json() as OllamaTagsResponse;
    const model = data.models?.find((entry) => entry.name || entry.model);
    const resolved = (model?.name ?? model?.model)?.trim();
    return resolved && resolved.length > 0 ? resolved : undefined;
  } catch {
    return undefined;
  }
}

export async function resolvePreferredOllamaModel(baseUrl?: string): Promise<string | undefined> {
  const fromEnv = process.env.OLLAMA_MODEL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return await detectInstalledOllamaModel(baseUrl);
}
