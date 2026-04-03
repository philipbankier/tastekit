import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '../../dist/cli.js');
const REPO_ROOT = resolve(__dirname, '../../../../');

export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface CliOptions {
  cwd: string;
  env?: Record<string, string | undefined>;
  input?: string;
  timeoutMs?: number;
}

export async function runCli(args: string[], options: CliOptions): Promise<CliResult> {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`CLI command timed out: tastekit ${args.join(' ')}`));
    }, options.timeoutMs ?? 30000);

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolvePromise({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });

    if (options.input !== undefined) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

export function makeTempWorkspace(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `tastekit-cli-${prefix}-`));
}

export function cleanupWorkspace(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

export function fixturePath(...segments: string[]): string {
  return join(REPO_ROOT, 'fixtures', 'testing', ...segments);
}

export function copyFixtureWorkspace(relativeFixturePath: string, destinationPath: string): void {
  const sourcePath = fixturePath(relativeFixturePath);
  cpSync(sourcePath, destinationPath, { recursive: true });
}

export function patchFile(path: string, replacer: (text: string) => string): void {
  const current = readFileSync(path, 'utf-8');
  writeFileSync(path, replacer(current), 'utf-8');
}
