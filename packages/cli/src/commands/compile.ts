import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { compile, canResume } from '@actrun_ai/tastekit-core/compiler';
import { loadSession } from '@actrun_ai/tastekit-core/interview';
import { resolveSessionPath } from '@actrun_ai/tastekit-core/utils';
import { getGlobalOptions, nextSteps, handleError, jsonOutput } from '../ui.js';

export const compileCommand = new Command('compile')
  .description('Compile taste artifacts from onboarding session')
  .option('--resume', 'Resume a previously interrupted compilation')
  .action(async (options: { resume?: boolean }, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = join(process.cwd(), '.tastekit');

    if (!existsSync(workspacePath)) {
      handleError(new Error('No TasteKit workspace found. Run `tastekit init` first.'));
    }

    const sessionPath = resolveSessionPath(workspacePath);

    if (!existsSync(sessionPath)) {
      handleError(new Error('No onboarding session found. Run `tastekit onboard` first.'));
    }

    // Auto-detect resume if derivation state exists with incomplete steps
    const shouldResume = options.resume || canResume(workspacePath);

    const session = loadSession(sessionPath);
    const label = shouldResume ? 'Resuming compilation...' : 'Compiling taste artifacts...';
    const spinner = ora(label).start();

    try {
      const result = await compile({
        workspacePath,
        session,
        generatorVersion: '0.5.0',
        resume: shouldResume,
      });

      if (result.success) {
        const suffix = result.resumed ? ' (resumed)' : '';
        spinner.succeed(chalk.green(`Compilation complete!${suffix}`));

        if (globals.json) {
          jsonOutput({ success: true, artifacts: result.artifacts, resumed: result.resumed });
        }

        console.log('\nGenerated artifacts:');
        for (const artifact of result.artifacts) {
          console.log(chalk.cyan(`  * ${artifact}`));
        }

        nextSteps([
          { cmd: 'tastekit export --target claude-code', desc: 'export for Claude Code' },
          { cmd: 'tastekit export --target openclaw', desc: 'export for OpenClaw' },
        ]);
      } else {
        spinner.fail(chalk.red('Compilation failed'));
        result.errors?.forEach(e => console.error(chalk.red(`  ${e}`)));
        console.log(chalk.yellow('\nRun `tastekit compile --resume` to continue from where it left off.'));
        process.exit(1);
      }
    } catch (error) {
      handleError(error, spinner);
    }
  });
