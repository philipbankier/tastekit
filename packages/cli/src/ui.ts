/**
 * Shared UI utilities for TasteKit CLI.
 *
 * Centralizes formatting, error handling, and output patterns
 * used across all CLI commands.
 */

import chalk from 'chalk';
import type { Command } from 'commander';
import type { Ora } from 'ora';

// ---------------------------------------------------------------------------
// Global options
// ---------------------------------------------------------------------------

export interface GlobalOptions {
  json: boolean;
  verbose: boolean;
}

/**
 * Extract --json and --verbose from the root program options.
 */
export function getGlobalOptions(cmd: Command): GlobalOptions {
  let current: Command | null | undefined = cmd;
  let json = false;
  let verbose = false;

  // Commander nests options by command level. Walk parents so both
  // `tastekit --json skills list` and `tastekit skills list --json` work.
  while (current) {
    const opts = current.opts();
    json = json || Boolean(opts.json);
    verbose = verbose || Boolean(opts.verbose);
    current = current.parent;
  }

  return {
    json,
    verbose,
  };
}

// ---------------------------------------------------------------------------
// Colors & risk
// ---------------------------------------------------------------------------

/**
 * Return a chalk-colored string for a risk/severity level.
 */
export function riskColor(level: string): string {
  switch (level) {
    case 'high':
    case 'critical':
    case 'error':
      return chalk.red(level);
    case 'medium':
    case 'med':
    case 'warn':
      return chalk.yellow(level);
    default:
      return chalk.green(level);
  }
}

// ---------------------------------------------------------------------------
// Section formatting
// ---------------------------------------------------------------------------

/**
 * Print a bold section header with surrounding newlines.
 */
export function header(title: string): void {
  console.log(chalk.bold(`\n${title}\n`));
}

/**
 * Print a labeled detail line (indented).
 */
export function detail(label: string, value: string): void {
  console.log(`  ${chalk.gray(label + ':')} ${value}`);
}

/**
 * Print a "Run <cmd> to <desc>" hint.
 */
export function hint(cmd: string, desc: string): void {
  console.log(chalk.cyan('  Run ') + chalk.bold(cmd) + chalk.cyan(` to ${desc}`));
}

/**
 * Print a block of next-step hints.
 */
export function nextSteps(hints: Array<{ cmd: string; desc: string }>): void {
  console.log('\nNext steps:');
  for (const h of hints) {
    hint(h.cmd, h.desc);
  }
}

// ---------------------------------------------------------------------------
// Table formatting
// ---------------------------------------------------------------------------

interface Column {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

/**
 * Print a simple columnar table with header and rows.
 *
 * Color is applied AFTER padding so ANSI codes don't break alignment.
 * Each cell value should be a plain string; use `colorFn` in the row data
 * if you need color on specific cells (apply after this renders).
 */
export function table(columns: Column[], rows: string[][]): void {
  // Header
  const headerLine = columns
    .map(c => c.label.padEnd(c.width))
    .join('  ');
  console.log(chalk.gray('  ' + headerLine));
  console.log(chalk.gray('  ' + columns.map(c => '─'.repeat(c.width)).join('  ')));

  // Rows
  for (const row of rows) {
    const line = columns
      .map((c, i) => {
        const val = (row[i] ?? '').slice(0, c.width);
        return c.align === 'right' ? val.padStart(c.width) : val.padEnd(c.width);
      })
      .join('  ');
    console.log('  ' + line);
  }
}

// ---------------------------------------------------------------------------
// JSON output
// ---------------------------------------------------------------------------

/**
 * Print data as formatted JSON and exit.
 */
export function jsonOutput(data: unknown): never {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Verbose logging
// ---------------------------------------------------------------------------

/**
 * Log a message only when --verbose is active.
 */
export function verbose(msg: string, globals: GlobalOptions): void {
  if (globals.verbose) {
    console.error(chalk.gray(`[verbose] ${msg}`));
  }
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/**
 * Unified error handler for catch blocks.
 *
 * - Stops spinner if provided (fail or stop)
 * - Prints error message in red
 * - Exits with code 1
 */
export function handleError(error: unknown, spinner?: Ora): never {
  const message = error instanceof Error ? error.message : String(error);
  if (spinner) {
    spinner.fail(chalk.red(message));
  } else {
    console.error(chalk.red(message));
  }
  process.exit(1);
}
