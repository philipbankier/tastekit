import { describe, it, expect } from 'vitest';
import {
  ConstitutionV1Schema,
  ConstitutionPrincipleSchema,
  ConstitutionToneSchema,
  ConstitutionTradeoffsSchema,
} from '../constitution.js';
import {
  GuardrailsV1Schema,
  GuardrailsPermissionSchema,
  GuardrailsApprovalSchema,
} from '../guardrails.js';
import {
  MemoryV1Schema,
  MemorySalienceRuleSchema,
} from '../memory.js';
import {
  TraceEventSchema,
} from '../trace.js';
import {
  EvalPackV1Schema,
  EvalJudgingRuleSchema,
} from '../evalpack.js';
import {
  WorkspaceConfigSchema,
  SessionStateSchema,
} from '../workspace.js';
import {
  validateConstitution,
  validateGuardrails,
  validateMemory,
  validateTraceEvent,
  validateWorkspaceConfig,
  validateSessionState,
} from '../validators.js';

// ─── Helpers ───

function validConstitution() {
  return {
    schema_version: 'constitution.v1',
    generated_at: '2026-01-15T10:00:00.000Z',
    generator_version: '0.5.0',
    user_scope: 'single_user',
    principles: [
      {
        id: 'p1',
        priority: 1,
        statement: 'Be helpful and concise',
        applies_to: ['*'],
      },
    ],
    tone: {
      voice_keywords: ['friendly', 'professional'],
      forbidden_phrases: ['as an AI'],
      formatting_rules: ['use markdown'],
    },
    tradeoffs: {
      accuracy_vs_speed: 0.7,
      cost_sensitivity: 0.3,
      autonomy_level: 0.5,
    },
    evidence_policy: {
      require_citations_for: ['facts'],
      uncertainty_language_rules: ['use "likely"'],
    },
    taboos: {
      never_do: ['share passwords'],
      must_escalate: ['financial decisions'],
    },
  };
}

function validGuardrails() {
  return {
    schema_version: 'guardrails.v1',
    permissions: [
      {
        scope_id: 'default',
        tool_ref: 'server:tool',
        resources: ['*'],
        ops: ['read', 'execute'],
      },
    ],
    approvals: [
      {
        rule_id: 'approve_writes',
        when: 'action.type == "write"',
        action: 'require_approval',
        channel: 'cli',
      },
    ],
    rate_limits: [
      {
        tool_ref: '*:*',
        limit: 100,
        window: '1h',
      },
    ],
  };
}

function validMemory() {
  return {
    schema_version: 'memory.v1',
    runtime_target: 'generic',
    stores: [
      { store_id: 'default', type: 'runtime_managed', config: {} },
    ],
    write_policy: {
      salience_rules: [
        { rule_id: 'prefs', pattern: 'preference', score: 0.9 },
      ],
      pii_handling: { detect: true, redact: false, store_separately: true },
      update_mode: 'consolidate',
      revisit_triggers: ['user_correction'],
    },
    retention_policy: {
      ttl_days: 90,
      prune_strategy: 'least_salient',
    },
  };
}

function validTraceEvent() {
  return {
    schema_version: 'trace_event.v1',
    run_id: 'run-123',
    timestamp: '2026-01-15T10:00:00.000Z',
    actor: 'agent',
    event_type: 'tool_call',
    tool_ref: 'server:search',
    data: { input: 'test query' },
  };
}

function validWorkspaceConfig() {
  return {
    version: '0.5.0',
    project_name: 'my-agent',
    created_at: '2026-01-15T10:00:00.000Z',
  };
}

function validSessionState() {
  return {
    session_id: 'sess-abc',
    started_at: '2026-01-15T10:00:00.000Z',
    last_updated_at: '2026-01-15T10:05:00.000Z',
    depth: 'guided',
    current_step: 'goals',
    completed_steps: ['intro'],
    answers: { goals: { primary_goal: 'code review' } },
  };
}

