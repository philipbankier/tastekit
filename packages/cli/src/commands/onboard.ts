import { Command, createOption } from 'commander';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import YAML from 'yaml';
import { createSession, loadSession, saveSession, Interviewer, DomainRubric } from '@tastekit/core/interview';
import { resolveProvider, autoDetectProvider, type LLMProviderConfig } from '@tastekit/core/llm';
import { getDomainRubric } from '@tastekit/core/domains';
import { WorkspaceConfig, InterviewState } from '@tastekit/core/schemas';
import { resolveSessionPath } from '@tastekit/core/utils';
import { detail, hint, handleError } from '../ui.js';

interface OnboardOptions {
  depth?: 'quick' | 'guided' | 'operator';
  resume?: boolean;
  provider?: string;
  voice?: boolean;
}

export function resolveOnboardProviderConfig(
  configured: WorkspaceConfig['llm_provider'],
  providerOverride?: string,
): LLMProviderConfig | undefined {
  if (!providerOverride) {
    return configured;
  }

  const overrideProvider = providerOverride as LLMProviderConfig['provider'];

  // Preserve configured provider settings when the override only reaffirms provider choice.
  if (configured?.provider === overrideProvider) {
    return {
      provider: overrideProvider,
      ...(configured.model ? { model: configured.model } : {}),
      ...(configured.base_url ? { base_url: configured.base_url } : {}),
      ...(configured.api_key_env ? { api_key_env: configured.api_key_env } : {}),
    };
  }

  // Cross-provider override should not leak stale provider-specific settings.
  return { provider: overrideProvider };
}

