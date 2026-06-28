import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { parse as parseYaml } from 'yaml';
import type { RubricDimension } from '../interview/rubric.js';
import { UNIVERSAL_DIMENSIONS } from '../interview/universal-rubric.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');
const skillRoot = join(repoRoot, 'skills/tastekit');
const legacySkillRoot = join(repoRoot, 'skill');
const skillMdPath = join(skillRoot, 'SKILL.md');
const syncScriptPath = join(repoRoot, 'scripts/skill-bundle/sync.mjs');

// Source-complete generated rubric references are intentionally larger than
// the prior hand-authored summaries while staying small for a native skill.
const BUNDLE_SIZE_CAP_BYTES = 96 * 1024;

const productionDomainRubricFiles = [
  {
    domainId: 'development-agent',
    relativePath: 'references/rubrics/development-agent.md',
    sourcePath: 'packages/core/domains/development-agent/rubric.ts',
  },
  {
    domainId: 'general-agent',
    relativePath: 'references/rubrics/general-agent.md',
    sourcePath: 'packages/core/domains/general-agent/rubric.ts',
  },
  {
    domainId: 'content-agent',
    relativePath: 'references/rubrics/content-agent.md',
    sourcePath: 'packages/core/domains/content-agent/rubric.ts',
  },
  {
    domainId: 'research-agent',
    relativePath: 'references/rubrics/research-agent.md',
    sourcePath: 'packages/core/domains/research-agent/rubric.ts',
  },
  {
    domainId: 'sales-agent',
    relativePath: 'references/rubrics/sales-agent.md',
    sourcePath: 'packages/core/domains/sales-agent/rubric.ts',
  },
  {
    domainId: 'support-agent',
    relativePath: 'references/rubrics/support-agent.md',
    sourcePath: 'packages/core/domains/support-agent/rubric.ts',
  },
];

const rubricFiles = [
  {
    relativePath: 'references/rubrics/universal.md',
    sourcePath: 'packages/core/interview/universal-rubric.ts',
    dimensions: UNIVERSAL_DIMENSIONS,
  },
  ...productionDomainRubricFiles,
];

const generatedRelativePaths = [
  'assets/schemas/constitution.schema.json',
  ...rubricFiles.map(file => file.relativePath),
];

interface GeneratedFile {
  relativePath: string;
  content: string;
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  return parseYaml(match[1]) ?? {};
}

function allowedTools(frontmatter: Record<string, unknown>): string[] {
  const value = frontmatter['allowed-tools'];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value.split(',').map(tool => tool.trim()).filter(Boolean);
  }
  return [];
}

function referencedBundlePaths(content: string): string[] {
  const refs = new Set<string>();
  for (const match of content.matchAll(/\b((?:references|assets|scripts)\/[A-Za-z0-9._/-]+)/g)) {
    refs.add(match[1].replace(/[),.;:]+$/, ''));
  }
  return [...refs];
}

function generatedBundleContents(): Record<string, string> {
  return Object.fromEntries(
    generatedRelativePaths
      .filter(path => existsSync(join(skillRoot, path)))
      .map(path => [path, readFileSync(join(skillRoot, path), 'utf-8')]),
  );
}

