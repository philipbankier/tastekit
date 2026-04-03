import { describe, it, expect } from 'vitest';
import { MemoryConsolidator, MemoryEntry } from '../consolidator.js';

function makeMemory(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: `mem-${Math.random().toString(36).slice(2, 8)}`,
    content: 'User prefers TypeScript over JavaScript',
    salience: 0.8,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('MemoryConsolidator', () => {
  const consolidator = new MemoryConsolidator();

  // ─── Retention ───

  describe('retention', () => {
    it('keeps recent memories regardless of salience', () => {
      const memories = [
        makeMemory({ id: 'recent-low', salience: 0.1, timestamp: daysAgo(1) }),
      ];
      const plan = consolidator.generateConsolidationPlan(memories, 30);
      expect(plan.memories_to_keep).toContain('recent-low');
      expect(plan.memories_to_prune).not.toContain('recent-low');
    });

    it('prunes old low-salience memories', () => {
      const memories = [
        makeMemory({ id: 'old-low', salience: 0.3, timestamp: daysAgo(60) }),
      ];
      const plan = consolidator.generateConsolidationPlan(memories, 30);
      expect(plan.memories_to_prune).toContain('old-low');
    });

    it('keeps old memories with high salience (> 0.7)', () => {
      const memories = [
        makeMemory({ id: 'old-high', salience: 0.9, timestamp: daysAgo(60) }),
      ];
      const plan = consolidator.generateConsolidationPlan(memories, 30);
      expect(plan.memories_to_keep).toContain('old-high');
    });

    it('respects retention days parameter', () => {
      const memories = [
        makeMemory({ id: 'm1', salience: 0.5, timestamp: daysAgo(10) }),
      ];
      // With 5-day retention, this 10-day-old memory should be pruned
      const plan5 = consolidator.generateConsolidationPlan(memories, 5);
      expect(plan5.memories_to_prune).toContain('m1');

      // With 15-day retention, it should be kept
      const plan15 = consolidator.generateConsolidationPlan(memories, 15);
      expect(plan15.memories_to_keep).toContain('m1');
    });
  });

  // ─── Merge Detection ───

  describe('merge detection', () => {
    it('merges similar memories (Jaccard >= 0.6)', () => {
      const memories = [
        makeMemory({
          id: 'sim1',
          content: 'User prefers TypeScript over JavaScript for web development',
          salience: 0.8,
          timestamp: daysAgo(1),
        }),
        makeMemory({
          id: 'sim2',
          content: 'User prefers TypeScript over JavaScript for all projects',
          salience: 0.7,
          timestamp: daysAgo(2),
        }),
      ];
      const plan = consolidator.generateConsolidationPlan(memories, 30);
      expect(plan.memories_to_merge.length).toBe(1);
      expect(plan.memories_to_merge[0].source_ids).toContain('sim1');
      expect(plan.memories_to_merge[0].source_ids).toContain('sim2');
    });

    it('does not merge dissimilar memories', () => {
      const memories = [
        makeMemory({
          id: 'diff1',
          content: 'User prefers TypeScript over JavaScript',
          salience: 0.8,
          timestamp: daysAgo(1),
        }),
        makeMemory({
          id: 'diff2',
          content: 'Meeting scheduled for Friday afternoon at three',
          salience: 0.5,
          timestamp: daysAgo(2),
        }),
      ];
      const plan = consolidator.generateConsolidationPlan(memories, 30);
      expect(plan.memories_to_merge.length).toBe(0);
    });

    it('keeps highest-salience version as primary in merge', () => {
      const memories = [
        makeMemory({
          id: 'low-sal',
          content: 'User prefers TypeScript over JavaScript for web development',
          salience: 0.5,
          timestamp: daysAgo(1),
        }),
        makeMemory({
          id: 'high-sal',
          content: 'User prefers TypeScript over JavaScript for all projects',
          salience: 0.9,
          timestamp: daysAgo(2),
        }),
      ];
      const plan = consolidator.generateConsolidationPlan(memories, 30);
      expect(plan.memories_to_merge.length).toBe(1);
      // Primary content should come from high-salience memory
      expect(plan.memories_to_merge[0].merged_content).toContain('all projects');
    });

    it('merged IDs are removed from keep list', () => {
      const memories = [
        makeMemory({
          id: 'merge-a',
          content: 'User prefers TypeScript over JavaScript for web development',
          salience: 0.8,
          timestamp: daysAgo(1),
        }),
        makeMemory({
          id: 'merge-b',
          content: 'User prefers TypeScript over JavaScript for all projects',
          salience: 0.7,
          timestamp: daysAgo(2),
        }),
        makeMemory({
          id: 'standalone',
          content: 'Agent should always explain reasoning',
          salience: 0.9,
          timestamp: daysAgo(3),
        }),
      ];
      const plan = consolidator.generateConsolidationPlan(memories, 30);
      expect(plan.memories_to_keep).toContain('standalone');
      expect(plan.memories_to_keep).not.toContain('merge-a');
      expect(plan.memories_to_keep).not.toContain('merge-b');
    });
  });

  // ─── Edge Cases ───

  describe('edge cases', () => {
    it('handles empty memory list', () => {
      const plan = consolidator.generateConsolidationPlan([], 30);
      expect(plan.memories_to_keep).toEqual([]);
      expect(plan.memories_to_prune).toEqual([]);
      expect(plan.memories_to_merge).toEqual([]);
    });

    it('handles single memory', () => {
      const memories = [makeMemory({ id: 'solo', timestamp: daysAgo(1) })];
      const plan = consolidator.generateConsolidationPlan(memories, 30);
      expect(plan.memories_to_keep).toEqual(['solo']);
      expect(plan.memories_to_merge).toEqual([]);
    });

    it('sets timestamp on plan', () => {
      const plan = consolidator.generateConsolidationPlan([], 30);
      expect(plan.timestamp).toBeTruthy();
      // Should be valid ISO date
      expect(() => new Date(plan.timestamp)).not.toThrow();
    });
  });
});
