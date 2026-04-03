import { BindingsV1, BindingsServer, BindingsTool } from '../schemas/bindings.js';
import { GuardrailsV1, GuardrailsApproval } from '../schemas/guardrails.js';
import { MCPClient, MCPTool } from './client.js';

/**
 * MCP Binder
 *
 * Binds MCP tools to the workspace and generates guardrails from MCP metadata.
 */

export interface BindingOptions {
  interactive?: boolean;
  autoApproveRead?: boolean;
  /**
   * Custom tool selection callback. When provided and `interactive` is true,
   * this function is called with discovered tools and should return the
   * selected subset. This keeps @tastekit/core free of UI dependencies —
   * the CLI injects an inquirer-based implementation.
   */
  toolSelector?: (tools: MCPTool[]) => Promise<MCPTool[]>;
}

export class MCPBinder {
  async bindServer(
    client: MCPClient,
    serverName: string,
    serverUrl: string,
    options: BindingOptions = {}
  ): Promise<{ bindings: BindingsServer; guardrails: GuardrailsApproval[] }> {

    // Discover tools
    const tools = await client.listTools();
    const resources = await client.listResources();
    const prompts = await client.listPrompts();

    // Get fingerprint for trust
    const fingerprint = await client.getFingerprint();

    // Select tools
    let selectedTools: MCPTool[];
    if (options.interactive && options.toolSelector) {
      selectedTools = await options.toolSelector(tools);
    } else if (options.interactive) {
      // Fallback: select all when no selector provided
      selectedTools = tools;
    } else {
      selectedTools = tools;
    }

    // Create bindings
    const bindingsServer: BindingsServer = {
      name: serverName,
      url: serverUrl,
      pinned_fingerprint: fingerprint,
      tools: selectedTools.map(tool => this.createToolBinding(tool)),
      resources: resources.map(r => ({
        resource_ref: `${serverName}:${r.uri}`,
        uri_pattern: r.uri,
      })),
      prompts: prompts.map(p => ({
        prompt_ref: `${serverName}:${p.name}`,
        description: p.description,
      })),
      last_bind_at: new Date().toISOString(),
    };

    // Generate guardrails from MCP metadata
    const guardrails = this.generateGuardrailsFromMetadata(
      selectedTools,
      serverName,
      options
    );

    return { bindings: bindingsServer, guardrails };
  }

  private createToolBinding(tool: MCPTool): BindingsTool {
    const riskHints: string[] = [];

    if (tool.annotations?.destructive) {
      riskHints.push('destructive');
    }
    if (tool.annotations?.risk) {
      riskHints.push(tool.annotations.risk);
    }

    return {
      tool_ref: tool.name,
      risk_hints: riskHints.length > 0 ? riskHints : undefined,
    };
  }

  private generateGuardrailsFromMetadata(
    tools: MCPTool[],
    serverName: string,
    options: BindingOptions
  ): GuardrailsApproval[] {
    const guardrails: GuardrailsApproval[] = [];

    for (const tool of tools) {
      // Auto-generate approval rules based on MCP annotations
      if (tool.annotations?.destructive) {
        guardrails.push({
          rule_id: `approve_${serverName}_${tool.name}`,
          when: `tool_ref == "${serverName}:${tool.name}"`,
          action: 'require_approval',
          channel: 'cli',
        });
      } else if (tool.annotations?.risk === 'high') {
        guardrails.push({
          rule_id: `approve_${serverName}_${tool.name}`,
          when: `tool_ref == "${serverName}:${tool.name}"`,
          action: 'require_approval',
          channel: 'cli',
        });
      } else if (!options.autoApproveRead) {
        // For read-only tools, allow by default unless opted out
        guardrails.push({
          rule_id: `allow_${serverName}_${tool.name}`,
          when: `tool_ref == "${serverName}:${tool.name}"`,
          action: 'allow',
          channel: 'cli',
        });
      }
    }

    return guardrails;
  }
}
