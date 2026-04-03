import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { TrustManager, TrustAuditor } from '@tastekit/core/trust';
import { BindingsV1, TrustV1 } from '@tastekit/core/schemas';
import { resolveBindingsPath, resolveTrustPath } from '@tastekit/core/utils';
import { getGlobalOptions, detail, hint, table, handleError, jsonOutput } from '../ui.js';

const DEFAULT_TRUST_POLICY: TrustV1 = {
  schema_version: 'trust.v1',
  mcp_servers: [],
  skill_sources: [],
  update_policy: {
    allow_auto_updates: false,
    require_review: true,
  },
};

function getWorkspacePath(): string {
  return join(process.cwd(), '.tastekit');
}

function getTrustReadPath(): string {
  return resolveTrustPath(getWorkspacePath());
}

function getCanonicalTrustPath(): string {
  return join(getWorkspacePath(), 'trust.v1.json');
}

function parseJsonOrYaml<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return YAML.parse(raw) as T;
  }
}

function loadTrustPolicy(): TrustV1 {
  const trustPath = getTrustReadPath();
  if (!existsSync(trustPath)) {
    return { ...DEFAULT_TRUST_POLICY };
  }
  return parseJsonOrYaml<TrustV1>(readFileSync(trustPath, 'utf-8'));
}

function saveTrustPolicy(policy: TrustV1): void {
  const trustPath = getCanonicalTrustPath();
  mkdirSync(join(trustPath, '..'), { recursive: true });
  writeFileSync(trustPath, JSON.stringify(policy, null, 2), 'utf-8');
}

const trustInitCommand = new Command('init')
  .description('Initialize trust policy')
  .action(async () => {
    const spinner = ora('Initializing trust policy...').start();
    try {
      const trustPath = getTrustReadPath();
      if (existsSync(trustPath)) {
        spinner.info(chalk.yellow('Trust policy already exists.'));
        return;
      }

      saveTrustPolicy(DEFAULT_TRUST_POLICY);
      spinner.succeed(chalk.green('Trust policy initialized'));
      detail('Written to', getCanonicalTrustPath());
      hint('tastekit trust pin-mcp', 'pin MCP servers');
    } catch (error) {
      handleError(error, spinner);
    }
  });

const trustPinMcpCommand = new Command('pin-mcp')
  .description('Pin an MCP server fingerprint')
  .argument('<server_url>', 'Server URL')
  .option('--fingerprint <hash>', 'Server fingerprint')
  .option('--mode <mode>', 'Pin mode: strict or warn', 'strict')
  .action(async (serverUrl: string, options) => {
    if (!options.fingerprint) {
      console.error(chalk.red('Please specify a fingerprint with --fingerprint'));
      hint('tastekit mcp inspect <server>', 'get the fingerprint');
      process.exit(1);
    }

    const spinner = ora(`Pinning MCP server: ${serverUrl}`).start();
    try {
      const policy = loadTrustPolicy();
      const manager = new TrustManager(policy);
      manager.pinMCPServer(serverUrl, options.fingerprint, options.mode);
      saveTrustPolicy(manager.getPolicy());

      spinner.succeed(chalk.green(`Pinned: ${serverUrl}`));
      detail('Fingerprint', options.fingerprint);
      detail('Mode', options.mode);
    } catch (error) {
      handleError(error, spinner);
    }
  });

const trustPinSkillCommand = new Command('pin-skill-source')
  .description('Pin a skill source')
  .argument('<path>', 'Path or git URL')
  .option('--commit <hash>', 'Git commit hash (for git sources)')
  .option('--hash <hash>', 'Content hash (for local sources)')
  .option('--mode <mode>', 'Pin mode: strict or warn', 'strict')
  .action(async (pathOrUrl: string, options) => {
    const isGit = pathOrUrl.startsWith('http') || pathOrUrl.startsWith('git@');
    const hash = isGit ? options.commit : options.hash;

    if (!hash) {
      console.error(chalk.red(`Please specify a ${isGit ? '--commit' : '--hash'} for the source`));
      process.exit(1);
    }

    const spinner = ora(`Pinning skill source: ${pathOrUrl}`).start();
    try {
      const policy = loadTrustPolicy();
      const manager = new TrustManager(policy);
      manager.pinSkillSource(isGit ? 'git' : 'local', pathOrUrl, hash, options.mode);
      saveTrustPolicy(manager.getPolicy());

      spinner.succeed(chalk.green(`Pinned: ${pathOrUrl}`));
      detail('Type', isGit ? 'git' : 'local');
      detail(isGit ? 'Commit' : 'Hash', hash);
    } catch (error) {
      handleError(error, spinner);
    }
  });

const trustAuditCommand = new Command('audit')
  .description('Audit trust policy and flag violations')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const spinner = ora('Auditing trust policy...').start();

    try {
      const trustPath = getTrustReadPath();
      const bindingsPath = resolveBindingsPath(getWorkspacePath());

      if (!existsSync(trustPath)) {
        spinner.info(chalk.yellow('No trust policy found. Run `tastekit trust init` first.'));
        return;
      }

      const trust = parseJsonOrYaml<TrustV1>(readFileSync(trustPath, 'utf-8'));

      // Load bindings if they exist
      const bindings: BindingsV1 = existsSync(bindingsPath)
        ? parseJsonOrYaml<BindingsV1>(readFileSync(bindingsPath, 'utf-8'))
        : { schema_version: 'bindings.v1', servers: [] };

      const auditor = new TrustAuditor();
      const report = auditor.audit(trust, bindings);

      if (report.passed && report.violations.length === 0) {
        spinner.succeed(chalk.green('Trust audit passed. No violations.'));
      } else if (report.passed) {
        spinner.warn(chalk.yellow(`Passed with ${report.violations.length} warning(s)`));
      } else {
        spinner.fail(chalk.red(`Audit failed with ${report.violations.length} violation(s)`));
      }

      if (globals.json) {
        jsonOutput({
          passed: report.passed,
          violations: report.violations,
          pinned_mcp_servers: trust.mcp_servers?.length || 0,
          pinned_skill_sources: trust.skill_sources?.length || 0,
          auto_updates: trust.update_policy?.allow_auto_updates || false,
        });
      }

      if (report.violations.length > 0) {
        console.log('');
        table(
          [
            { label: 'Severity', width: 10 },
            { label: 'Type', width: 20 },
            { label: 'Message', width: 50 },
          ],
          report.violations.map((v: any) => [
            v.severity === 'error' ? chalk.red('ERROR') : chalk.yellow('WARN'),
            v.type,
            v.message,
          ]),
        );
      }

      console.log('');
      detail('Pinned MCP servers', String(trust.mcp_servers?.length || 0));
      detail('Pinned skill sources', String(trust.skill_sources?.length || 0));
      detail('Auto-updates', trust.update_policy?.allow_auto_updates ? 'enabled' : 'disabled');
    } catch (error) {
      handleError(error, spinner);
    }
  });

export const trustCommand = new Command('trust')
  .description('Manage trust and provenance')
  .addCommand(trustInitCommand)
  .addCommand(trustPinMcpCommand)
  .addCommand(trustPinSkillCommand)
  .addCommand(trustAuditCommand);
