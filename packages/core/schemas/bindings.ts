import { z } from 'zod';

/**
 * Bindings v1 Schema
 * 
 * MCP server bindings - selected tools, resources, and prompts.
 */

export const BindingsToolSchema = z.object({
  tool_ref: z.string().describe('Tool reference (server:tool)'),
  risk_hints: z.array(z.string()).optional().describe('Risk hints from MCP annotations'),
  default_permission_scope_id: z.string().optional(),
});

export const BindingsResourceSchema = z.object({
  resource_ref: z.string().describe('Resource reference (server:resource)'),
  uri_pattern: z.string().optional(),
});

export const BindingsPromptSchema = z.object({
  prompt_ref: z.string().describe('Prompt reference (server:prompt)'),
  description: z.string().optional(),
});

export const BindingsServerSchema = z.object({
  name: z.string().describe('Server name'),
  url: z.string().describe('Server URL or connection string'),
  pinned_fingerprint: z.string().optional().describe('Pinned server fingerprint for trust'),
  auth: z.record(z.string()).optional().describe('Auth references (no secrets)'),
  
  tools: z.array(BindingsToolSchema).describe('Selected tools from this server'),
  resources: z.array(BindingsResourceSchema).optional().describe('Selected resources'),
  prompts: z.array(BindingsPromptSchema).optional().describe('Selected prompts'),
  
  last_bind_at: z.string().datetime().describe('Last binding timestamp'),
});

export const BindingsV1Schema = z.object({
  schema_version: z.literal('bindings.v1'),
  servers: z.array(BindingsServerSchema),
});

export type BindingsV1 = z.infer<typeof BindingsV1Schema>;
export type BindingsServer = z.infer<typeof BindingsServerSchema>;
export type BindingsTool = z.infer<typeof BindingsToolSchema>;
export type BindingsResource = z.infer<typeof BindingsResourceSchema>;
export type BindingsPrompt = z.infer<typeof BindingsPromptSchema>;
