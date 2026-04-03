import { SkillVersion, SkillVersionHistory } from '../schemas/skills.js';
import { readFileIfExists, writeFileSafe, ensureDir } from '../utils/filesystem.js';
import { hashString } from '../utils/hash.js';
import { join } from 'path';

/**
 * Skill Versioner — Track skill instruction history for rollback
 *
 * Stores version snapshots in .tastekit/skill-versions/{skill_id}.versions.json.
 * Each version records content hash, timestamp, optional amendment ID, and eval score.
 */

const VERSIONS_DIR = 'skill-versions';

export class SkillVersioner {
  private basePath: string;

  constructor(workspacePath: string) {
    this.basePath = join(workspacePath, VERSIONS_DIR);
    ensureDir(this.basePath);
  }

  /** Record a new version of a skill's content. Returns the version number. */
  recordVersion(
    skillId: string,
    content: string,
    opts?: { amendmentId?: string; evalScore?: number },
  ): SkillVersion {
    const history = this.getHistory(skillId);
    const contentHash = hashString(content);

    // Skip if content hasn't changed
    if (history.versions.length > 0) {
      const latest = history.versions[history.versions.length - 1];
      if (latest.content_hash === contentHash) {
        return latest;
      }
    }

    const version: SkillVersion = {
      version: history.versions.length + 1,
      content_hash: contentHash,
      timestamp: new Date().toISOString(),
      amendment_id: opts?.amendmentId,
      eval_score: opts?.evalScore,
    };

    history.versions.push(version);
    history.current = version.version;
    this.saveHistory(skillId, history);

    return version;
  }

  /** Get the full version history for a skill. */
  getHistory(skillId: string): SkillVersionHistory {
    const filePath = this.historyPath(skillId);
    const content = readFileIfExists(filePath);

    if (content) {
      return JSON.parse(content) as SkillVersionHistory;
    }

    return {
      skill_id: skillId,
      versions: [],
      current: 0,
    };
  }

  /** Get a specific version. */
  getVersion(skillId: string, versionNumber: number): SkillVersion | null {
    const history = this.getHistory(skillId);
    return history.versions.find(v => v.version === versionNumber) ?? null;
  }

  /** Set the current version pointer (for rollback). */
  rollback(skillId: string, toVersion: number): SkillVersion {
    const history = this.getHistory(skillId);
    const target = history.versions.find(v => v.version === toVersion);

    if (!target) {
      throw new Error(`Version ${toVersion} not found for skill "${skillId}"`);
    }

    history.current = toVersion;
    this.saveHistory(skillId, history);

    return target;
  }

  private historyPath(skillId: string): string {
    return join(this.basePath, `${skillId}.versions.json`);
  }

  private saveHistory(skillId: string, history: SkillVersionHistory): void {
    writeFileSafe(this.historyPath(skillId), JSON.stringify(history, null, 2));
  }
}