export const onboardCommand = new Command('onboard')
  .description('Run the LLM-driven onboarding interview')
  .addOption(createOption('--depth <type>', 'Override depth').choices(['quick', 'guided', 'operator']))
  .option('--resume', 'Resume from previous session')
  .option('--provider <name>', 'Override LLM provider: anthropic, openai, ollama')
  .option('--voice', 'Enable voice mode (requires @tastekit/voice and sox)')
  .action(async (options: OnboardOptions) => {
    const workspacePath = join(process.cwd(), '.tastekit');
    const configPath = join(workspacePath, 'tastekit.yaml');
    const sessionPath = resolveSessionPath(workspacePath);

    if (!existsSync(workspacePath)) {
      console.error(chalk.red('No TasteKit workspace found. Run'), chalk.bold('tastekit init'), chalk.red('first.'));
      process.exit(1);
    }

    if (!existsSync(configPath)) {
      console.error(chalk.red('No tastekit.yaml found. Run'), chalk.bold('tastekit init'), chalk.red('first.'));
      process.exit(1);
    }
    mkdirSync(dirname(sessionPath), { recursive: true });

    // Load config
    const config: WorkspaceConfig = YAML.parse(readFileSync(configPath, 'utf-8'));
    const depth = (options.depth ?? config.onboarding?.depth ?? 'guided') as 'quick' | 'guided' | 'operator';
    const domainId = config.domain_id;

    if (!domainId) {
      console.error(chalk.red('No domain selected. Run'), chalk.bold('tastekit init'), chalk.red('to set up your workspace.'));
      process.exit(1);
    }

    // Resolve LLM provider
    const spinner = ora('Connecting to LLM...').start();
    let voiceIO: { getUserInput(): Promise<string>; onInterviewerMessage(msg: string): Promise<void>; dispose(): Promise<void> } | null = null;
    try {
      const providerConfig = resolveOnboardProviderConfig(config.llm_provider, options.provider)
        ?? await autoDetectProvider();
      const llm = await resolveProvider(providerConfig);
      spinner.succeed(`Connected to ${chalk.bold(llm.name)}`);

      // Load domain rubric (fall back to universal-only if no domain rubric)
      const rubric: DomainRubric = getDomainRubric(domainId) ?? {
        domain_id: domainId,
        version: '0.1.0',
        interview_goal: `Configure a ${domainId} agent based on your preferences and principles.`,
        dimensions: [],
        includes_universal: true,
      };

      // Create or resume session
      let session;
      let resumeState: InterviewState | undefined;

      if (options.resume && existsSync(sessionPath)) {
        session = loadSession(sessionPath);
        resumeState = session.interview as InterviewState | undefined;
        if (resumeState?.is_complete) {
          console.log(chalk.yellow('Previous session is already complete. Starting fresh.'));
          session = createSession(depth);
          resumeState = undefined;
        } else {
          console.log(chalk.green('Resuming previous session...'));
        }
      } else {
        session = createSession(depth);
      }

      session.domain_id = domainId;
      session.llm_provider = { name: llm.name };

      // Set up voice mode if requested
      if (options.voice) {
        try {
          const { createVoiceIO } = await import('@tastekit/voice');
          voiceIO = await createVoiceIO((config as Record<string, unknown>).voice);
          console.log(chalk.green('Voice mode enabled. Speak into your microphone.'));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(chalk.yellow(`Voice mode unavailable: ${msg}`));
          console.warn(chalk.yellow('Falling back to text input.\n'));
        }
      }

      console.log(chalk.bold.cyan('\nTasteKit Onboarding Interview\n'));
      console.log(chalk.gray(`Domain: ${domainId} | Depth: ${depth} | LLM: ${llm.name}${voiceIO ? ' | Voice: ON' : ''}`));
      if (!voiceIO) {
        console.log(chalk.gray('Type /save to save and quit, /skip to skip a topic\n'));
      } else {
        console.log(chalk.gray('Say "save" to save and quit, "skip" to skip a topic\n'));
      }

      // Run interviewer
      const interviewer = new Interviewer({
        llm,
        rubric,
        depth,
        resumeFrom: resumeState,
        onInterviewerMessage: voiceIO
          ? (msg) => voiceIO!.onInterviewerMessage(msg)
          : (msg) => {
            console.log(chalk.cyan('\n  ') + msg + '\n');
          },
        getUserInput: voiceIO
          ? async () => {
            try {
              return await voiceIO!.getUserInput();
            } catch {
              // Turn-level fallback to text input
              console.warn(chalk.yellow('  Voice input failed. Type your response:'));
              const { answer } = await inquirer.prompt([{
                type: 'input',
                name: 'answer',
                message: chalk.green('You:'),
                validate: (input: string) => input.length > 0 || 'Please type a response',
              }]);
              return answer;
            }
          }
          : async () => {
            const { answer } = await inquirer.prompt([{
              type: 'input',
              name: 'answer',
              message: chalk.green('You:'),
              validate: (input: string) => input.length > 0 || 'Please type a response (or /save to save and quit)',
            }]);
            return answer;
          },
        onStateChange: (state) => {
          session.interview = state;
          session.current_step = 'interview';
          saveSession(sessionPath, session);
        },
      });

      const structuredAnswers = await interviewer.run();

      // Save final session
      session.structured_answers = structuredAnswers;
      session.completed_steps = ['welcome', 'interview'];
      session.current_step = 'complete';
      session.interview = interviewer.getState();
      saveSession(sessionPath, session);

      // Show coverage summary
      const state = interviewer.getState();
      const covered = state.dimension_coverage.filter(d => d.status === 'covered').length;
      const total = state.dimension_coverage.length;
      const skipped = state.dimension_coverage.filter(d => d.status === 'skipped').length;

      console.log(chalk.bold.green('\nOnboarding complete!'));
      detail('Dimensions covered', `${covered}/${total}${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
      detail('Principles extracted', String(structuredAnswers.principles?.length ?? 0));
      detail('Session saved to', '.tastekit/session.json');
      console.log('');
      hint('tastekit compile', 'generate your taste artifacts');

      // Clean up voice resources
      if (voiceIO) {
        await voiceIO.dispose();
      }

    } catch (error) {
      if (voiceIO) await voiceIO.dispose().catch(() => {});
      handleError(error, spinner);
    }
  });
