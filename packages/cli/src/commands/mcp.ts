import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { resolveBindingsPath } from '@tastekit/core/utils';
import { getGlobalOptions, riskColor, header, detail, hint, table, handleError, jsonOutput, verbose } from '../ui.js';

interface MCPServerRegistry {
  servers: Record<string, {
    name: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    transport?: 'stdio' | 'streamable-http';
    pinned?: boolean;
    added_at: string;
  }>;
}

function getRegistryPath(): string {
  return join(process.cwd(), '.tastekit', 'mcp', 'servers.json');
}

function loadRegistry(): MCPServerRegistry {
  const path = getRegistryPath();
  if (!existsSync(path)) {
    return { servers: {} };
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function saveRegistry(registry: MCPServerRegistry): void {
  const path = getRegistryPath();
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(registry, null, 2), 'utf-8');
}

const mcpAddCommand = new Command('add')
  .description('Add an MCP server')
  .argument('<server_ref>', 'Server command or URL')
  .option('--name <name>', 'Server name')
  .option('--args <args>', 'Command arguments (comma-separated)')
  .option('--pin', 'Pin server fingerprint after adding')
  .action(async (serverRef: string, options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const spinner = ora(`Adding MCP server: ${serverRef}`).start();

    try {
      const registry = loadRegistry();
      const name = options.name || serverRef.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '') || 'server';

      // Determine if this is a command (stdio) or URL (http)
      const isUrl = serverRef.startsWith('http://') || serverRef.startsWith('https://');

      registry.servers[name] = {
        name,
        ...(isUrl ? { url: serverRef, transport: 'streamable-http' } : {
          command: serverRef,
          args: options.args ? options.args.split(',') : [],
          transport: 'stdio',
        }),
        pinned: false,
        added_at: new Date().toISOString(),
      };

      saveRegistry(registry);

      spinner.succeed(chalk.green(`MCP server added: ${name}`));

      if (globals.json) {
        jsonOutput({ name, transport: isUrl ? 'streamable-http' : 'stdio', ref: serverRef });
      }

      detail('Transport', isUrl ? 'streamable-http' : 'stdio');
      detail('Ref', serverRef);
      console.log('');
      hint(`tastekit mcp inspect ${name}`, 'discover tools');
      hint('tastekit mcp bind', 'select and bind tools');
    } catch (error) {
      handleError(error, spinner);
    }
  });

const mcpListCommand = new Command('list')
  .description('List configured MCP servers')
  .action(async (_options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const registry = loadRegistry();
    const servers = Object.values(registry.servers);

    if (servers.length === 0) {
      if (globals.json) jsonOutput({ servers: [] });
      console.log(chalk.gray('No MCP servers configured.'));
      hint('tastekit mcp add <command_or_url>', 'add a server');
      return;
    }

    if (globals.json) {
      jsonOutput({ servers });
    }

    header('MCP Servers');

    table(
      [
        { label: 'Name', width: 20 },
        { label: 'Transport', width: 16 },
        { label: 'Ref', width: 30 },
        { label: 'Pinned', width: 10 },
        { label: 'Added', width: 20 },
      ],
      servers.map(s => [
        chalk.bold(s.name),
        s.transport || 'stdio',
        s.url || s.command || '',
        s.pinned ? chalk.green('yes') : chalk.gray('no'),
        s.added_at.split('T')[0],
      ]),
    );

    console.log(chalk.gray(`\n  ${servers.length} server(s) configured.`));
  });