// ─── Constitution Schema Tests ───

describe('ConstitutionV1Schema', () => {
  it('accepts valid constitution', () => {
    const result = ConstitutionV1Schema.safeParse(validConstitution());
    expect(result.success).toBe(true);
  });

  it('rejects wrong schema_version', () => {
    const data = { ...validConstitution(), schema_version: 'constitution.v2' };
    const result = ConstitutionV1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing principles', () => {
    const data = { ...validConstitution() };
    delete (data as any).principles;
    const result = ConstitutionV1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid generated_at (not ISO datetime)', () => {
    const data = { ...validConstitution(), generated_at: 'not-a-date' };
    const result = ConstitutionV1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects principle with non-positive priority', () => {
    const result = ConstitutionPrincipleSchema.safeParse({
      id: 'p1',
      priority: 0,
      statement: 'test',
      applies_to: ['*'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts principle with optional fields omitted', () => {
    const result = ConstitutionPrincipleSchema.safeParse({
      id: 'p1',
      priority: 1,
      statement: 'test',
      applies_to: ['*'],
    });
    expect(result.success).toBe(true);
  });
});

describe('ConstitutionTradeoffsSchema', () => {
  it('rejects autonomy_level > 1', () => {
    const result = ConstitutionTradeoffsSchema.safeParse({
      accuracy_vs_speed: 0.5,
      cost_sensitivity: 0.5,
      autonomy_level: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects accuracy_vs_speed < 0', () => {
    const result = ConstitutionTradeoffsSchema.safeParse({
      accuracy_vs_speed: -0.1,
      cost_sensitivity: 0.5,
      autonomy_level: 0.5,
    });
    expect(result.success).toBe(false);
  });
});

// ─── Guardrails Schema Tests ───

describe('GuardrailsV1Schema', () => {
  it('accepts valid guardrails', () => {
    const result = GuardrailsV1Schema.safeParse(validGuardrails());
    expect(result.success).toBe(true);
  });

  it('rejects invalid ops value', () => {
    const result = GuardrailsPermissionSchema.safeParse({
      scope_id: 'test',
      tool_ref: 'server:tool',
      resources: ['*'],
      ops: ['read', 'fly'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid approval action', () => {
    const result = GuardrailsApprovalSchema.safeParse({
      rule_id: 'test',
      when: 'true',
      action: 'maybe',
      channel: 'cli',
    });
    expect(result.success).toBe(false);
  });

  it('accepts guardrails with no rollback', () => {
    const data = validGuardrails();
    const result = GuardrailsV1Schema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

// ─── Memory Schema Tests ───

describe('MemoryV1Schema', () => {
  it('accepts valid memory policy', () => {
    const result = MemoryV1Schema.safeParse(validMemory());
    expect(result.success).toBe(true);
  });

  it('rejects salience score > 1', () => {
    const result = MemorySalienceRuleSchema.safeParse({
      rule_id: 'test',
      pattern: 'test',
      score: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects salience score < 0', () => {
    const result = MemorySalienceRuleSchema.safeParse({
      rule_id: 'test',
      pattern: 'test',
      score: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid update_mode', () => {
    const data = validMemory();
    data.write_policy.update_mode = 'delete' as any;
    const result = MemoryV1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid prune_strategy', () => {
    const data = validMemory();
    data.retention_policy.prune_strategy = 'random' as any;
    const result = MemoryV1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// ─── Trace Event Schema Tests ───

describe('TraceEventSchema', () => {
  it('accepts valid trace event', () => {
    const result = TraceEventSchema.safeParse(validTraceEvent());
    expect(result.success).toBe(true);
  });

  it('rejects invalid actor', () => {
    const data = { ...validTraceEvent(), actor: 'robot' };
    const result = TraceEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid event_type', () => {
    const data = { ...validTraceEvent(), event_type: 'dance' };
    const result = TraceEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects risk_score > 1', () => {
    const data = { ...validTraceEvent(), risk_score: 2.0 };
    const result = TraceEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts all valid event_types', () => {
    const types = [
      'plan', 'think', 'tool_call', 'tool_result', 'approval_requested',
      'approval_response', 'artifact_written', 'memory_write', 'evaluation', 'error',
    ];
    for (const type of types) {
      const data = { ...validTraceEvent(), event_type: type };
      const result = TraceEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });
});

// ─── EvalPack Schema Tests ───

describe('EvalPackV1Schema', () => {
  it('accepts valid evalpack', () => {
    const result = EvalPackV1Schema.safeParse({
      schema_version: 'evalpack.v1',
      id: 'eval-1',
      name: 'Test Eval',
      description: 'Tests agent quality',
      scenarios: [
        {
          scenario_id: 's1',
          name: 'Basic test',
          description: 'Simple test case',
          setup: { inputs: { query: 'hello' } },
          expected: { rubrics: ['quality'], thresholds: { quality: 0.8 } },
        },
      ],
      judging: {
        rules: [
          { rule_id: 'r1', type: 'deterministic', weight: 1 },
        ],
        output_format: 'json',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid judging rule type', () => {
    const result = EvalJudgingRuleSchema.safeParse({
      rule_id: 'r1',
      type: 'magic',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weight > 1', () => {
    const result = EvalJudgingRuleSchema.safeParse({
      rule_id: 'r1',
      type: 'deterministic',
      weight: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

// ─── Workspace & Session Schema Tests ───

describe('WorkspaceConfigSchema', () => {
  it('accepts valid workspace config', () => {
    const result = WorkspaceConfigSchema.safeParse(validWorkspaceConfig());
    expect(result.success).toBe(true);
  });

  it('accepts workspace with onboarding info', () => {
    const result = WorkspaceConfigSchema.safeParse({
      ...validWorkspaceConfig(),
      onboarding: { depth: 'guided', completed: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid onboarding depth', () => {
    const result = WorkspaceConfigSchema.safeParse({
      ...validWorkspaceConfig(),
      onboarding: { depth: 'extreme', completed: false },
    });
    expect(result.success).toBe(false);
  });
});

describe('SessionStateSchema', () => {
  it('accepts valid session state', () => {
    const result = SessionStateSchema.safeParse(validSessionState());
    expect(result.success).toBe(true);
  });

  it('rejects invalid depth', () => {
    const data = { ...validSessionState(), depth: 'turbo' };
    const result = SessionStateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// ─── Validator Function Tests ───

describe('validators', () => {
  it('validateConstitution returns success for valid data', () => {
    const result = validateConstitution(validConstitution());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schema_version).toBe('constitution.v1');
    }
  });

  it('validateConstitution returns errors for invalid data', () => {
    const result = validateConstitution({ bad: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.issues.length).toBeGreaterThan(0);
    }
  });

  it('validateGuardrails returns success for valid data', () => {
    const result = validateGuardrails(validGuardrails());
    expect(result.success).toBe(true);
  });

  it('validateMemory returns success for valid data', () => {
    const result = validateMemory(validMemory());
    expect(result.success).toBe(true);
  });

  it('validateTraceEvent returns success for valid data', () => {
    const result = validateTraceEvent(validTraceEvent());
    expect(result.success).toBe(true);
  });

  it('validateWorkspaceConfig returns success for valid data', () => {
    const result = validateWorkspaceConfig(validWorkspaceConfig());
    expect(result.success).toBe(true);
  });

  it('validateSessionState returns success for valid data', () => {
    const result = validateSessionState(validSessionState());
    expect(result.success).toBe(true);
  });

  it('validateSessionState returns errors for missing fields', () => {
    const result = validateSessionState({ session_id: 'x' });
    expect(result.success).toBe(false);
  });
});
