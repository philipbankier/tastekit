import { describe, expect, it, beforeAll } from 'vitest';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, statSync } from 'fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { ConstitutionV1Schema } from '../constitution.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '../json/constitution.schema.json');

let validateJsonSchema: (data: unknown) => boolean;

beforeAll(() => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  validateJsonSchema = ajv.compile(schema);
});

function validateZod(data: unknown): boolean {
  return ConstitutionV1Schema.safeParse(data).success;
}

function bothAgree(data: unknown): { zod: boolean; jsonSchema: boolean } {
  return { zod: validateZod(data), jsonSchema: validateJsonSchema(data) };
}

function minimalValid() {
  return {
    schema_version: 'constitution.v1',
    generated_at: '2026-05-01T00:00:00.000Z',
    generator_version: '1.0.0',
    user_scope: 'single_user',
    principles: [
      {
        id: 'clarity',
        priority: 1,
        statement: 'Prioritize clarity',
        applies_to: ['*'],
      },
    ],
    tone: { voice_keywords: [], forbidden_phrases: [], formatting_rules: [] },
    tradeoffs: { accuracy_vs_speed: 0.5, cost_sensitivity: 0.5, autonomy_level: 0.5 },
    evidence_policy: { require_citations_for: [], uncertainty_language_rules: [] },
    taboos: { never_do: [], must_escalate: [] },
  };
}

