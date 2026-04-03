import { z } from 'zod';

/**
 * Trust v1 Schema
 * 
 * Provenance and trust policy for MCP servers and skill sources.
 */

export const TrustMCPServerSchema = z.object({
  url: z.string().describe('MCP server URL'),
  fingerprint: z.string().describe('Server fingerprint (hash)'),
  pin_mode: z.enum(['strict', 'warn']).describe('strict = block on change, warn = notify only'),
});

export const TrustSkillSourceSchema = z.object({
  type: z.enum(['local', 'git']),
  path: z.string().optional().describe('Local filesystem path'),
  url: z.string().optional().describe('Git repository URL'),
  commit: z.string().optional().describe('Git commit hash'),
  hash: z.string().optional().describe('Content hash for local sources'),
  pin_mode: z.enum(['strict', 'warn']),
});

export const TrustUpdatePolicySchema = z.object({
  allow_auto_updates: z.boolean().default(false).describe('Allow automatic updates'),
  require_review: z.boolean().default(true).describe('Require manual review before updates'),
});

export const TrustV1Schema = z.object({
  schema_version: z.literal('trust.v1'),
  
  mcp_servers: z.array(TrustMCPServerSchema).describe('Pinned MCP servers'),
  skill_sources: z.array(TrustSkillSourceSchema).describe('Pinned skill sources'),
  update_policy: TrustUpdatePolicySchema,
});

export type TrustV1 = z.infer<typeof TrustV1Schema>;
export type TrustMCPServer = z.infer<typeof TrustMCPServerSchema>;
export type TrustSkillSource = z.infer<typeof TrustSkillSourceSchema>;
export type TrustUpdatePolicy = z.infer<typeof TrustUpdatePolicySchema>;
