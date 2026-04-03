/**
 * Memory Consolidator
 *
 * Consolidates memory based on salience and retention policy.
 * Includes merge detection for similar memories using content overlap.
 */

export interface ConsolidationPlan {
  timestamp: string;
  memories_to_keep: string[];
  memories_to_prune: string[];
  memories_to_merge: Array<{
    source_ids: string[];
    merged_content: string;
  }>;
}

export interface MemoryEntry {
  id: string;
  content: string;
  salience: number;
  timestamp: string;
}

export class MemoryConsolidator {
  /**
   * Generate a consolidation plan based on salience scores and retention policy.
   *
   * Steps:
   * 1. Separate memories by retention eligibility (age + salience)
   * 2. Among kept memories, detect mergeable pairs (high content overlap)
   * 3. Return plan for runtime to execute
   */
  generateConsolidationPlan(
    memories: MemoryEntry[],
    retentionDays: number
  ): ConsolidationPlan {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

    const toKeep: MemoryEntry[] = [];
    const toPrune: string[] = [];

    for (const memory of memories) {
      const memoryDate = new Date(memory.timestamp);

      // Keep if recent or high salience
      if (memoryDate >= cutoffDate || memory.salience > 0.7) {
        toKeep.push(memory);
      } else {
        toPrune.push(memory.id);
      }
    }

    // Detect merge candidates among kept memories
    const merges = this.detectMerges(toKeep);

    // Remove merged memory IDs from the keep list
    const mergedIds = new Set(merges.flatMap(m => m.source_ids));
    const keepIds = toKeep
      .filter(m => !mergedIds.has(m.id))
      .map(m => m.id);

    return {
      timestamp: now.toISOString(),
      memories_to_keep: keepIds,
      memories_to_prune: toPrune,
      memories_to_merge: merges,
    };
  }

  /**
   * Detect memories that are similar enough to merge.
   * Uses word-level Jaccard similarity (threshold: 0.6).
   */
  private detectMerges(memories: MemoryEntry[]): ConsolidationPlan['memories_to_merge'] {
    const merges: ConsolidationPlan['memories_to_merge'] = [];
    const merged = new Set<string>();

    for (let i = 0; i < memories.length; i++) {
      if (merged.has(memories[i].id)) continue;

      const group = [memories[i]];

      for (let j = i + 1; j < memories.length; j++) {
        if (merged.has(memories[j].id)) continue;

        const similarity = this.jaccardSimilarity(
          memories[i].content,
          memories[j].content
        );

        if (similarity >= 0.6) {
          group.push(memories[j]);
          merged.add(memories[j].id);
        }
      }

      if (group.length > 1) {
        merged.add(memories[i].id);
        // Merge by keeping the highest-salience version and appending unique details
        const sorted = group.sort((a, b) => b.salience - a.salience);
        const primary = sorted[0];
        const additionalDetails = sorted.slice(1)
          .map(m => this.extractUniqueContent(m.content, primary.content))
          .filter(detail => detail.length > 0);

        let mergedContent = primary.content;
        if (additionalDetails.length > 0) {
          mergedContent += '\n\nAdditional context: ' + additionalDetails.join('; ');
        }

        merges.push({
          source_ids: group.map(m => m.id),
          merged_content: mergedContent,
        });
      }
    }

    return merges;
  }

  /**
   * Word-level Jaccard similarity between two strings.
   */
  private jaccardSimilarity(a: string, b: string): number {
    const wordsA = new Set(this.tokenize(a));
    const wordsB = new Set(this.tokenize(b));

    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }

    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Extract content from source that is not already in primary.
   */
  private extractUniqueContent(source: string, primary: string): string {
    const primaryWords = new Set(this.tokenize(primary));
    const sourceWords = this.tokenize(source);
    const unique = sourceWords.filter(w => !primaryWords.has(w));
    return unique.join(' ');
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  }
}
