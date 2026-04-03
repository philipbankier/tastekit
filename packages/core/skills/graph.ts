import { SkillsManifestV1, SkillMetadata } from '../schemas/skills.js';

/**
 * Skill Graph Analyzer
 *
 * Analyzes relationships between skills: pipelines, orphans,
 * cycles, and missing references.
 */

export interface SkillGraphAnalysis {
  /** Total number of skills */
  node_count: number;
  /** Total number of relationships (feeds_into + prerequisites) */
  edge_count: number;
  /** Graph density: edges / (nodes * (nodes - 1)) */
  density: number;
  /** Skills with no relationships */
  orphans: string[];
  /** Skills with 3+ connections */
  hubs: string[];
  /** Detected linear chains (A → B → C) */
  pipelines: string[][];
  /** Circular dependencies (should be empty) */
  cycles: string[][];
  /** References to non-existent skills */
  missing_refs: Array<{
    skill_id: string;
    missing_ref: string;
    relationship: string;
  }>;
}

/**
 * Analyze the skill graph from a manifest.
 */
export function analyzeSkillGraph(manifest: SkillsManifestV1): SkillGraphAnalysis {
  const skills = manifest.skills;
  const skillIds = new Set(skills.map(s => s.skill_id));
  const nodeCount = skills.length;

  // Build adjacency lists
  const outEdges = new Map<string, Set<string>>(); // skill → skills it feeds into
  const inEdges = new Map<string, Set<string>>();  // skill → skills that feed into it
  const allConnections = new Map<string, number>(); // skill → total connection count
  const missingRefs: SkillGraphAnalysis['missing_refs'] = [];
  let edgeCount = 0;

  for (const skill of skills) {
    if (!outEdges.has(skill.skill_id)) outEdges.set(skill.skill_id, new Set());
    if (!inEdges.has(skill.skill_id)) inEdges.set(skill.skill_id, new Set());
    if (!allConnections.has(skill.skill_id)) allConnections.set(skill.skill_id, 0);

    // Process feeds_into
    for (const target of skill.feeds_into ?? []) {
      if (!skillIds.has(target)) {
        missingRefs.push({ skill_id: skill.skill_id, missing_ref: target, relationship: 'feeds_into' });
        continue;
      }
      outEdges.get(skill.skill_id)!.add(target);
      if (!inEdges.has(target)) inEdges.set(target, new Set());
      inEdges.get(target)!.add(skill.skill_id);
      edgeCount++;
      allConnections.set(skill.skill_id, (allConnections.get(skill.skill_id) ?? 0) + 1);
      allConnections.set(target, (allConnections.get(target) ?? 0) + 1);
    }

    // Process prerequisites
    for (const prereq of skill.prerequisites ?? []) {
      if (!skillIds.has(prereq)) {
        missingRefs.push({ skill_id: skill.skill_id, missing_ref: prereq, relationship: 'prerequisites' });
        continue;
      }
      // prerequisites is the reverse of feeds_into
      if (!outEdges.has(prereq)) outEdges.set(prereq, new Set());
      outEdges.get(prereq)!.add(skill.skill_id);
      inEdges.get(skill.skill_id)!.add(prereq);
      edgeCount++;
      allConnections.set(skill.skill_id, (allConnections.get(skill.skill_id) ?? 0) + 1);
      allConnections.set(prereq, (allConnections.get(prereq) ?? 0) + 1);
    }

    // Process alternatives (bidirectional, but count once)
    for (const alt of skill.alternatives ?? []) {
      if (!skillIds.has(alt)) {
        missingRefs.push({ skill_id: skill.skill_id, missing_ref: alt, relationship: 'alternatives' });
      }
    }
  }

  // Deduplicate edges (feeds_into and prerequisites may create duplicates)
  edgeCount = 0;
  const seenEdges = new Set<string>();
  for (const [source, targets] of outEdges) {
    for (const target of targets) {
      const key = `${source}→${target}`;
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        edgeCount++;
      }
    }
  }

  // Calculate density
  const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0;

  // Find orphans (no connections at all)
  const orphans = skills
    .filter(s => (allConnections.get(s.skill_id) ?? 0) === 0)
    .map(s => s.skill_id);

  // Find hubs (3+ connections)
  const hubs = [...allConnections.entries()]
    .filter(([, count]) => count >= 3)
    .map(([id]) => id);

  // Detect pipelines (linear chains)
  const pipelines = detectPipelines(skills, outEdges, inEdges);

  // Detect cycles
  const cycles = detectCycles(skills, outEdges);

  return {
    node_count: nodeCount,
    edge_count: edgeCount,
    density,
    orphans,
    hubs,
    pipelines,
    cycles,
    missing_refs: missingRefs,
  };
}

