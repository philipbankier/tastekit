import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DriftDetector } from '@kairox_ai/tastekit-core/drift';
import { MemoryConsolidator } from '@kairox_ai/tastekit-core/drift';
import { resolveArtifactPath, resolveTracesPath } from '@kairox_ai/tastekit-core/utils';
import { ConstitutionV1Schema, type ConstitutionV1, type ConstitutionPrinciple } from '@kairox_ai/tastekit-core/schemas';
import { getGlobalOptions, riskColor, header, detail, hint, handleError, jsonOutput, verbose } from '../ui.js';

function slugify(statement: string, fallbackIndex: number, used: Set<string>): string {
  const slug = statement.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  const base = slug.length > 0 ? slug : `unnamed_principle_${fallbackIndex}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  used.add(candidate);
  return candidate;
}

function applyAddPrincipleToConstitution(
  constitution: ConstitutionV1,
  proposed: Partial<ConstitutionPrinciple> & { statement: string },
): ConstitutionV1 {
  const usedIds = new Set(constitution.principles.map(p => p.id));
  const newPrinciple: ConstitutionPrinciple = {
    id: proposed.id && proposed.id.length > 0 ? proposed.id : slugify(proposed.statement, constitution.principles.length, usedIds),
    priority: 0, // renumbered below
    statement: proposed.statement,
    ...(proposed.rationale ? { rationale: proposed.rationale } : {}),
    applies_to: proposed.applies_to ?? ['*'],
    ...(proposed.examples_good ? { examples_good: proposed.examples_good } : {}),
    ...(proposed.examples_bad ? { examples_bad: proposed.examples_bad } : {}),
  };

  const merged: ConstitutionV1 = {
    ...constitution,
    principles: [...constitution.principles, newPrinciple].map((p, i) => ({ ...p, priority: i + 1 })),
  };

  return merged;
}

const driftDetectCommand = new Command('detect')
  .description('Detect drift from traces and feedback')
  .option('--since <date>', 'Detect drift since date (ISO format)')
  .option('--skill <id>', 'Detect drift for specific skill')
  .action(async (options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();
    const tastekitPath = join(workspacePath, '.tastekit');
    const tracesDir = resolveTracesPath(tastekitPath);

    if (!existsSync(tracesDir)) {
      console.log(chalk.yellow('No traces found. Run your agent to generate traces first.'));
      return;
    }

    const spinner = ora('Analyzing traces for drift...').start();

    try {
      const detector = new DriftDetector();

      // Collect trace files
      const traceFiles = readdirSync(tracesDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => join(tracesDir, f));

      if (traceFiles.length === 0) {
        spinner.info(chalk.yellow('No trace files found.'));
        return;
      }

      verbose(`Found ${traceFiles.length} trace file(s)`, globals);

      const detectionOptions: any = {};
      if (options.since) {
        detectionOptions.since = new Date(options.since);
      }
      if (options.skill) {
        detectionOptions.skillId = options.skill;
      }

      const proposals = detector.detectFromTraces(traceFiles, detectionOptions);

      if (proposals.length === 0) {
        spinner.succeed(chalk.green('No drift detected.'));
        if (globals.json) jsonOutput({ proposals: [] });
        return;
      }

      spinner.warn(chalk.yellow(`Found ${proposals.length} drift proposal(s)`));

      // Save proposals
      const proposalsDir = join(workspacePath, '.tastekit', 'proposals');
      mkdirSync(proposalsDir, { recursive: true });

      for (const proposal of proposals) {
        const proposalPath = join(proposalsDir, `${proposal.proposal_id}.json`);
        writeFileSync(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');
      }

      if (globals.json) {
        jsonOutput({ proposals });
      }

      // Display proposals
      console.log('');
      for (const proposal of proposals) {
        console.log(chalk.bold(`  ${proposal.proposal_id}`));
        detail('Signal', `${proposal.signal_type} (${proposal.frequency}x)`);
        console.log(`    Risk: ${riskColor(proposal.risk_rating)}`);
        console.log(`    ${proposal.rationale}`);
        console.log('');
      }

      hint('tastekit drift apply <proposal_id>', 'apply a proposal');
    } catch (error) {
      handleError(error, spinner);
    }
  });

const driftApplyCommand = new Command('apply')
  .description('Apply a drift proposal')
  .argument('<proposal_id>', 'Proposal ID to apply')
  .action(async (proposalId: string, _options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();
    const proposalPath = join(workspacePath, '.tastekit', 'proposals', `${proposalId}.json`);

    if (!existsSync(proposalPath)) {
      console.error(chalk.red(`Proposal not found: ${proposalId}`));
      hint('tastekit drift detect', 'find proposals');
      process.exit(1);
    }

    const spinner = ora(`Applying proposal ${proposalId}...`).start();

    try {
      const proposal = JSON.parse(readFileSync(proposalPath, 'utf-8'));

      // Apply changes to constitution — validate before writing (the schema is the lock).
      const constitutionPath = resolveArtifactPath(join(workspacePath, '.tastekit'), 'constitution');
      if (existsSync(constitutionPath) && proposal.proposed_changes.constitution) {
        const onDisk = JSON.parse(readFileSync(constitutionPath, 'utf-8'));
        const beforeValidation = ConstitutionV1Schema.safeParse(onDisk);
        if (!beforeValidation.success) {
          spinner.fail(chalk.red('Cannot apply drift: existing constitution.v1.json fails ConstitutionV1Schema. Re-run `tastekit compile` to regenerate it first.'));
          process.exit(1);
        }
        let constitution: ConstitutionV1 = beforeValidation.data;

        if (proposal.proposed_changes.constitution.add_principle) {
          const proposed = proposal.proposed_changes.constitution.add_principle;
          if (typeof proposed?.statement !== 'string' || proposed.statement.length === 0) {
            spinner.fail(chalk.red('Drift proposal add_principle is missing a statement.'));
            process.exit(1);
          }
          constitution = applyAddPrincipleToConstitution(constitution, proposed);
        }

        const afterValidation = ConstitutionV1Schema.safeParse(constitution);
        if (!afterValidation.success) {
          const issues = afterValidation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
          spinner.fail(chalk.red(`Drift apply would produce an invalid constitution: ${issues}`));
          process.exit(1);
        }

        writeFileSync(constitutionPath, JSON.stringify(afterValidation.data, null, 2), 'utf-8');
      }

      // Mark proposal as applied
      proposal.applied_at = new Date().toISOString();
      writeFileSync(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');

      spinner.succeed(chalk.green(`Applied proposal: ${proposalId}`));

      if (globals.json) {
        jsonOutput({ applied: proposalId, applied_at: proposal.applied_at });
      }

      hint('tastekit compile', 'recompile artifacts');
    } catch (error) {
      handleError(error, spinner);
    }
  });

const memoryConsolidateCommand = new Command('consolidate')
  .description('Consolidate memory (prune old, merge similar)')
  .option('--retention <days>', 'Retention period in days', '30')
  .action(async (options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const workspacePath = process.cwd();
    const memoryDir = join(workspacePath, '.tastekit', 'memory');

    if (!existsSync(memoryDir)) {
      console.log(chalk.yellow('No memory directory found.'));
      return;
    }

    const spinner = ora('Consolidating memory...').start();

    try {
      // Read memory entries
      const memoryFiles = existsSync(memoryDir)
        ? readdirSync(memoryDir).filter(f => f.endsWith('.json'))
        : [];

      if (memoryFiles.length === 0) {
        spinner.info(chalk.yellow('No memory entries to consolidate.'));
        return;
      }

      verbose(`Processing ${memoryFiles.length} memory file(s)`, globals);

      const memories = memoryFiles.map(f => {
        const content = JSON.parse(readFileSync(join(memoryDir, f), 'utf-8'));
        return {
          id: f.replace('.json', ''),
          content: content.content || JSON.stringify(content),
          salience: content.salience || 0.5,
          timestamp: content.timestamp || new Date().toISOString(),
        };
      });

      const consolidator = new MemoryConsolidator();
      const plan = consolidator.generateConsolidationPlan(memories, parseInt(options.retention));

      spinner.succeed(chalk.green('Consolidation plan generated'));

      if (globals.json) {
        jsonOutput(plan);
      }

      console.log('');
      header('Plan');
      detail('Keep', `${plan.memories_to_keep.length} memories`);
      detail('Prune', `${plan.memories_to_prune.length} memories`);
      detail('Merge', `${plan.memories_to_merge.length} groups`);

      if (plan.memories_to_merge.length > 0) {
        console.log('');
        console.log(chalk.bold('  Merges:'));
        for (const merge of plan.memories_to_merge) {
          console.log(`    ${merge.source_ids.join(' + ')} -> merged`);
        }
      }

      // Save plan
      const planPath = join(workspacePath, '.tastekit', 'consolidation-plan.json');
      writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf-8');
      console.log(chalk.gray(`\n  Plan saved to: ${planPath}`));
    } catch (error) {
      handleError(error, spinner);
    }
  });

export const driftCommand = new Command('drift')
  .description('Manage drift detection and memory')
  .addCommand(driftDetectCommand)
  .addCommand(driftApplyCommand);

driftCommand.addCommand(memoryConsolidateCommand.name('memory-consolidate'));
