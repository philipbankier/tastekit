import { MCPClient, MCPServer } from './client.js';

/**
 * MCP Inspector
 * 
 * Inspects MCP servers and provides detailed information about capabilities.
 */

export interface InspectionResult {
  server: MCPServer;
  tools: Array<{
    name: string;
    description?: string;
    risk_level: 'low' | 'medium' | 'high';
    destructive: boolean;
  }>;
  resources: Array<{
    uri: string;
    name?: string;
  }>;
  prompts: Array<{
    name: string;
    description?: string;
  }>;
  fingerprint: string;
}

export class MCPInspector {
  async inspect(server: MCPServer): Promise<InspectionResult> {
    const client = new MCPClient(server);
    
    try {
      await client.connect();
      
      const tools = await client.listTools();
      const resources = await client.listResources();
      const prompts = await client.listPrompts();
      const fingerprint = await client.getFingerprint();
      
      return {
        server,
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          risk_level: this.assessRiskLevel(tool),
          destructive: tool.annotations?.destructive || false,
        })),
        resources: resources.map(r => ({
          uri: r.uri,
          name: r.name,
        })),
        prompts: prompts.map(p => ({
          name: p.name,
          description: p.description,
        })),
        fingerprint,
      };
      
    } finally {
      await client.disconnect();
    }
  }
  
  private assessRiskLevel(tool: any): 'low' | 'medium' | 'high' {
    if (tool.annotations?.risk === 'high' || tool.annotations?.destructive) {
      return 'high';
    }
    if (tool.annotations?.risk === 'medium') {
      return 'medium';
    }
    return 'low';
  }
}
