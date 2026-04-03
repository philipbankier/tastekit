import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { SkillVersioner } from '../versioner.js';

describe('SkillVersioner', () => {
  const tempDirs: string[] = [];

  function setup(): SkillVersioner {
    const dir = mkdtempSync(join(tmpdir(), 'tastekit-versioner-'));
    tempDirs.push(dir);
    return new SkillVersioner(dir);
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('records first version as v1', () => {
    const v = setup();
    const version = v.recordVersion('my-skill', '# Purpose\nDo stuff');
    expect(version.version).toBe(1);
    expect(version.content_hash).toBeTruthy();
    expect(version.timestamp).toBeTruthy();
  });

  it('increments version number', () => {
    const v = setup();
    v.recordVersion('my-skill', 'content v1');
    const v2 = v.recordVersion('my-skill', 'content v2');
    expect(v2.version).toBe(2);
  });

  it('skips when content is unchanged (same hash)', () => {
    const v = setup();
    const v1 = v.recordVersion('my-skill', 'same content');
    const v2 = v.recordVersion('my-skill', 'same content');
    expect(v2.version).toBe(v1.version);
    expect(v.getHistory('my-skill').versions).toHaveLength(1);
  });

  it('stores amendment_id and eval_score', () => {
    const v = setup();
    const version = v.recordVersion('my-skill', 'content', {
      amendmentId: 'amend-123',
      evalScore: 0.85,
    });
    expect(version.amendment_id).toBe('amend-123');
    expect(version.eval_score).toBe(0.85);
  });

  it('returns empty history for unknown skill', () => {
    const v = setup();
    const history = v.getHistory('nonexistent');
    expect(history.skill_id).toBe('nonexistent');
    expect(history.versions).toEqual([]);
    expect(history.current).toBe(0);
  });

  it('returns full history after multiple versions', () => {
    const v = setup();
    v.recordVersion('my-skill', 'v1 content');
    v.recordVersion('my-skill', 'v2 content');
    v.recordVersion('my-skill', 'v3 content');

    const history = v.getHistory('my-skill');
    expect(history.versions).toHaveLength(3);
    expect(history.current).toBe(3);
  });

  it('rollback sets current pointer', () => {
    const v = setup();
    v.recordVersion('my-skill', 'v1 content');
    v.recordVersion('my-skill', 'v2 content');

    const target = v.rollback('my-skill', 1);
    expect(target.version).toBe(1);
    expect(v.getHistory('my-skill').current).toBe(1);
  });

  it('rollback throws for nonexistent version', () => {
    const v = setup();
    v.recordVersion('my-skill', 'content');
    expect(() => v.rollback('my-skill', 99)).toThrow('Version 99 not found');
  });

  it('getVersion returns specific version', () => {
    const v = setup();
    v.recordVersion('my-skill', 'v1');
    v.recordVersion('my-skill', 'v2');

    const found = v.getVersion('my-skill', 1);
    expect(found).not.toBeNull();
    expect(found!.version).toBe(1);
  });

  it('getVersion returns null for nonexistent version', () => {
    const v = setup();
    expect(v.getVersion('my-skill', 1)).toBeNull();
  });

  it('isolates histories between different skills', () => {
    const v = setup();
    v.recordVersion('skill-a', 'content a');
    v.recordVersion('skill-b', 'content b');

    expect(v.getHistory('skill-a').versions).toHaveLength(1);
    expect(v.getHistory('skill-b').versions).toHaveLength(1);
  });
});
