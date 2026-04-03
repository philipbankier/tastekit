import { describe, expect, it } from 'vitest';
import { MCPBinder } from '../binder.js';

describe('MCPBinder', () => {
  it('binds tools/resources/prompts and generates guardrails from annotations', async () => {
    const binder = new MCPBinder();

    const mockClient: any = {
      listTools: async () => [
        {
          name: 'read_docs',
          description: 'Read docs',
          annotations: { readOnlyHint: true },
        },
        {
          name: 'delete_file',
          description: 'Delete file',
          annotations: { destructive: true, risk: 'high' },
        },
      ],
      listResources: async () => [{ uri: 'file://README.md' }],
      listPrompts: async () => [{ name: 'summary', description: 'Summarize content' }],
      getFingerprint: async () => 'fp-123',
    };

    const { bindings, guardrails } = await binder.bindServer(
      mockClient,
      'local-mock',
      'stdio://mock',
      { autoApproveRead: true },
    );

    expect(bindings.name).toBe('local-mock');
    expect(bindings.tools).toHaveLength(2);
    expect(bindings.resources).toHaveLength(1);
    expect(bindings.prompts).toHaveLength(1);
    expect(bindings.pinned_fingerprint).toBe('fp-123');

    expect(guardrails).toHaveLength(1);
    expect(guardrails[0].rule_id).toContain('delete_file');
    expect(guardrails[0].action).toBe('require_approval');
  });

  it('adds allow guardrails for non-destructive tools when auto approve read is disabled', async () => {
    const binder = new MCPBinder();

    const mockClient: any = {
      listTools: async () => [
        {
          name: 'list_files',
          annotations: { readOnlyHint: true },
        },
      ],
      listResources: async () => [],
      listPrompts: async () => [],
      getFingerprint: async () => 'fp-456',
    };

    const { guardrails } = await binder.bindServer(mockClient, 'reader', 'stdio://reader', {
      autoApproveRead: false,
    });

    expect(guardrails).toHaveLength(1);
    expect(guardrails[0].action).toBe('allow');
    expect(guardrails[0].rule_id).toContain('list_files');
  });
});
