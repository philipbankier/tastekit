import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MCPClient } from '../client.js';

const fixtureServerPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../fixtures/testing/mcp/mock-server.mjs',
);

async function withConnectedClient(
  fn: (client: MCPClient) => Promise<void>,
): Promise<void> {
  const client = new MCPClient({
    name: 'fixture-mock',
    command: process.execPath,
    args: [fixtureServerPath],
  });

  await client.connect();

  try {
    await fn(client);
  } finally {
    await client.disconnect();
  }
}

describe('MCPClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('connects to the fixture stdio server', async () => {
    await withConnectedClient(async client => {
      expect(client.isConnected()).toBe(true);
    });
  });

  it('listTools returns the fixture tool list', async () => {
    await withConnectedClient(async client => {
      const tools = await client.listTools();

      expect(tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'echo',
            description: 'Echo back text',
          }),
        ]),
      );
    });
  });

  it('callTool succeeds with valid arguments', async () => {
    await withConnectedClient(async client => {
      const result = await client.callTool('echo', {});

      expect(result.isError).not.toBe(true);
      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: 'ok',
          }),
        ]),
      );
    });
  });

  it('callTool handles invalid arguments gracefully', async () => {
    await withConnectedClient(async client => {
      await expect(client.callTool('echo', null as any)).rejects.toThrow();
    });
  });

  it('returns a deterministic fingerprint for the same server config', async () => {
    const clientA = new MCPClient({
      name: 'fixture-mock',
      command: process.execPath,
      args: [fixtureServerPath],
    });
    const clientB = new MCPClient({
      name: 'fixture-mock',
      command: process.execPath,
      args: [fixtureServerPath],
    });

    await clientA.connect();
    await clientB.connect();

    try {
      const [fingerprintA, fingerprintB] = await Promise.all([
        clientA.getFingerprint(),
        clientB.getFingerprint(),
      ]);

      expect(fingerprintA).toBe(fingerprintB);
      expect(fingerprintA).toHaveLength(64);
    } finally {
      await clientA.disconnect();
      await clientB.disconnect();
    }
  });

  it('surfaces startup errors when the server command is invalid', async () => {
    const client = new MCPClient({
      name: 'invalid-command',
      command: '__tastekit_missing_command__',
    });

    await expect(client.connect()).rejects.toThrow(/spawn|ENOENT|not found/i);
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
