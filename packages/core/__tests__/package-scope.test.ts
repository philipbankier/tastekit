import { describe, expect, it } from 'vitest';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, any>;
}

function packageJsonPaths() {
  const packagesDir = join(repoRoot, 'packages');
  return readdirSync(packagesDir)
    .map(name => join(packagesDir, name, 'package.json'))
    .filter(path => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    });
}

describe('npm package scope', () => {
  it('publishes TasteKit packages under the canonical @kairox_ai scope', () => {
    const names = packageJsonPaths().map(path => readJson(path).name).sort();

    expect(names).toEqual([
      '@kairox_ai/tastekit-adapters',
      '@kairox_ai/tastekit-cli',
      '@kairox_ai/tastekit-core',
      '@kairox_ai/tastekit-validator',
      '@kairox_ai/tastekit-voice',
    ]);
  });

  it('does not leave old @tastekit package references in package manifests', () => {
    const files = [join(repoRoot, 'package.json'), ...packageJsonPaths()];
    const offenders = files.flatMap(path => {
      const content = readFileSync(path, 'utf-8');
      return content.includes('@tastekit/')
        ? [relative(repoRoot, path)]
        : [];
    });

    expect(offenders).toEqual([]);
  });

  it('keeps all publishable package versions aligned for v0.2.0', () => {
    const files = [join(repoRoot, 'package.json'), ...packageJsonPaths()];
    const versions = Object.fromEntries(files.map(path => [
      relative(repoRoot, path),
      readJson(path).version,
    ]));

    expect(versions).toEqual({
      'package.json': '0.2.0',
      'packages/adapters/package.json': '0.2.0',
      'packages/cli/package.json': '0.2.0',
      'packages/core/package.json': '0.2.0',
      'packages/validator/package.json': '0.2.0',
      'packages/voice/package.json': '0.2.0',
    });
  });
});
