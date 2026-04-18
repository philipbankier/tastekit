import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { GeneratorContext } from '@actrun_ai/tastekit-core/generators';
import type { MemoryV1, TraceEvent } from '@actrun_ai/tastekit-core';
import { ClaudeCodeAdapter } from '../claude-code/index.js';
import { OpenClawAdapter } from '../openclaw/index.js';
import { ManusAdapter } from '../manus/index.js';
import { AutopilotsAdapter } from '../autopilots/index.js';
import { cleanupFixture, createTempDir } from './helpers.js';

const memoryPolicy: MemoryV1 = {
  schema_version: 'memory.v1',
  runtime_target: 'generic',
  stores: [{ store_id: 'default', type: 'runtime_managed', config: {} }],
  write_policy: {
    salience_rules: [{ rule_id: 'prefs', pattern: 'preference', score: 0.9 }],
    pii_handling: { detect: true, redact: false, store_separately: true },
    update_mode: 'consolidate',
    consolidation_schedule: '0 0 * * *',
    revisit_triggers: ['user_correction'],
  },
  retention_policy: {
    ttl_days: 30,
    prune_strategy: 'least_salient',
  },
};

const workspace: GeneratorContext = {
  generator_version: '0.5.0',
  domain_id: 'development-agent',
  constitution: {
    schema_version: 'constitution.v1',
    generated_at: '2026-01-15T10:00:00.000Z',
    generator_version: '0.5.0',
    user_scope: 'single_user',
    principles: [
      { id: 'p1', priority: 1, statement: 'Be precise', applies_to: ['*'] },
      { id: 'p2', priority: 2, statement: 'Keep changes scoped', applies_to: ['*'] },
    ],
    tone: {
      voice_keywords: ['direct'],
      forbidden_phrases: ['synergy'],
      formatting_rules: ['use markdown'],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.8,
      cost_sensitivity: 0.4,
      autonomy_level: 0.65,
    },
    evidence_policy: {
      require_citations_for: ['facts'],
      uncertainty_language_rules: ['say likely when unsure'],
    },
    taboos: {
      never_do: ['fabricate citations'],
      must_escalate: ['production deletes'],
    },
  },
  guardrails: {
    schema_version: 'guardrails.v1',
    permissions: [{ scope_id: 'code_read', tool_ref: '*:*', resources: ['src/*'], ops: ['read'] }],
    approvals: [{ rule_id: 'approve_deletes', when: 'action.ops contains "delete"', action: 'require_approval', channel: 'cli' }],
    rate_limits: [{ tool_ref: '*:*', limit: 100, window: '1h' }],
  },
  skills: {
    schema_version: 'skills_manifest.v1',
    skills: [
      {
        skill_id: 'demo-skill',
        name: 'Demo Skill',
        description: 'Demonstrates adapter methods',
        risk_level: 'low',
        tags: ['demo'],
        required_tools: [],
        compatible_runtimes: ['claude-code', 'openclaw', 'manus', 'autopilots'],
      },
    ],
  },
  memory: memoryPolicy,
};

const traceEvents: TraceEvent[] = [
  {
    schema_version: 'trace_event.v1',
    run_id: 'run-1',
    timestamp: '2026-01-15T10:00:00.000Z',
    actor: 'agent',
    event_type: 'tool_call',
    tool_ref: 'github:pull_request',
    data: { repo: 'tastekit' },
  },
];

describe('adapter runtime methods', () => {
  it('implements simulation, memory mapping, and trace emission across adapters', async () => {
    const outDir = createTempDir('tastekit-adapter-runtime');

    try {
      const adapters = [
        new ClaudeCodeAdapter(),
        new OpenClawAdapter(),
        new ManusAdapter(),
        new AutopilotsAdapter(),
      ];

      for (const adapter of adapters) {
        const summary = await adapter.runSimulation?.(workspace);
        expect(summary).toBeDefined();
        expect(summary?.domain).toBe('development-agent');
        expect(summary?.principleCount).toBe(2);
        expect(summary?.guardrailCount).toBe(3);
        expect(summary?.skillCount).toBe(1);
        expect(summary?.adapters).toContain(adapter.id);

        const memory = await adapter.mapMemoryPolicy?.(memoryPolicy);
        expect(memory).toBeDefined();
        expect(memory?.runtimeSpecific.length).toBeGreaterThan(20);

        await adapter.emitTrace?.(traceEvents, outDir);
        const tracePath = join(outDir, 'traces', `${adapter.id}.jsonl`);
        expect(existsSync(tracePath)).toBe(true);

        const lines = readFileSync(tracePath, 'utf-8').trim().split('\n');
        expect(lines).toHaveLength(1);
        expect(JSON.parse(lines[0]).run_id).toBe('run-1');
      }
    } finally {
      cleanupFixture(outDir);
    }
  });
});
