/**
 * MCP Client
 *
 * Client for connecting to MCP servers and discovering tools/resources/prompts.
 * Wraps the official @modelcontextprotocol/sdk for transport, discovery, and invocation.
 *
 * Supports two transport modes:
 *   - stdio: launches a local process (command + args)
 *   - streamable-http: connects to a remote HTTP endpoint
 */

import { hashString } from '../utils/hash.js';

// -- Public interfaces -------------------------------------------------------

export interface MCPServerConfig {
  name: string;
  /** For stdio transport: the command to launch the server */
  command?: string;
  /** For stdio transport: arguments to the command */
  args?: string[];
  /** For stdio transport: environment variables */
  env?: Record<string, string>;
  /** For HTTP transport: the server URL */
  url?: string;
  /** Transport type (default: inferred from presence of command vs url) */
  transport?: 'stdio' | 'streamable-http';
  /** Previously pinned fingerprint */
  fingerprint?: string;
}

/** Backward-compatible alias */
export type MCPServer = MCPServerConfig;

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    risk?: string;
    destructive?: boolean;
    readOnlyHint?: boolean;
    openWorldHint?: boolean;
  };
}

export interface MCPResource {
  uri: string;
  name?: string;
  mimeType?: string;
  description?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPToolResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}

export interface MCPServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

// -- Client implementation ----------------------------------------------------

export class MCPClient {
  private config: MCPServerConfig;
  private connected = false;

  // The official SDK client and transport are loaded dynamically
  // so the rest of TasteKit can function even if the SDK is not installed.
  private sdkClient: any = null;
  private sdkTransport: any = null;

  constructor(server: MCPServerConfig) {
    this.config = server;
  }

  /**
   * Connect to the MCP server using the appropriate transport.
   *
   * Requires `@modelcontextprotocol/sdk` to be installed. If it is not,
   * throws with a clear install instruction.
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    const transport = this.resolveTransport();

    try {
      const sdk = await this.loadSDK();

      if (transport === 'stdio') {
        if (!this.config.command) {
          throw new Error('stdio transport requires a command');
        }
        const { StdioClientTransport } = sdk;
        this.sdkTransport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args ?? [],
          env: { ...process.env, ...(this.config.env ?? {}) } as Record<string, string>,
        });
      } else {
        if (!this.config.url) {
          throw new Error('streamable-http transport requires a url');
        }
        const { StreamableHTTPClientTransport } = sdk;
        this.sdkTransport = new StreamableHTTPClientTransport(
          new URL(this.config.url),
        );
      }

      const { Client } = sdk;
      this.sdkClient = new Client(
        { name: 'tastekit', version: '0.5.0' },
        { capabilities: {} },
      );

      await this.sdkClient.connect(this.sdkTransport);
      this.connected = true;
    } catch (err: any) {
      if (err?.code === 'ERR_MODULE_NOT_FOUND' || err?.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'MCP SDK not installed. Run: npm install @modelcontextprotocol/sdk\n' +
          'The official SDK provides stdio and HTTP transports for MCP servers.',
        );
      }
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.sdkClient?.close?.();
      await this.sdkTransport?.close?.();
    } finally {
      this.connected = false;
      this.sdkClient = null;
      this.sdkTransport = null;
    }
  }

  async listTools(): Promise<MCPTool[]> {
    this.ensureConnected();
    const result = await this.sdkClient.listTools();
    return (result.tools ?? []).map((t: any) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
    }));
  }

  async listResources(): Promise<MCPResource[]> {
    this.ensureConnected();
    try {
      const result = await this.sdkClient.listResources();
      return (result.resources ?? []).map((r: any) => ({
        uri: r.uri,
        name: r.name,
        mimeType: r.mimeType,
        description: r.description,
      }));
    } catch {
      // Server may not support resources
      return [];
    }
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    this.ensureConnected();
    try {
      const result = await this.sdkClient.listPrompts();
      return (result.prompts ?? []).map((p: any) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      }));
    } catch {
      // Server may not support prompts
      return [];
    }
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<MCPToolResult> {
    this.ensureConnected();
    const result = await this.sdkClient.callTool({ name, arguments: args });
    return {
      content: result.content ?? [],
      isError: result.isError,
    };
  }

  /**
   * Compute a fingerprint for trust pinning.
   * Based on server identity + tool names + tool schemas (sorted, hashed).
   */
  async getFingerprint(): Promise<string> {
    this.ensureConnected();
    const tools = await this.listTools();
    const resources = await this.listResources();
    const prompts = await this.listPrompts();

    const identity = {
      name: this.config.name,
      tools: tools.map(t => ({ name: t.name, inputSchema: t.inputSchema })),
      resources: resources.map(r => ({ uri: r.uri })),
      prompts: prompts.map(p => ({ name: p.name })),
    };

    return hashString(JSON.stringify(identity));
  }

  async getCapabilities(): Promise<MCPServerCapabilities> {
    this.ensureConnected();
    const caps = this.sdkClient.getServerCapabilities?.() ?? {};
    return {
      tools: !!caps.tools,
      resources: !!caps.resources,
      prompts: !!caps.prompts,
      logging: !!caps.logging,
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): MCPServerConfig {
    return this.config;
  }

  // -- Private helpers --------------------------------------------------------

  private resolveTransport(): 'stdio' | 'streamable-http' {
    if (this.config.transport) return this.config.transport;
    if (this.config.command) return 'stdio';
    if (this.config.url) return 'streamable-http';
    throw new Error('MCPServerConfig must specify either command (stdio) or url (http)');
  }

  private ensureConnected(): void {
    if (!this.connected || !this.sdkClient) {
      throw new Error('MCPClient is not connected. Call connect() first.');
    }
  }

  private async loadSDK(): Promise<any> {
    // Dynamic import so the rest of TasteKit works without the SDK installed
    const clientModule = await import('@modelcontextprotocol/sdk/client/index.js');
    let stdioModule: any = {};
    let httpModule: any = {};

    try {
      stdioModule = await import('@modelcontextprotocol/sdk/client/stdio.js');
    } catch { /* stdio transport not needed for HTTP connections */ }

    try {
      httpModule = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    } catch { /* HTTP transport not needed for stdio connections */ }

    return {
      Client: clientModule.Client,
      StdioClientTransport: stdioModule.StdioClientTransport,
      StreamableHTTPClientTransport: httpModule.StreamableHTTPClientTransport,
    };
  }
}