/**
 * Get the pipeline path starting from a given skill.
 */
export function getPipelinePath(manifest: SkillsManifestV1, startSkill: string): string[] {
  const skillMap = new Map(manifest.skills.map(s => [s.skill_id, s]));
  const path = [startSkill];
  const visited = new Set([startSkill]);

  let current = startSkill;
  while (true) {
    const skill = skillMap.get(current);
    if (!skill?.feeds_into?.length) break;

    const next = skill.feeds_into[0]; // Follow first feed
    if (visited.has(next)) break; // Cycle
    if (!skillMap.has(next)) break; // Missing ref

    path.push(next);
    visited.add(next);
    current = next;
  }

  return path;
}

/**
 * Recommend next skills based on a completed skill.
 */
export function recommendNextSkill(manifest: SkillsManifestV1, completedSkill: string): string[] {
  const skill = manifest.skills.find(s => s.skill_id === completedSkill);
  if (!skill) return [];

  const nextSkills: string[] = [];

  // Direct feeds_into
  if (skill.feeds_into) {
    nextSkills.push(...skill.feeds_into);
  }

  // Skills that list this as a prerequisite
  for (const s of manifest.skills) {
    if (s.prerequisites?.includes(completedSkill) && !nextSkills.includes(s.skill_id)) {
      nextSkills.push(s.skill_id);
    }
  }

  return nextSkills;
}

/**
 * Detect linear pipeline chains in the graph.
 */
function detectPipelines(
  skills: SkillMetadata[],
  outEdges: Map<string, Set<string>>,
  inEdges: Map<string, Set<string>>,
): string[][] {
  const pipelines: string[][] = [];
  const visited = new Set<string>();

  // Find chain starts: skills with outgoing edges but no incoming edges
  for (const skill of skills) {
    const incoming = inEdges.get(skill.skill_id);
    const outgoing = outEdges.get(skill.skill_id);

    if ((!incoming || incoming.size === 0) && outgoing && outgoing.size > 0) {
      // This is a pipeline start
      const chain = followChain(skill.skill_id, outEdges, visited);
      if (chain.length >= 2) {
        pipelines.push(chain);
      }
    }
  }

  return pipelines;
}

function followChain(
  start: string,
  outEdges: Map<string, Set<string>>,
  visited: Set<string>,
): string[] {
  const chain: string[] = [start];
  visited.add(start);

  let current = start;
  while (true) {
    const targets = outEdges.get(current);
    if (!targets || targets.size === 0) break;

    // Follow the first unvisited target
    let next: string | null = null;
    for (const t of targets) {
      if (!visited.has(t)) {
        next = t;
        break;
      }
    }

    if (!next) break;

    chain.push(next);
    visited.add(next);
    current = next;
  }

  return chain;
}

/**
 * Detect cycles using DFS-based cycle detection.
 */
function detectCycles(
  skills: SkillMetadata[],
  outEdges: Map<string, Set<string>>,
): string[][] {
  const cycles: string[][] = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const skill of skills) {
    color.set(skill.skill_id, WHITE);
  }

  function dfs(node: string, path: string[]): void {
    color.set(node, GRAY);
    path.push(node);

    for (const neighbor of outEdges.get(node) ?? []) {
      if (color.get(neighbor) === GRAY) {
        // Found a cycle — extract it
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart));
        }
      } else if (color.get(neighbor) === WHITE) {
        dfs(neighbor, path);
      }
    }

    path.pop();
    color.set(node, BLACK);
  }

  for (const skill of skills) {
    if (color.get(skill.skill_id) === WHITE) {
      dfs(skill.skill_id, []);
    }
  }

  return cycles;
}
