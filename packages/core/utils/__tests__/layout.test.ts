import { afterEach, describe, expect, it } from 'vitest';
import { resolveArtifactPath, resolvePlaybooksPath, resolveSessionPath, resolveSkillsPath } from '../filesystem.js';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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

describe('layout resolution', () => {
  it('resolves artifact paths in the flat workspace layout', () => {
    const workspace = newWorkspace('tastekit-layout-artifacts-');
    expect(resolveArtifactPath(workspace, 'constitution')).toBe(join(workspace, 'constitution.v1.json'));
    expect(resolveArtifactPath(workspace, 'guardrails')).toBe(join(workspace, 'guardrails.v1.yaml'));
    expect(resolveArtifactPath(workspace, 'memory')).toBe(join(workspace, 'memory.v1.yaml'));
  });

  it('resolves skills, playbooks, and session paths in the flat workspace layout', () => {
    const workspace = newWorkspace('tastekit-layout-resolve-');

    expect(resolveSkillsPath(workspace)).toBe(join(workspace, 'skills'));
    expect(resolvePlaybooksPath(workspace)).toBe(join(workspace, 'playbooks'));
    expect(resolveSessionPath(workspace)).toBe(join(workspace, 'session.json'));
  });
});