function generatedFilesFromSync(): GeneratedFile[] {
  expectAllRubricSourcesExist();
  const output = execFileSync('node', [syncScriptPath, '--print-json'], {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(output) as GeneratedFile[];
}

function missingRubricSources(): string[] {
  return rubricFiles
    .map(file => file.sourcePath)
    .filter(path => !existsSync(join(repoRoot, path)));
}

function expectAllRubricSourcesExist() {
  const missing = missingRubricSources();
  if (missing.length > 0) {
    throw new Error([
      'Missing source rubrics for generated skill references:',
      ...missing.map(path => `- ${path}`),
      'After Worker A adds the source rubrics, run `node scripts/skill-bundle/sync.mjs` to regenerate `skills/tastekit/references/rubrics/*.md`.',
    ].join('\n'));
  }
}

function renderRubricReference(input: {
  title: string;
  sourcePath: string;
  dimensions: RubricDimension[];
}): string {
  return execFileSync('node', [syncScriptPath, '--render-json'], {
    cwd: repoRoot,
    encoding: 'utf-8',
    input: JSON.stringify(input),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function expectDimensionFields(content: string, dimension: RubricDimension) {
  expect(content).toContain(`- id: \`${dimension.id}\``);
  expect(content).toContain(`- name: ${dimension.name}`);
  expect(content).toContain(`- depth_tiers: ${dimension.depth_tiers.join(', ')}`);
  expect(content).toContain(`- priority: ${dimension.priority}`);
  expect(content).toContain(`- maps_to: ${dimension.maps_to.join(', ')}`);
  if (dimension.question_budget) {
    expect(content).toContain(`- question_budget: min ${dimension.question_budget.min}, max ${dimension.question_budget.max}`);
  } else {
    expect(content).toContain('- question_budget: unspecified');
  }
  expect(content).toContain(`- description: ${dimension.description}`);

  for (const hint of dimension.exploration_hints) {
    expect(content).toContain(`- ${hint}`);
  }
  for (const criterion of dimension.coverage_criteria) {
    expect(content).toContain(`- ${criterion}`);
  }

  if (dimension.sub_areas) {
    expect(content).toContain('### sub_areas');
    for (const subArea of dimension.sub_areas) {
      expect(content).toContain(`- ${subArea}`);
    }
  }

  if (dimension.cascade_to) {
    expect(content).toContain('### cascade_to');
    for (const cascade of dimension.cascade_to) {
      expect(content).toContain(`- ${cascade.dimension_id} (weight: ${cascade.weight}`);
      if (cascade.condition) {
        expect(content).toContain(`condition: ${cascade.condition}`);
      }
    }
  }
}

describe('TasteKit native skill bundle', () => {
  it('expects universal plus all six first-class domain rubric references', () => {
    expect(productionDomainRubricFiles.map(file => file.domainId)).toEqual([
      'development-agent',
      'general-agent',
      'content-agent',
      'research-agent',
      'sales-agent',
      'support-agent',
    ]);
    expect(rubricFiles.map(file => file.relativePath)).toEqual([
      'references/rubrics/universal.md',
      'references/rubrics/development-agent.md',
      'references/rubrics/general-agent.md',
      'references/rubrics/content-agent.md',
      'references/rubrics/research-agent.md',
      'references/rubrics/sales-agent.md',
      'references/rubrics/support-agent.md',
    ]);
  });

  it('has TS source rubrics for every generated rubric reference', () => {
    expect(missingRubricSources()).toEqual([]);
  });

  it('has a compact, valid SKILL.md router', () => {
    expect(existsSync(join(legacySkillRoot, 'SKILL.md'))).toBe(false);
    expect(existsSync(skillMdPath)).toBe(true);
    const content = readFileSync(skillMdPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    const tools = allowedTools(frontmatter);

    expect(frontmatter.name).toBe('tastekit');
    expect(String(frontmatter.description)).toContain('Use when');
    expect(tools).toEqual(expect.arrayContaining(['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash']));
    expect(tools.filter(tool => tool.includes('(') || tool.includes(':*'))).toEqual([]);
    expect(Buffer.byteLength(content, 'utf-8')).toBeLessThanOrEqual(5 * 1024);
    expect(content).toContain('Guided');
    expect(content).toContain('Full Taste Composition');
    expect(content).toContain('.tastekit/session.json');
    expect(content).not.toContain('.tastekit/interview-state.json');
    expect(content).toContain('references/rubrics/universal.md');
    for (const rubricFile of productionDomainRubricFiles) {
      expect(content).toContain(rubricFile.domainId);
      expect(content).toContain(rubricFile.relativePath);
    }
  });

  it('keeps the total runtime bundle under the release ceiling', () => {
    expect(existsSync(skillRoot)).toBe(true);
    const totalBytes = walkFiles(skillRoot)
      .filter(path => !relative(skillRoot, path).startsWith('scripts/release/'))
      .reduce((sum, path) => sum + statSync(path).size, 0);

    expect(totalBytes).toBeLessThanOrEqual(BUNDLE_SIZE_CAP_BYTES);
  });

  it('references only files that exist in the bundle', () => {
    const content = readFileSync(skillMdPath, 'utf-8');
    const missing = referencedBundlePaths(content)
      .filter(path => !existsSync(join(skillRoot, path)));

    expect(missing).toEqual([]);
  });

  it('routes metacognitive runtime guidance through all markdown templates', () => {
    for (const template of [
      'assets/templates/claude-code.md',
      'assets/templates/hermes-soul.md',
      'assets/templates/hermes-agents.md',
      'assets/templates/taste.md',
    ]) {
      expect(readFileSync(join(skillRoot, template), 'utf-8'), template).toContain('{{metacognition}}');
    }

    const runtimeOutput = readFileSync(join(skillRoot, 'references/runtime-output.md'), 'utf-8');
    expect(runtimeOutput).toContain('x-tastekit-metacognition');
    expect(runtimeOutput).toContain('Do not include raw transcript text');
  });

  it('keeps generated bundle files in sync without mutating in check mode', () => {
    expectAllRubricSourcesExist();
    const before = generatedBundleContents();
    execFileSync('node', [syncScriptPath, '--check'], {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    const after = generatedBundleContents();

    expect(after).toEqual(before);
  });

  it('bundles a byte-identical constitution schema copy', () => {
    const canonical = readFileSync(join(repoRoot, 'packages/core/schemas/json/constitution.schema.json'), 'utf-8');
    const bundled = readFileSync(join(skillRoot, 'assets/schemas/constitution.schema.json'), 'utf-8');

    expect(bundled).toBe(canonical);
  });

  it('bundles parseable Draft 2020-12 JSON schemas', () => {
    const ajv = new Ajv2020({ strict: false });
    const schemaDir = join(skillRoot, 'assets/schemas');
    const failures = readdirSync(schemaDir)
      .filter(name => name.endsWith('.json'))
      .flatMap(name => {
        try {
          const schema = JSON.parse(readFileSync(join(schemaDir, name), 'utf-8'));
          ajv.compile(schema);
          return [];
        } catch (error) {
          return [`${name}: ${error instanceof Error ? error.message : String(error)}`];
        }
      });

    expect(failures).toEqual([]);
  });

  it('stores generated rubric references exactly as rendered from source rubrics', () => {
    const generated = generatedFilesFromSync();

    for (const rubricFile of rubricFiles) {
      const generatedFile = generated.find(file => file.relativePath === rubricFile.relativePath);
      const bundled = readFileSync(join(skillRoot, rubricFile.relativePath), 'utf-8');

      expect(generatedFile?.content).toBe(bundled);
      expect(bundled).toContain(`Source: \`${rubricFile.sourcePath}\``);
      if ('dimensions' in rubricFile) {
        for (const dimension of rubricFile.dimensions) {
          expectDimensionFields(bundled, dimension);
        }
      }
    }
  });

  it('renders optional rubric sub-areas and cascades when present', () => {
    const rendered = renderRubricReference({
      title: 'Fixture Rubric',
      sourcePath: 'fixtures/rubric.ts',
      dimensions: [
        {
          id: 'fixture_dimension',
          name: 'Fixture Dimension',
          description: 'Fixture description.',
          maps_to: ['principles'],
          depth_tiers: ['operator'],
          priority: 'important',
          question_budget: { min: 1, max: 2 },
          exploration_hints: ['Probe the fixture.'],
          coverage_criteria: ['Fixture coverage is clear.'],
          sub_areas: ['Nested area'],
          cascade_to: [
            { dimension_id: 'downstream_dimension', weight: 0.4, condition: 'Only when explicit.' },
          ],
        },
      ],
    });

    expect(rendered).toContain('### sub_areas');
    expect(rendered).toContain('- Nested area');
    expect(rendered).toContain('### cascade_to');
    expect(rendered).toContain('- downstream_dimension (weight: 0.4; condition: Only when explicit.)');
  });
});
