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
  it('publishes TasteKit packages under the canonical @actrun_ai scope', () => {
    const names = packageJsonPaths().map(path => readJson(path).name).sort();

    expect(names).toEqual([
      '@actrun_ai/tastekit-adapters',
      '@actrun_ai/tastekit-cli',
      '@actrun_ai/tastekit-core',
      '@actrun_ai/tastekit-validator',
      '@actrun_ai/tastekit-voice',
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
});
