import { describe, expect, it, vi } from 'vitest';
import { MCPClient } from '../client.js';

describe('MCPClient', () => {
  it('exposes config and disconnected status initially', () => {
    const client = new MCPClient({ name: 'local', command: 'node', args: ['server.js'] });

    expect(client.isConnected()).toBe(false);
    expect(client.getConfig().name).toBe('local');
  });

  it('throws if transport cannot be resolved', async () => {
    const client = new MCPClient({ name: 'broken' });

    await expect(client.connect()).rejects.toThrow(
      'MCPServerConfig must specify either command (stdio) or url (http)',
    );
  });

  it('throws when listTools is called before connect', async () => {
    const client = new MCPClient({ name: 'local', command: 'node', args: ['server.js'] });

    await expect(client.listTools()).rejects.toThrow('MCPClient is not connected');
  });

  it('computes stable fingerprint from discovered capabilities', async () => {
    const client = new MCPClient({ name: 'mock', command: 'node', args: ['mock.js'] });

    (client as any).connected = true;
    (client as any).sdkClient = {};
    (client as any).listTools = vi.fn().mockResolvedValue([
      { name: 'echo', inputSchema: { type: 'object' } },
    ]);
    (client as any).listResources = vi.fn().mockResolvedValue([
      { uri: 'file://README.md' },
    ]);
    (client as any).listPrompts = vi.fn().mockResolvedValue([
      { name: 'welcome' },
    ]);

    const fp1 = await client.getFingerprint();
    const fp2 = await client.getFingerprint();

    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64);
  });
});
