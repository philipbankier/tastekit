import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_EXTENSIONS = ['x-tastekit-composition', 'x-tastekit-metacognition'];
const REQUIRED_RUNTIME_MARKDOWN = ['CLAUDE.md', 'SOUL.md', 'AGENTS.md'];
const EXPECTED_EXPORT_ARTIFACTS = [
  ['claude-code', 'CLAUDE.md'],
  ['openclaw', 'SOUL.md'],
  ['openclaw', 'AGENTS.md'],
  ['openclaw', 'openclaw.config.json'],
  ['manus', 'README.md'],
  ['agents-md', 'AGENTS.md'],
  ['agent-file', 'agent.af'],
];

export function countManagedRegions(markdown) {
  return (markdown.match(/BEGIN TASTEKIT MANAGED REGION/g) ?? []).length;
}

export function assertSingleManagedRegion(markdown, path = 'markdown') {
  const beginCount = (markdown.match(/BEGIN TASTEKIT MANAGED REGION/g) ?? []).length;
  const endCount = (markdown.match(/END TASTEKIT MANAGED REGION/g) ?? []).length;
  if (beginCount !== 1 || endCount !== 1) {
    throw new Error(`${path} has malformed TasteKit managed region markers (begin=${beginCount}, end=${endCount})`);
  }
}

export function assertManagedRegionFiles(paths) {
  const results = [];
  for (const path of paths) {
    assertFile(path);
    const markdown = readFileSync(path, 'utf-8');
    assertSingleManagedRegion(markdown, path);
    results.push({ path, regionCount: countManagedRegions(markdown) });
  }
  return results;
}

export function detectRuntimeMarkdownLeaks(markdown, { transcriptSamples = [], hiddenTerms = [] } = {}) {
  const leaks = [];
  const normalizedMarkdown = markdown.toLowerCase();
  for (const term of hiddenTerms) {
    if (term && normalizedMarkdown.includes(String(term).toLowerCase())) {
      leaks.push({ type: 'hidden_term', value: term });
    }
  }
  for (const sample of transcriptSamples) {
    const trimmed = typeof sample === 'string' ? sample.trim() : '';
    if (trimmed.length >= 40 && markdown.includes(trimmed)) {
      leaks.push({ type: 'transcript_sample', value: trimmed.slice(0, 120) });
    }
    const phrase = longestMatchingPhrase(markdown, trimmed);
    if (phrase) {
      leaks.push({ type: 'transcript_phrase', value: phrase.slice(0, 120) });
    }
  }
  return leaks;
}

function longestMatchingPhrase(markdown, sample) {
  const words = sample
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  if (words.length < 12) return '';
  for (let size = Math.min(18, words.length); size >= 12; size -= 1) {
    for (let start = 0; start <= words.length - size; start += 1) {
      const phrase = words.slice(start, start + size).join(' ');
      if (markdown.includes(phrase)) return phrase;
    }
  }
  return '';
}

export function assertExtensionPresence(constitution) {
  const extensions = constitution?.extensions;
  if (!extensions || typeof extensions !== 'object') {
    throw new Error('constitution.extensions is missing');
  }
  for (const key of REQUIRED_EXTENSIONS) {
    if (!extensions[key] || typeof extensions[key] !== 'object') {
      throw new Error(`constitution.extensions["${key}"] is missing`);
    }
  }
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function assertFile(path) {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  return path;
}

export function runtimeMarkdownPaths(workspaceDir) {
  return ['CLAUDE.md', 'SOUL.md', 'AGENTS.md', 'taste.md']
    .map(name => join(workspaceDir, name))
    .filter(path => existsSync(path));
}

export function assertRuntimeMarkdown(workspaceDir, transcriptSamples = []) {
  const hiddenTerms = ['<!--COVERAGE', 'COVERAGE-->', 'policy reason codes', 'dimension_updates', 'Facts:', 'facts:'];
  const results = [];
  for (const name of REQUIRED_RUNTIME_MARKDOWN) {
    assertFile(join(workspaceDir, name));
  }
  for (const path of runtimeMarkdownPaths(workspaceDir)) {
    const markdown = readFileSync(path, 'utf-8');
    assertSingleManagedRegion(markdown, path);
    const regionCount = countManagedRegions(markdown);
    const leaks = detectRuntimeMarkdownLeaks(markdown, { transcriptSamples, hiddenTerms });
    if (leaks.length > 0) throw new Error(`${path} leaked hidden/runtime content: ${JSON.stringify(leaks)}`);
    results.push({ path, regionCount });
  }
  return results;
}

export function expectedExportArtifactPaths(exportRoot) {
  return EXPECTED_EXPORT_ARTIFACTS.map(([target, filename]) => join(exportRoot, target, filename));
}

export function assertExpectedExportArtifacts(exportRoot) {
  const paths = expectedExportArtifactPaths(exportRoot);
  for (const path of paths) assertFile(path);
  return paths;
}
