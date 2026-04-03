import { describe, expect, it } from 'vitest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import YAML from 'yaml';
import {
  validateBindings,
  validateConstitution,
  validateGuardrails,
  validateMemory,
  validatePlaybook,
  validateSkillsManifest,
  validateTraceEvent,
  validateTrust,
} from '../validators.js';
import { TraceReader } from '../../tracing/reader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = join(__dirname, '../../../../fixtures/contracts/v1');
const CANONICAL_ROOT = join(CONTRACTS_ROOT, 'v2-canonical', '.tastekit');
const LEGACY_ROOT = join(CONTRACTS_ROOT, 'v1-legacy', '.tastekit');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function readYaml(path: string): unknown {
  return YAML.parse(readFileSync(path, 'utf-8'));
}

describe('contract fixture conformance', () => {
  it('validates canonical v2 artifacts and cross-cutting contracts', () => {
    const constitution = readJson(join(CANONICAL_ROOT, 'self', 'constitution.v1.json'));
    const guardrails = readYaml(join(CANONICAL_ROOT, 'self', 'guardrails.v1.yaml'));
    const memory = readYaml(join(CANONICAL_ROOT, 'self', 'memory.v1.yaml'));
    const manifest = readYaml(join(CANONICAL_ROOT, 'knowledge', 'skills', 'manifest.v1.yaml'));
    const playbook = readYaml(join(CANONICAL_ROOT, 'knowledge', 'playbooks', 'general-task.v1.yaml'));
    const trust = readJson(join(CANONICAL_ROOT, 'trust.v1.json'));
    const bindings = readJson(join(CANONICAL_ROOT, 'bindings.v1.json'));

    expect(validateConstitution(constitution).success).toBe(true);
    expect(validateGuardrails(guardrails).success).toBe(true);
    expect(validateMemory(memory).success).toBe(true);
    expect(validateSkillsManifest(manifest).success).toBe(true);
    expect(validatePlaybook(playbook).success).toBe(true);
    expect(validateTrust(trust).success).toBe(true);
    expect(validateBindings(bindings).success).toBe(true);
  });

  it('validates canonical trace events with strict schema checks', () => {
    const reader = new TraceReader();
    const tracePath = join(CANONICAL_ROOT, 'ops', 'traces', 'run-001.trace.v1.jsonl');
    const events = reader.readTrace(tracePath);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      const validation = validateTraceEvent(event);
      expect(validation.success).toBe(true);
    }
  });

  it('keeps legacy v1 fixture contracts readable', () => {
    const constitution = readJson(join(LEGACY_ROOT, 'artifacts', 'constitution.v1.json'));
    const guardrails = readYaml(join(LEGACY_ROOT, 'artifacts', 'guardrails.v1.yaml'));
    const memory = readYaml(join(LEGACY_ROOT, 'artifacts', 'memory.v1.yaml'));
    const trust = readJson(join(LEGACY_ROOT, 'artifacts', 'trust.v1.json'));
    const bindings = readJson(join(LEGACY_ROOT, 'artifacts', 'bindings.v1.json'));

    expect(validateConstitution(constitution).success).toBe(true);
    expect(validateGuardrails(guardrails).success).toBe(true);
    expect(validateMemory(memory).success).toBe(true);
    expect(validateTrust(trust).success).toBe(true);
    expect(validateBindings(bindings).success).toBe(true);
  });

  it('rejects future/unknown trace event types under strict schema conformance', () => {
    const reader = new TraceReader();
    const tracePath = join(CONTRACTS_ROOT, 'traces', 'unknown-fields-and-events.trace.v1.jsonl');
    const events = reader.readTrace(tracePath);

    const strictResults = events.map((event) => validateTraceEvent(event).success);
    expect(strictResults).toContain(false);
    expect(strictResults.filter(Boolean).length).toBeGreaterThan(0);
  });
});
