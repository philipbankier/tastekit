import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EvalRunner } from '@tastekit/core/eval';
import { Replay } from '@tastekit/core/eval';
import { resolveArtifactPath } from '@tastekit/core/utils';
import { getGlobalOptions, detail, hint, handleError, jsonOutput, verbose } from '../ui.js';

const evalRunCommand = new Command('run')
  .description('Run evaluation pack')
  .option('--pack <path>', 'Path to evaluation pack YAML/JSON file')
  .option('--format <type>', 'Output format: json or summary', 'summary')
  .action(async (options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();

    // Find eval pack
    let evalPackPath = options.pack;
    if (!evalPackPath) {
      // Look in default location
      const evalsDir = join(workspacePath, '.tastekit', 'evals');
      if (existsSync(evalsDir)) {
        const files = readdirSync(evalsDir).filter(f => f.endsWith('.json') || f.endsWith('.yaml'));
        if (files.length > 0) {
          evalPackPath = join(evalsDir, files[0]);
        }
      }
    }

    if (!evalPackPath || !existsSync(evalPackPath)) {
      console.error(chalk.red('No evaluation pack found.'));
      hint('--pack <path>', 'specify a pack');
      hint('.tastekit/evals/', 'place eval packs here');
      process.exit(1);
    }

    const spinner = ora('Running evaluation pack...').start();

    try {
      let evalPack: any;
      const content = readFileSync(evalPackPath, 'utf-8');
      if (evalPackPath.endsWith('.yaml') || evalPackPath.endsWith('.yml')) {
        const YAML = await import('yaml');
        evalPack = YAML.parse(content);
      } else {
        evalPack = JSON.parse(content);
      }

      verbose(`Running eval pack: ${evalPack.name}`, globals);

      const runner = new EvalRunner();
      const report = await runner.runEvalPack(evalPack);

      if (options.format === 'json' || globals.json) {
        spinner.stop();
        jsonOutput(report);
      }

      // Summary format
      if (report.passed) {
        spinner.succeed(chalk.green(`Evaluation passed (score: ${report.overall_score.toFixed(2)})`));
      } else {
        spinner.fail(chalk.red(`Evaluation failed (score: ${report.overall_score.toFixed(2)})`));
      }

      console.log('');
      console.log(chalk.bold('  Results:'));

      for (const result of report.results) {
        const icon = result.passed ? chalk.green('PASS') : chalk.red('FAIL');
        console.log(`    ${icon} ${result.scenario_id} (${result.score.toFixed(2)})`);

        for (const judgment of result.judgments) {
          if (!judgment.passed) {
            console.log(chalk.red(`      - ${judgment.rule_id}: ${judgment.reason || 'failed'}`));
          }
        }
      }

      console.log('');
      detail('Pack', evalPack.name);
      detail('Scenarios', String(report.results.length));
      detail('Passed', `${report.results.filter((r: any) => r.passed).length}/${report.results.length}`);

      // Save report
      const reportsDir = join(workspacePath, '.tastekit', 'eval-reports');
      mkdirSync(reportsDir, { recursive: true });
      const reportPath = join(reportsDir, `${report.evalpack_id}_${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      detail('Report', reportPath);
    } catch (error) {
      handleError(error, spinner);
    }
  });

const evalReplayCommand = new Command('replay')
  .description('Replay trace against current profile for regression testing')
  .option('--trace <path>', 'Path to trace file (JSONL)')
  .action(async (options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();
    const constitutionPath = resolveArtifactPath(join(workspacePath, '.tastekit'), 'constitution');

    if (!existsSync(constitutionPath)) {
      console.error(chalk.red('No constitution found. Run `tastekit compile` first.'));
      process.exit(1);
    }

    let tracePath = options.trace;
    if (!tracePath) {
      // Find most recent trace
      const tracesDir = join(workspacePath, '.tastekit', 'traces');
      if (existsSync(tracesDir)) {
        const files = readdirSync(tracesDir)
          .filter(f => f.endsWith('.jsonl'))
          .sort()
          .reverse();
        if (files.length > 0) {
          tracePath = join(tracesDir, files[0]);
        }
      }
    }

    if (!tracePath || !existsSync(tracePath)) {
      console.error(chalk.red('No trace file found.'));
      hint('--trace <path>', 'specify a trace');
      process.exit(1);
    }

    const spinner = ora('Replaying trace against current profile...').start();

    try {
      verbose(`Replaying: ${tracePath}`, globals);

      const constitution = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
      const replay = new Replay();
      const result = replay.replayTrace(tracePath, constitution);

      if (result.passed) {
        spinner.succeed(chalk.green('Replay passed. No violations found.'));
      } else {
        spinner.fail(chalk.red(`Replay found ${result.violations.length} violation(s)`));

        console.log('');
        for (const v of result.violations) {
          console.log(chalk.red(`  ${v.violation_type}: ${v.reason}`));
        }
      }

      if (globals.json) {
        jsonOutput(result);
      }

      console.log('');
      detail('Trace', tracePath);
      detail('Profile version', result.profile_version);
    } catch (error) {
      handleError(error, spinner);
    }
  });

export const evalCommand = new Command('eval')
  .description('Run evaluations')
  .addCommand(evalRunCommand)
  .addCommand(evalReplayCommand);
