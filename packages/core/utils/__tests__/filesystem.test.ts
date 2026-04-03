import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveTracesPath } from '../filesystem.js';

function createTastekitDir(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  return join(root, '.tastekit');
}

describe('resolveTracesPath', () => {
  it('returns the flat traces path', () => {
    const tastekitPath = createTastekitDir('tastekit-utils-v2-');
    mkdirSync(join(tastekitPath, 'traces'), { recursive: true });

    expect(resolveTracesPath(tastekitPath)).toBe(join(tastekitPath, 'traces'));

    rmSync(join(tastekitPath, '..'), { recursive: true, force: true });
  });

  it('does not perform filesystem fallback checks', () => {
    const tastekitPath = createTastekitDir('tastekit-utils-v1-');
    expect(resolveTracesPath(tastekitPath)).toBe(join(tastekitPath, 'traces'));

    rmSync(join(tastekitPath, '..'), { recursive: true, force: true });
  });

  it('defaults to traces for new workspaces', () => {
    const tastekitPath = createTastekitDir('tastekit-utils-default-');

    expect(resolveTracesPath(tastekitPath)).toBe(join(tastekitPath, 'traces'));

    rmSync(join(tastekitPath, '..'), { recursive: true, force: true });
  });
});