const mcpInspectCommand = new Command('inspect')
  .description('Inspect an MCP server (discover tools, resources, prompts)')
  .argument('<server>', 'Server name from registry')
  .action(async (serverName: string, _options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const registry = loadRegistry();
    const serverConfig = registry.servers[serverName];

    if (!serverConfig) {
      console.error(chalk.red(`Server not found: ${serverName}`));
      hint('tastekit mcp list', 'see configured servers');
      process.exit(1);
    }

    const spinner = ora(`Connecting to ${serverName}...`).start();

    try {
      const { MCPClient } = await import('@tastekit/core/mcp');
      const client = new MCPClient(serverConfig);

      await client.connect();
      verbose(`Connected to ${serverName}`, globals);
      spinner.text = `Discovering capabilities of ${serverName}...`;

      const tools = await client.listTools();
      const resources = await client.listResources();
      const prompts = await client.listPrompts();
      const fingerprint = await client.getFingerprint();

      await client.disconnect();

      spinner.succeed(chalk.green(`Inspected: ${serverName}`));

      if (globals.json) {
        jsonOutput({ server: serverName, fingerprint, tools, resources, prompts });
      }

      detail('Fingerprint', fingerprint);
      console.log('');

      if (tools.length > 0) {
        console.log(chalk.bold('  Tools:'));
        table(
          [
            { label: 'Name', width: 24 },
            { label: 'Risk', width: 14 },
            { label: 'Description', width: 40 },
          ],
          tools.map((tool: any) => [
            tool.name,
            tool.annotations?.destructive ? chalk.red('destructive')
              : tool.annotations?.risk === 'high' ? chalk.yellow('high')
              : chalk.green('low'),
            tool.description || '',
          ]),
        );
        console.log('');
      }

      if (resources.length > 0) {
        console.log(chalk.bold('  Resources:'));
        for (const r of resources) {
          console.log(`    ${r.uri} ${r.name ? chalk.gray(`(${r.name})`) : ''}`);
        }
        console.log('');
      }

      if (prompts.length > 0) {
        console.log(chalk.bold('  Prompts:'));
        for (const p of prompts) {
          console.log(`    ${p.name} ${p.description ? chalk.gray(`- ${p.description}`) : ''}`);
        }
        console.log('');
      }

      if (tools.length === 0 && resources.length === 0 && prompts.length === 0) {
        console.log(chalk.yellow('  No tools, resources, or prompts discovered.'));
      }
    } catch (error) {
      handleError(error, spinner);
    }
  });

const mcpBindCommand = new Command('bind')
  .description('Select and bind tools from MCP servers')
  .option('--server <name>', 'Bind tools from specific server')
  .option('--all', 'Bind all tools from all servers')
  .action(async (options, cmd) => {
    const globals = getGlobalOptions(cmd);
    const spinner = ora('Binding MCP tools...').start();

    try {
      const registry = loadRegistry();
      const servers = options.server
        ? [registry.servers[options.server]].filter(Boolean)
        : Object.values(registry.servers);

      if (servers.length === 0) {
        spinner.info(chalk.yellow('No servers to bind. Add servers with `tastekit mcp add`.'));
        return;
      }

      const { MCPClient, MCPBinder } = await import('@tastekit/core/mcp');
      const binder = new MCPBinder();
      const allBindings: any[] = [];
      const allGuardrails: any[] = [];

      for (const serverConfig of servers) {
        const client = new MCPClient(serverConfig);
        try {
          await client.connect();
          verbose(`Binding tools from ${serverConfig.name}`, globals);
          const { bindings, guardrails } = await binder.bindServer(
            client,
            serverConfig.name,
            serverConfig.url || serverConfig.command || '',
            { autoApproveRead: true }
          );
          allBindings.push(bindings);
          allGuardrails.push(...guardrails);
          await client.disconnect();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(chalk.yellow(`  Skipping ${serverConfig.name}: ${msg}`));
        }
      }

      // Save bindings
      const bindingsArtifact = {
        schema_version: 'bindings.v1',
        servers: allBindings,
      };

      const workspacePath = join(process.cwd(), '.tastekit');
      const bindingsPath = join(workspacePath, 'bindings.v1.json');
      const priorBindingsPath = resolveBindingsPath(workspacePath);
      mkdirSync(workspacePath, { recursive: true });
      writeFileSync(
        bindingsPath,
        JSON.stringify(bindingsArtifact, null, 2),
        'utf-8'
      );

      const totalTools = allBindings.reduce((sum, b) => sum + (b.tools?.length || 0), 0);
      spinner.succeed(chalk.green(`Bound ${totalTools} tool(s) from ${allBindings.length} server(s)`));

      if (globals.json) {
        jsonOutput(bindingsArtifact);
      }

      detail('Bindings saved to', '.tastekit/bindings.v1.json');
      if (priorBindingsPath !== bindingsPath && existsSync(priorBindingsPath)) {
        detail('Legacy bindings detected', priorBindingsPath);
      }
    } catch (error) {
      handleError(error, spinner);
    }
  });

export const mcpCommand = new Command('mcp')
  .description('Manage MCP server bindings')
  .addCommand(mcpAddCommand)
  .addCommand(mcpListCommand)
  .addCommand(mcpInspectCommand)
  .addCommand(mcpBindCommand);
