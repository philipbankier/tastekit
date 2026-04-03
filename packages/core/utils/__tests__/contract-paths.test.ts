import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveBindingsPath, resolveTrustPath } from '../filesystem.js';

const tempRoots: string[] = [];

function newWorkspace(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  tempRoots.push(root);
  const tastekit = join(root, '.tastekit');
  mkdirSync(tastekit, { recursive: true });
  return tastekit;
}

afterEach(() => {
  while (tempRoots.length) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('cross-cutting contract paths', () => {
  it('returns canonical root JSON paths', () => {
    const workspace = newWorkspace('tastekit-contract-default-');

    expect(resolveTrustPath(workspace)).toBe(join(workspace, 'trust.v1.json'));
    expect(resolveBindingsPath(workspace)).toBe(join(workspace, 'bindings.v1.json'));
  });

  it('does not perform fallback resolution', () => {
    const workspace = newWorkspace('tastekit-contract-canonical-first-');
    expect(resolveTrustPath(workspace)).toBe(join(workspace, 'trust.v1.json'));
    expect(resolveBindingsPath(workspace)).toBe(join(workspace, 'bindings.v1.json'));
  });
});
