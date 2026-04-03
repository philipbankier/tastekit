import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cleanupWorkspace, makeTempWorkspace, runCli } from '../helpers/run-cli.js';

describe('tastekit init', () => {
  it('creates a workspace non-interactively with fixed domain and depth', async () => {
    const root = makeTempWorkspace('init-success');

    try {
      const result = await runCli(['init', '--domain', 'development-agent', '--depth', 'quick'], {
        cwd: root,
        input: '\n',
        env: {
          ANTHROPIC_API_KEY: 'fixture-key',
        },
      });

      expect(result.code).toBe(0);
      expect(existsSync(join(root, '.tastekit', 'tastekit.yaml'))).toBe(true);

      const config = readFileSync(join(root, '.tastekit', 'tastekit.yaml'), 'utf-8');
      expect(config).toContain('domain_id: development-agent');
      expect(config).toContain('depth: quick');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('fails when workspace already exists', async () => {
    const root = makeTempWorkspace('init-existing');

    try {
      const first = await runCli(['init', '--domain', 'development-agent', '--depth', 'quick'], {
        cwd: root,
        input: '\n',
      });
      expect(first.code).toBe(0);

      const second = await runCli(['init', '--domain', 'development-agent', '--depth', 'quick'], {
        cwd: root,
      });
      expect(second.code).not.toBe(0);
      expect(second.stderr + second.stdout).toContain('TasteKit workspace already exists');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('supports general-agent as a first-class domain', async () => {
    const root = makeTempWorkspace('init-general-agent');

    try {
      const result = await runCli(['init', '--domain', 'general-agent', '--depth', 'guided'], {
        cwd: root,
        input: '\n',
        env: {
          OLLAMA_HOST: 'http://127.0.0.1:11434',
        },
      });

      expect(result.code).toBe(0);
      expect(existsSync(join(root, '.tastekit', 'tastekit.yaml'))).toBe(true);

      const config = readFileSync(join(root, '.tastekit', 'tastekit.yaml'), 'utf-8');
      expect(config).toContain('domain_id: general-agent');
      expect(config).toContain('depth: guided');
    } finally {
      cleanupWorkspace(root);
    }
  });

  it('writes explicit Ollama model from OLLAMA_MODEL env', async () => {
    const root = makeTempWorkspace('init-ollama-model');

    try {
      const result = await runCli(['init', '--domain', 'general-agent', '--depth', 'guided'], {
        cwd: root,
        env: {
          OLLAMA_MODEL: 'fixture-ollama-model',
          ANTHROPIC_API_KEY: undefined,
          OPENAI_API_KEY: undefined,
        },
        timeoutMs: 45000,
      });

      expect(result.code).toBe(0);
      const config = readFileSync(join(root, '.tastekit', 'tastekit.yaml'), 'utf-8');
      expect(config).toContain('provider: ollama');
      expect(config).toContain('model: fixture-ollama-model');
    } finally {
      cleanupWorkspace(root);
    }
  });
});
