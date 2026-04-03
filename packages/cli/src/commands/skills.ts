import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { lintSkills } from '@tastekit/core/skills';
import { packSkills } from '@tastekit/core/skills';
import { analyzeSkillGraph } from '@tastekit/core/skills';
import { resolveSkillsPath } from '@tastekit/core/utils';
import { getGlobalOptions, riskColor, header, detail, hint, table, handleError, jsonOutput } from '../ui.js';

const skillsListCommand = new Command('list')
  .description('List all skills')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();
    const manifestPath = join(workspacePath, '.tastekit', 'skills', 'manifest.v1.yaml');

    if (!existsSync(manifestPath)) {
      if (globals.json) jsonOutput({ skills: [] });
      console.log(chalk.gray('No skills manifest found.'));
      hint('tastekit compile', 'generate skills');
      return;
    }

    try {
      const YAML = await import('yaml');
      const manifest = YAML.parse(readFileSync(manifestPath, 'utf-8'));

      if (!manifest.skills || manifest.skills.length === 0) {
        if (globals.json) jsonOutput({ skills: [] });
        console.log(chalk.gray('No skills defined.'));
        return;
      }

      if (globals.json) {
        jsonOutput(manifest);
      }

      header('Skills Library');

      table(
        [
          { label: 'Name', width: 26 },
          { label: 'ID', width: 22 },
          { label: 'Risk', width: 8 },
          { label: 'Tags', width: 28 },
          { label: 'Runtimes', width: 24 },
        ],
        manifest.skills.map((skill: any) => [
          chalk.bold(skill.name),
          chalk.gray(skill.skill_id),
          riskColor(skill.risk_level),
          chalk.gray(skill.tags?.join(', ') || 'none'),
          chalk.gray(skill.compatible_runtimes?.join(', ') || 'all'),
        ]),
      );

      console.log(chalk.gray(`\n  ${manifest.skills.length} skill(s) found.`));
    } catch (error) {
      handleError(error);
    }
  });

