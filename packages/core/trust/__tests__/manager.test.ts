import { describe, expect, it } from 'vitest';
import { TrustManager } from '../manager.js';
import type { TrustV1 } from '../../schemas/trust.js';

function policy(): TrustV1 {
  return {
    schema_version: 'trust.v1',
    mcp_servers: [],
    skill_sources: [],
    update_policy: {
      allow_auto_updates: false,
      require_review: true,
    },
  };
}

describe('TrustManager', () => {
  it('pins and updates MCP fingerprints', () => {
    const manager = new TrustManager(policy());

    manager.pinMCPServer('https://mcp.local', 'fp-1', 'strict');
    manager.pinMCPServer('https://mcp.local', 'fp-2', 'warn');

    const current = manager.getPolicy().mcp_servers;
    expect(current).toHaveLength(1);
    expect(current[0].fingerprint).toBe('fp-2');
    expect(current[0].pin_mode).toBe('warn');
  });

  it('verifies pinned server fingerprints', () => {
    const manager = new TrustManager(policy());
    manager.pinMCPServer('https://mcp.local', 'fp-123', 'strict');

    expect(manager.verifyMCPServer('https://mcp.local', 'fp-123').trusted).toBe(true);
    expect(manager.verifyMCPServer('https://mcp.local', 'fp-bad').trusted).toBe(false);
    expect(manager.verifyMCPServer('https://unknown.local', 'fp-any').trusted).toBe(false);
  });

  it('pins both local and git skill sources', () => {
    const manager = new TrustManager(policy());

    manager.pinSkillSource('local', '/tmp/skills', 'hash-abc', 'strict');
    manager.pinSkillSource('git', 'https://github.com/example/skills', 'commit-123', 'warn');

    const sources = manager.getPolicy().skill_sources;
    expect(sources).toHaveLength(2);
    expect(sources[0].type).toBe('local');
    expect(sources[0].hash).toBe('hash-abc');
    expect(sources[1].type).toBe('git');
    expect(sources[1].commit).toBe('commit-123');
  });
});
