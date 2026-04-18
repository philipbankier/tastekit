import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

export type Layout = 'v1' | 'v2';

const CONSTITUTION = {
  schema_version: 'constitution.v1',
  generator_version: '0.5.0',
  principles: [
    {
      id: 'p1',
      statement: 'Be precise and practical',
      priority: 1,
      applies_to: ['*'],
    },
  ],
  tone: {
    voice_keywords: ['clear', 'direct'],
    forbidden_phrases: ['synergy'],
    formatting_rules: ['use lists when helpful'],
  },
  tradeoffs: {
    accuracy_vs_speed: 0.8,
    cost_sensitivity: 0.5,
    autonomy_level: 'medium',
  },
  evidence_policy: {
    require_citations_for: ['facts'],
    uncertainty_language_rules: ['say likely when confidence is low'],
  },
  taboos: {
    never_do: ['Never fabricate citations'],
    must_escalate: ['Production deletions'],
  },
};

const GUARDRAILS_YAML = `schema_version: guardrails.v1
hard_boundaries:
  - boundary_id: no-secrets
    rule: Never expose secrets
approvals:
  - rule_id: destructive-tools
    when: "tool_ref =~ /delete/"
    action: require_approval
    channel: cli
rate_limits: []
`;

const MEMORY_YAML = `schema_version: memory.v1
runtime_target: generic
retention_policy:
  ttl_days: 30
  prune_strategy: least_salient
stores:
  - store_id: default
    type: runtime_managed
    config: {}
write_policy:
  update_mode: consolidate
  consolidation_schedule: "0 0 2 * * *"
  pii_handling:
    detect: true
    redact: false
    store_separately: true
  revisit_triggers:
    - user_correction
    - repeated_failure
`;

const SKILLS_MANIFEST_YAML = `schema_version: skills_manifest.v1
skills:
  - skill_id: demo-skill
    name: Demo Skill
    description: Demonstrates adapter export behavior
    risk_level: low
    tags: [demo]
    compatible_runtimes: [claude-code, manus, openclaw]
`;

const PLAYBOOK_YAML = `schema_version: playbook.v1
playbook_id: demo-playbook
name: Demo Playbook
steps:
  - id: step1
    instruction: Do the thing
`;

export function createProfileFixture(layout: Layout): { rootDir: string; profilePath: string } {
  const rootDir = mkdtempSync(join(tmpdir(), `tastekit-adapter-${layout}-`));
  const profilePath = join(rootDir, '.tastekit');
  mkdirSync(profilePath, { recursive: true });

  writeFileSync(join(profilePath, 'tastekit.yaml'), 'version: "1.0.0"\ndomain_id: development-agent\n', 'utf-8');
  mkdirSync(join(profilePath, 'skills', 'demo-skill'), { recursive: true });
  mkdirSync(join(profilePath, 'playbooks'), { recursive: true });

  writeFileSync(join(profilePath, 'constitution.v1.json'), JSON.stringify(CONSTITUTION, null, 2), 'utf-8');
  writeFileSync(join(profilePath, 'guardrails.v1.yaml'), GUARDRAILS_YAML, 'utf-8');
  writeFileSync(join(profilePath, 'memory.v1.yaml'), MEMORY_YAML, 'utf-8');
  writeFileSync(join(profilePath, 'skills', 'manifest.v1.yaml'), SKILLS_MANIFEST_YAML, 'utf-8');
  writeFileSync(join(profilePath, 'skills', 'demo-skill', 'SKILL.md'), '# Demo Skill\n', 'utf-8');
  writeFileSync(join(profilePath, 'playbooks', 'demo-playbook.v1.yaml'), PLAYBOOK_YAML, 'utf-8');

  return { rootDir, profilePath };
}

export function cleanupFixture(rootDir: string): void {
  rmSync(rootDir, { recursive: true, force: true });
}

const require = createRequire(import.meta.url);
const YAML = require('yaml') as { parse(content: string): unknown };
const __dirname = dirname(fileURLToPath(import.meta.url));

export function fixturePath(...parts: string[]): string {
  return join(__dirname, '../../../fixtures', ...parts);
}

export function createTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

export function parseYaml<T>(content: string): T {
  return YAML.parse(content) as T;
}

export function listRelativeFiles(rootDir: string): string[] {
  const files: string[] = [];

  const walk = (currentDir: string) => {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile()) {
        files.push(relative(rootDir, fullPath));
      }
    }
  };

  walk(rootDir);
  return files.sort();
}

export function validateMarkdown(markdown: string): void {
  const fenceCount = (markdown.match(/```/g) ?? []).length;
  if (fenceCount % 2 !== 0) {
    throw new Error('Markdown contains an unmatched code fence');
  }

  for (const line of markdown.split('\n')) {
    if (/^#{1,6}(?!\s|#|$)/.test(line)) {
      throw new Error(`Markdown heading missing space: ${line}`);
    }
  }
}