const skillsLintCommand = new Command('lint')
  .description('Validate skills structure')
  .option('--fix', 'Show suggestions for fixing issues')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();
    const skillsDir = join(workspacePath, '.tastekit', 'skills');

    const spinner = ora('Linting skills...').start();

    try {
      const result = lintSkills(skillsDir);

      if (result.valid && result.warnings.length === 0) {
        spinner.succeed(chalk.green('All skills are valid.'));
        if (globals.json) jsonOutput({ valid: true, errors: [], warnings: [] });
        return;
      }

      if (result.valid) {
        spinner.warn(chalk.yellow(`Valid with ${result.warnings.length} warning(s)`));
      } else {
        spinner.fail(chalk.red(`${result.errors.length} error(s), ${result.warnings.length} warning(s)`));
      }

      if (globals.json) {
        jsonOutput({ valid: result.valid, errors: result.errors, warnings: result.warnings });
      }

      console.log('');

      for (const error of result.errors) {
        console.log(chalk.red(`  ERROR [${error.skill_id}]: ${error.message}`));
      }

      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  WARN  [${warning.skill_id}]: ${warning.message}`));
      }

      if (!result.valid) {
        process.exit(1);
      }
    } catch (error) {
      handleError(error, spinner);
    }
  });

const skillsPackCommand = new Command('pack')
  .description('Export skills as a portable pack')
  .option('--format <type>', 'Pack format: dir', 'dir')
  .option('--runtime <type>', 'Target runtime layout: claude-code, openclaw, portable', 'portable')
  .option('--out <path>', 'Output path', './skills-pack')
  .action(async (options) => {
    const workspacePath = process.cwd();
    const skillsDir = join(workspacePath, '.tastekit', 'skills');

    if (!existsSync(skillsDir)) {
      console.error(chalk.red('No skills directory found. Run `tastekit compile` first.'));
      process.exit(1);
    }

    const spinner = ora('Packing skills...').start();

    try {
      const result = await packSkills({
        skillsPath: skillsDir,
        outputPath: options.out,
        format: options.format,
        runtime: options.runtime,
      });

      spinner.succeed(chalk.green(`Skills packed to ${result.outputPath}`));
      console.log(chalk.cyan(`  ${result.skillCount} skills, ${result.totalFiles} files, layout: ${result.runtime}`));
    } catch (error) {
      handleError(error, spinner);
    }
  });

const skillsGraphCommand = new Command('graph')
  .description('Analyze skill relationships and pipelines')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = join(process.cwd(), '.tastekit');
    const skillsDir = resolveSkillsPath(workspacePath);
    const manifestPath = join(skillsDir, 'manifest.v1.yaml');

    if (!existsSync(manifestPath)) {
      if (globals.json) jsonOutput({ error: 'No skills manifest found' });
      console.log(chalk.gray('No skills manifest found.'));
      hint('tastekit compile', 'generate skills');
      return;
    }

    try {
      const YAML = await import('yaml');
      const manifest = YAML.parse(readFileSync(manifestPath, 'utf-8'));

      if (!manifest.skills || manifest.skills.length === 0) {
        if (globals.json) jsonOutput({ graph: { node_count: 0 } });
        console.log(chalk.gray('No skills defined.'));
        return;
      }

      const analysis = analyzeSkillGraph(manifest);

      if (globals.json) {
        jsonOutput(analysis);
      }

      header('Skill Graph Analysis');

      detail('Nodes', String(analysis.node_count));
      detail('Edges', String(analysis.edge_count));
      detail('Density', analysis.density.toFixed(3));
      console.log('');

      // Pipelines
      if (analysis.pipelines.length > 0) {
        console.log(chalk.bold('  Pipelines'));
        for (const pipeline of analysis.pipelines) {
          console.log(chalk.cyan('    ' + pipeline.join(' → ')));
        }
        console.log('');
      }

      // Hubs
      if (analysis.hubs.length > 0) {
        console.log(chalk.bold('  Hubs') + chalk.gray(' (3+ connections)'));
        for (const hub of analysis.hubs) {
          console.log(chalk.yellow('    ' + hub));
        }
        console.log('');
      }

      // Orphans
      if (analysis.orphans.length > 0) {
        console.log(chalk.bold('  Orphans') + chalk.gray(' (no relationships)'));
        for (const orphan of analysis.orphans) {
          console.log(chalk.gray('    ' + orphan));
        }
        console.log('');
      }

      // Cycles (warnings)
      if (analysis.cycles.length > 0) {
        console.log(chalk.red.bold('  Cycles') + chalk.red(' (circular dependencies)'));
        for (const cycle of analysis.cycles) {
          console.log(chalk.red('    ' + cycle.join(' → ') + ' → ' + cycle[0]));
        }
        console.log('');
      }

      // Missing refs (warnings)
      if (analysis.missing_refs.length > 0) {
        console.log(chalk.yellow.bold('  Missing References'));
        for (const ref of analysis.missing_refs) {
          console.log(chalk.yellow(`    ${ref.skill_id} → ${ref.missing_ref} (${ref.relationship})`));
        }
        console.log('');
      }

      // Summary line
      const issues = analysis.cycles.length + analysis.missing_refs.length;
      if (issues === 0) {
        console.log(chalk.green('  No issues found.'));
      } else {
        console.log(chalk.yellow(`  ${issues} issue(s) found.`));
      }
    } catch (error) {
      handleError(error);
    }
  });

// ---------------------------------------------------------------------------
// New: skills report — per-skill performance metrics from traces
// ---------------------------------------------------------------------------

const skillsReportCommand = new Command('report')
  .description('Show per-skill performance metrics from traces')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = join(process.cwd(), '.tastekit');
    const { resolveTracesPath } = await import('@tastekit/core/utils');
    const { aggregateSkillRuns, getSkillPerformance, rankByFailureRate } = await import('@tastekit/core/skills');
    const { TraceReader } = await import('@tastekit/core/tracing');
    const { readdirSync } = await import('fs');

    const tracesDir = resolveTracesPath(workspacePath);

    if (!existsSync(tracesDir)) {
      if (globals.json) jsonOutput({ skills: [] });
      console.log(chalk.gray('No traces found.'));
      hint('tastekit compile', 'generate traces by running tasks');
      return;
    }

    const spinner = ora('Analyzing skill performance...').start();

    try {
      const reader = new TraceReader();
      const traceFiles = readdirSync(tracesDir).filter(f => f.endsWith('.jsonl'));

      if (traceFiles.length === 0) {
        spinner.info('No trace files found.');
        if (globals.json) jsonOutput({ skills: [] });
        return;
      }

      const allEvents = traceFiles.flatMap(f => reader.readTrace(join(tracesDir, f)));
      const records = aggregateSkillRuns(allEvents);
      const reports = rankByFailureRate(getSkillPerformance(records));

      spinner.stop();

      if (reports.length === 0) {
        console.log(chalk.gray('No skill execution data found in traces.'));
        if (globals.json) jsonOutput({ skills: [] });
        return;
      }

      if (globals.json) {
        jsonOutput({ skills: reports });
        return;
      }

      header('Skill Performance Report');

      table(
        [
          { label: 'Skill', width: 24 },
          { label: 'Runs', width: 8 },
          { label: 'Success', width: 10 },
          { label: 'Avg Time', width: 12 },
          { label: 'Trend', width: 12 },
        ],
        reports.map(r => [
          chalk.bold(r.skill_id),
          String(r.total_runs),
          r.success_rate >= 0.8
            ? chalk.green(`${(r.success_rate * 100).toFixed(0)}%`)
            : r.success_rate >= 0.5
              ? chalk.yellow(`${(r.success_rate * 100).toFixed(0)}%`)
              : chalk.red(`${(r.success_rate * 100).toFixed(0)}%`),
          chalk.gray(`${r.avg_duration_ms}ms`),
          r.trend === 'improving' ? chalk.green('↑ improving')
            : r.trend === 'degrading' ? chalk.red('↓ degrading')
              : chalk.gray('→ stable'),
        ]),
      );

      console.log(chalk.gray(`\n  ${reports.length} skill(s) analyzed from ${traceFiles.length} trace file(s).`));
    } catch (error) {
      handleError(error, spinner);
    }
  });

// ---------------------------------------------------------------------------
// New: skills inspect — detailed failure analysis for one skill
// ---------------------------------------------------------------------------

const skillsInspectCommand = new Command('inspect')
  .description('Detailed failure analysis for a skill')
  .argument('<skill-id>', 'Skill ID to inspect')
  .action(async (skillId, _options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = join(process.cwd(), '.tastekit');
    const { resolveTracesPath } = await import('@tastekit/core/utils');
    const { aggregateSkillRuns, getSkillPerformance } = await import('@tastekit/core/skills');
    const { TraceReader } = await import('@tastekit/core/tracing');
    const { readdirSync } = await import('fs');

    const tracesDir = resolveTracesPath(workspacePath);

    if (!existsSync(tracesDir)) {
      console.log(chalk.gray('No traces found.'));
      return;
    }

    const spinner = ora(`Inspecting skill "${skillId}"...`).start();

    try {
      const reader = new TraceReader();
      const traceFiles = readdirSync(tracesDir).filter(f => f.endsWith('.jsonl'));
      const allEvents = traceFiles.flatMap(f => reader.readTrace(join(tracesDir, f)));
      const records = aggregateSkillRuns(allEvents);
      const reports = getSkillPerformance(records.filter(r => r.skill_id === skillId));

      spinner.stop();

      if (reports.length === 0) {
        console.log(chalk.gray(`No execution data found for skill "${skillId}".`));
        if (globals.json) jsonOutput({ error: 'not_found' });
        return;
      }

      const report = reports[0];

      if (globals.json) {
        jsonOutput({ skill: report, executions: records.filter(r => r.skill_id === skillId) });
        return;
      }

      header(`Skill Inspection: ${skillId}`);

      detail('Total Runs', String(report.total_runs));
      detail('Success Rate', `${(report.success_rate * 100).toFixed(1)}%`);
      detail('Avg Duration', `${report.avg_duration_ms}ms`);
      detail('Trend', report.trend);
      console.log('');

      const failures = Object.entries(report.failure_reasons);
      if (failures.length > 0) {
        console.log(chalk.bold('  Failure Reasons'));
        for (const [reason, count] of failures.sort(([, a], [, b]) => b - a)) {
          console.log(chalk.red(`    ${count}x — ${reason}`));
        }
        console.log('');
      }

      // Show recent executions
      const skillRecords = records.filter(r => r.skill_id === skillId).slice(-5);
      if (skillRecords.length > 0) {
        console.log(chalk.bold('  Recent Runs'));
        for (const rec of skillRecords) {
          const icon = rec.outcome === 'success' ? chalk.green('✓')
            : rec.outcome === 'partial' ? chalk.yellow('~')
              : chalk.red('✗');
          console.log(`    ${icon} ${rec.run_id.slice(0, 8)} — ${rec.outcome} (${rec.duration_ms}ms)`);
        }
      }
    } catch (error) {
      handleError(error, spinner);
    }
  });

// ---------------------------------------------------------------------------
// New: skills history — version history
// ---------------------------------------------------------------------------

const skillsHistoryCommand = new Command('history')
  .description('Show version history for a skill')
  .argument('<skill-id>', 'Skill ID')
  .action(async (skillId, _options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = join(process.cwd(), '.tastekit');

    try {
      const { SkillVersioner } = await import('@tastekit/core/skills');
      const versioner = new SkillVersioner(workspacePath);
      const history = versioner.getHistory(skillId);

      if (history.versions.length === 0) {
        if (globals.json) jsonOutput({ skill_id: skillId, versions: [] });
        console.log(chalk.gray(`No version history for skill "${skillId}".`));
        return;
      }

      if (globals.json) {
        jsonOutput(history);
        return;
      }

      header(`Version History: ${skillId}`);

      for (const v of history.versions) {
        const current = v.version === history.current ? chalk.green(' (current)') : '';
        const score = v.eval_score !== undefined ? chalk.cyan(` score: ${v.eval_score}`) : '';
        const amendment = v.amendment_id ? chalk.gray(` amendment: ${v.amendment_id}`) : '';
        console.log(`  v${v.version}  ${v.timestamp}${score}${amendment}${current}`);
        console.log(chalk.gray(`        hash: ${v.content_hash.slice(0, 16)}...`));
      }
    } catch (error) {
      handleError(error);
    }
  });

// ---------------------------------------------------------------------------
// New: skills rollback — restore previous version
// ---------------------------------------------------------------------------

const skillsRollbackCommand = new Command('rollback')
  .description('Rollback a skill to a previous version')
  .argument('<skill-id>', 'Skill ID')
  .argument('<version>', 'Version number to rollback to')
  .action(async (skillId, versionStr, _options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = join(process.cwd(), '.tastekit');
    const version = parseInt(versionStr, 10);

    if (isNaN(version)) {
      console.error(chalk.red('Version must be a number.'));
      process.exit(1);
    }

    try {
      const { SkillVersioner } = await import('@tastekit/core/skills');
      const versioner = new SkillVersioner(workspacePath);
      const target = versioner.rollback(skillId, version);

      if (globals.json) {
        jsonOutput({ rolled_back_to: target });
      }

      console.log(chalk.green(`Rolled back "${skillId}" to version ${target.version} (${target.timestamp})`));
    } catch (error) {
      handleError(error);
    }
  });

export const skillsCommand = new Command('skills')
  .description('Manage skills library')
  .addCommand(skillsListCommand)
  .addCommand(skillsLintCommand)
  .addCommand(skillsPackCommand)
  .addCommand(skillsGraphCommand)
  .addCommand(skillsReportCommand)
  .addCommand(skillsInspectCommand)
  .addCommand(skillsHistoryCommand)
  .addCommand(skillsRollbackCommand);