describe('constitution.schema.json — Zod ↔ JSON Schema parity', () => {
  it('minimal valid artifact is accepted by both', () => {
    const result = bothAgree(minimalValid());
    expect(result.zod).toBe(true);
    expect(result.jsonSchema).toBe(true);
  });

  it('rejects timezone offset in generated_at (both — UTC-only)', () => {
    const data = { ...minimalValid(), generated_at: '2026-05-01T12:00:00.000+02:00' };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects bare-date generated_at (both)', () => {
    const data = { ...minimalValid(), generated_at: '2026-05-01' };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects garbage generated_at (both)', () => {
    const data = { ...minimalValid(), generated_at: 'not-a-date' };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects minute-precision generated_at (both — must have full seconds + ms)', () => {
    const data = { ...minimalValid(), generated_at: '2026-05-01T12:00Z' };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects second-precision without milliseconds (both — ms required for canonical .toISOString())', () => {
    const data = { ...minimalValid(), generated_at: '2026-05-01T12:00:00Z' };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('accepts canonical .toISOString() output (both)', () => {
    const data = { ...minimalValid(), generated_at: '2026-05-01T12:00:00.123Z' };
    expect(bothAgree(data)).toEqual({ zod: true, jsonSchema: true });
  });

  it('accepts new Date().toISOString() round-trip (both)', () => {
    const data = { ...minimalValid(), generated_at: new Date('2026-05-01T12:00:00.000Z').toISOString() };
    expect(bothAgree(data)).toEqual({ zod: true, jsonSchema: true });
  });

  it('rejects wrong schema_version (both)', () => {
    const data = { ...minimalValid(), schema_version: 'constitution.v2' };
    const result = bothAgree(data);
    expect(result.zod).toBe(false);
    expect(result.jsonSchema).toBe(false);
  });

  it('rejects non-semver generator_version (both)', () => {
    const data = { ...minimalValid(), generator_version: 'not-semver' };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects leading-zero version components like 1.0.01 (both — strict semver)', () => {
    expect(bothAgree({ ...minimalValid(), generator_version: '1.0.01' })).toEqual({ zod: false, jsonSchema: false });
    expect(bothAgree({ ...minimalValid(), generator_version: '01.0.0' })).toEqual({ zod: false, jsonSchema: false });
  });

  it('accepts semver prerelease and build metadata', () => {
    expect(bothAgree({ ...minimalValid(), generator_version: '1.0.0-alpha.1' })).toEqual({ zod: true, jsonSchema: true });
    expect(bothAgree({ ...minimalValid(), generator_version: '1.0.0+build.sha.abc123' })).toEqual({ zod: true, jsonSchema: true });
    expect(bothAgree({ ...minimalValid(), generator_version: '1.0.0-rc.2+build.42' })).toEqual({ zod: true, jsonSchema: true });
  });

  it('rejects empty principles array (both)', () => {
    const data = { ...minimalValid(), principles: [] };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects principle with missing required statement (both)', () => {
    const data = minimalValid();
    delete (data.principles[0] as Record<string, unknown>).statement;
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects tradeoff > 1 (both)', () => {
    const data = minimalValid();
    data.tradeoffs.autonomy_level = 1.5;
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects extra top-level field outside extensions (both — strict)', () => {
    const data = { ...minimalValid(), unknown_field: 'should fail' };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('rejects extra field inside Tone (both — strict)', () => {
    const data = minimalValid();
    (data.tone as Record<string, unknown>).extra = 'no';
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('accepts unknown keys inside extensions (forward-compat slot)', () => {
    const data = {
      ...minimalValid(),
      extensions: {
        memory: { tier: 'working', retention_days: 30 },
        'x-hermes-priority': 7,
        future_field_we_havent_invented_yet: { anything: ['goes', 'here'] },
      },
    };
    const result = bothAgree(data);
    expect(result.zod).toBe(true);
    expect(result.jsonSchema).toBe(true);
  });

  it('accepts unknown keys inside trace_map (provenance is open)', () => {
    const data = {
      ...minimalValid(),
      trace_map: { _session_id: 'abc', principle_clarity: { source_dimension: 'communication' } },
    };
    expect(bothAgree(data)).toEqual({ zod: true, jsonSchema: true });
  });

  it('rejects 21-principle artifact (cap is 20)', () => {
    const principles = Array.from({ length: 21 }, (_, i) => ({
      id: `p_${i}`,
      priority: i + 1,
      statement: `Principle ${i}`,
      applies_to: ['*'],
    }));
    const data = { ...minimalValid(), principles };
    expect(bothAgree(data)).toEqual({ zod: false, jsonSchema: false });
  });

  it('accepts the canonical fixture', () => {
    const fixturePath = join(__dirname, '../../../../fixtures/contracts/v1/v2-canonical/.tastekit/self/constitution.v1.json');
    const data = JSON.parse(readFileSync(fixturePath, 'utf-8'));
    expect(bothAgree(data)).toEqual({ zod: true, jsonSchema: true });
  });

  it('accepts the legacy fixture', () => {
    const fixturePath = join(__dirname, '../../../../fixtures/contracts/v1/v1-legacy/.tastekit/artifacts/constitution.v1.json');
    const data = JSON.parse(readFileSync(fixturePath, 'utf-8'));
    expect(bothAgree(data)).toEqual({ zod: true, jsonSchema: true });
  });

  it('accepts the locked filled example artifact', () => {
    const examplePath = join(__dirname, '../../../../examples/constitutions/development-agent.example.json');
    const data = JSON.parse(readFileSync(examplePath, 'utf-8'));
    expect(bothAgree(data)).toEqual({ zod: true, jsonSchema: true });
  });

  it('every constitution.v1.json in the repo validates (lock catches drift in fixtures + examples)', () => {
    const repoRoot = join(__dirname, '../../../..');
    const matches = findConstitutionFiles(repoRoot);
    expect(matches.length).toBeGreaterThan(5);

    const failures: Array<{ path: string; zodErrors: string }> = [];
    for (const path of matches) {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      const zodResult = ConstitutionV1Schema.safeParse(data);
      const jsonSchemaResult = validateJsonSchema(data);
      if (!zodResult.success || !jsonSchemaResult) {
        const zodErrors = zodResult.success
          ? '(zod ok)'
          : zodResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        failures.push({ path: relative(repoRoot, path), zodErrors });
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('constitution.v1 — Zod-only refinements (invariants JSON Schema cannot express)', () => {
  it('rejects calendar-impossible dates that pass the regex', () => {
    expect(validateZod({ ...minimalValid(), generated_at: '2026-99-99T12:00:00.000Z' })).toBe(false);
    expect(validateZod({ ...minimalValid(), generated_at: '2026-02-30T12:00:00.000Z' })).toBe(false);
    expect(validateZod({ ...minimalValid(), generated_at: '2026-13-01T12:00:00.000Z' })).toBe(false);
  });

  it('rejects timestamps that pass the regex but do not round-trip through Date', () => {
    expect(validateZod({ ...minimalValid(), generated_at: '2026-05-01T25:00:00.000Z' })).toBe(false);
  });


  it('rejects duplicate priorities', () => {
    const data = minimalValid();
    data.principles.push({
      id: 'second',
      priority: 1,
      statement: 'Second principle with same priority',
      applies_to: ['*'],
    });
    expect(validateZod(data)).toBe(false);
  });

  it('rejects gapped priorities (1, 3 instead of 1, 2)', () => {
    const data = minimalValid();
    data.principles[0].priority = 1;
    data.principles.push({
      id: 'second',
      priority: 3,
      statement: 'Skipped priority 2',
      applies_to: ['*'],
    });
    expect(validateZod(data)).toBe(false);
  });

  it('rejects duplicate principle ids', () => {
    const data = minimalValid();
    data.principles.push({
      id: data.principles[0].id,
      priority: 2,
      statement: 'Another with same id',
      applies_to: ['*'],
    });
    expect(validateZod(data)).toBe(false);
  });

  it('accepts unique 1..N priorities and unique ids', () => {
    const data = minimalValid();
    data.principles.push({
      id: 'second',
      priority: 2,
      statement: 'Distinct second principle',
      applies_to: ['*'],
    });
    expect(validateZod(data)).toBe(true);
  });
});

function findConstitutionFiles(root: string): string[] {
  const out: string[] = [];
  walk(root, out);
  return out;
}

function walk(dir: string, out: string[]) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      walk(full, out);
    } else if (entry === 'constitution.v1.json') {
      out.push(full);
    }
  }
}
