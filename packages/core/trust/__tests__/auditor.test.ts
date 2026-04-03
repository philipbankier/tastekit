import { describe, expect, it } from 'vitest';
import { TrustAuditor } from '../auditor.js';
import type { BindingsV1 } from '../../schemas/bindings.js';
import type { TrustV1 } from '../../schemas/trust.js';

function trust(pinMode: 'strict' | 'warn', actualFingerprint = 'fp-good'): TrustV1 {
  return {
    schema_version: 'trust.v1',
    mcp_servers: [
      {
        url: 'https://mcp.local',
        fingerprint: actualFingerprint,
        pin_mode: pinMode,
      },
    ],
    skill_sources: [],
    update_policy: {
      allow_auto_updates: false,
      require_review: true,
    },
  };
}

function bindings(fingerprint = 'fp-good'): BindingsV1 {
  return {
    schema_version: 'bindings.v1',
    servers: [
      {
        name: 'local',
        url: 'https://mcp.local',
        pinned_fingerprint: fingerprint,
        tools: [],
      },
    ],
  };
}

describe('TrustAuditor', () => {
  it('passes when fingerprints match', () => {
    const auditor = new TrustAuditor();
    const report = auditor.audit(trust('strict'), bindings('fp-good'));

    expect(report.passed).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('returns warning for unpinned servers', () => {
    const auditor = new TrustAuditor();

    const report = auditor.audit(
      {
        schema_version: 'trust.v1',
        mcp_servers: [],
        skill_sources: [],
        update_policy: { allow_auto_updates: false, require_review: true },
      },
      bindings('fp-any'),
    );

    expect(report.passed).toBe(true);
    expect(report.violations[0].type).toBe('unpinned_server');
    expect(report.violations[0].severity).toBe('warning');
  });

  it('fails on strict fingerprint mismatch and warns on warn mode mismatch', () => {
    const auditor = new TrustAuditor();

    const strictReport = auditor.audit(trust('strict', 'fp-expected'), bindings('fp-actual'));
    expect(strictReport.passed).toBe(false);
    expect(strictReport.violations[0].type).toBe('fingerprint_mismatch');
    expect(strictReport.violations[0].severity).toBe('error');

    const warnReport = auditor.audit(trust('warn', 'fp-expected'), bindings('fp-actual'));
    expect(warnReport.passed).toBe(true);
    expect(warnReport.violations[0].severity).toBe('warning');
  });

  // ─── new_tool detection ───

  it('detects new tools when baseline is provided', () => {
    const auditor = new TrustAuditor();
    const previousBindings: BindingsV1 = {
      schema_version: 'bindings.v1',
      servers: [
        {
          name: 'local',
          url: 'https://mcp.local',
          pinned_fingerprint: 'fp-good',
          tools: [{ tool_ref: 'read_file' }],
          last_bind_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const currentBindings: BindingsV1 = {
      schema_version: 'bindings.v1',
      servers: [
        {
          name: 'local',
          url: 'https://mcp.local',
          pinned_fingerprint: 'fp-good',
          tools: [
            { tool_ref: 'read_file' },
            { tool_ref: 'write_file', risk_hints: ['destructive'] },
          ],
          last_bind_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    };

    const report = auditor.audit(trust('strict'), currentBindings, previousBindings);
    const newToolViolation = report.violations.find(v => v.type === 'new_tool');
    expect(newToolViolation).toBeDefined();
    expect(newToolViolation!.message).toContain('write_file');
    expect(newToolViolation!.severity).toBe('warning');
    expect(report.passed).toBe(true); // new_tool is warning, not error
  });

  it('no new_tool violations when tools are unchanged', () => {
    const auditor = new TrustAuditor();
    const b: BindingsV1 = {
      schema_version: 'bindings.v1',
      servers: [
        {
          name: 'local',
          url: 'https://mcp.local',
          pinned_fingerprint: 'fp-good',
          tools: [{ tool_ref: 'read_file' }],
          last_bind_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const report = auditor.audit(trust('strict'), b, b);
    const newToolViolations = report.violations.filter(v => v.type === 'new_tool');
    expect(newToolViolations).toHaveLength(0);
  });

  it('skips new_tool check when no baseline provided', () => {
    const auditor = new TrustAuditor();
    const b: BindingsV1 = {
      schema_version: 'bindings.v1',
      servers: [
        {
          name: 'local',
          url: 'https://mcp.local',
          pinned_fingerprint: 'fp-good',
          tools: [{ tool_ref: 'read_file' }, { tool_ref: 'write_file' }],
          last_bind_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const report = auditor.audit(trust('strict'), b);
    const newToolViolations = report.violations.filter(v => v.type === 'new_tool');
    expect(newToolViolations).toHaveLength(0);
  });
});
