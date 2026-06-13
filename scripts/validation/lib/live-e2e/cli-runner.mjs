import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

export const CLI_PATH = resolve('packages/cli/dist/cli.js');
export const VALIDATOR_PATH = resolve('packages/validator/dist/cli.js');

export async function runNodeScript(scriptPath, args, { cwd = process.cwd(), env = {}, timeoutMs = 120000 } = {}) {
  return await runCommand(process.execPath, [scriptPath, ...args], { cwd, env, timeoutMs });
}

export async function runTastekit(args, options = {}) {
  return runNodeScript(CLI_PATH, args, options);
}

export async function runValidator(args, options = {}) {
  return runNodeScript(VALIDATOR_PATH, args, options);
}

export async function runCommand(command, args, { cwd, env = {}, timeoutMs = 120000 } = {}) {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out: ${command} ${args.join(' ')}`));
    }, timeoutMs);
    child.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timeout);
      resolvePromise({ code: code ?? 1, stdout, stderr, command, args, cwd });
    });
  });
}
