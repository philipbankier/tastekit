import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Filesystem utilities for TasteKit
 */

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function writeFileSafe(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content, 'utf-8');
}

export function readFileIfExists(path: string): string | null {
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8');
  }
  return null;
}

export function atomicWrite(path: string, content: string): void {
  ensureDir(dirname(path));
  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, content, 'utf-8');
  renameSync(tempPath, path);
}

export function resolveArtifactPath(
  workspacePath: string,
  artifact: 'constitution' | 'guardrails' | 'memory',
): string {
  const filenames: Record<string, string> = {
    constitution: 'constitution.v1.json',
    guardrails: 'guardrails.v1.yaml',
    memory: 'memory.v1.yaml',
  };
  return join(workspacePath, filenames[artifact]);
}

export function resolveTracesPath(workspacePath: string): string {
  return join(workspacePath, 'traces');
}

export function resolveSkillsPath(workspacePath: string): string {
  return join(workspacePath, 'skills');
}

export function resolvePlaybooksPath(workspacePath: string): string {
  return join(workspacePath, 'playbooks');
}

export function resolveSessionPath(workspacePath: string): string {
  return join(workspacePath, 'session.json');
}

export function resolveTrustPath(workspacePath: string): string {
  return join(workspacePath, 'trust.v1.json');
}

export function resolveBindingsPath(workspacePath: string): string {
  return join(workspacePath, 'bindings.v1.json');
}
