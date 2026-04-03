/**
 * Tool Usage Block — MCP bindings summary.
 */
import type { GeneratorBlock } from '../types.js';

export const toolUsageBlock: GeneratorBlock = (ctx) => {
  if (!ctx.bindings?.servers?.length) return null;

  const lines: string[] = ['## Tool Usage', ''];

  for (const server of ctx.bindings.servers) {
    lines.push(`### ${server.name}`);
    if (server.tools.length > 0) {
      lines.push('**Tools:**');
      for (const tool of server.tools) {
        const hints = tool.risk_hints?.length ? ` _(${tool.risk_hints.join(', ')})_` : '';
        lines.push(`- \`${tool.tool_ref}\`${hints}`);
      }
    }
    if (server.resources?.length) {
      lines.push('**Resources:**');
      for (const r of server.resources) {
        lines.push(`- \`${r.resource_ref}\``);
      }
    }
    lines.push('');
  }

  // Permission scopes from guardrails
  if (ctx.guardrails?.permissions?.length) {
    lines.push('### Permission Scopes');
    for (const perm of ctx.guardrails.permissions) {
      lines.push(`- **${perm.scope_id}**: ${perm.tool_ref} — ${perm.ops.join(', ')} on ${perm.resources.join(', ')}`);
    }
  }

  return lines.join('\n');
};
