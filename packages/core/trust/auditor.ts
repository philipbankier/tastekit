import { TrustV1 } from '../schemas/trust.js';
import { BindingsV1 } from '../schemas/bindings.js';

/**
 * Trust Auditor
 *
 * Audits trust policy against current bindings and detects violations:
 * - unpinned_server: bound server not in trust policy
 * - fingerprint_mismatch: server fingerprint differs from pinned value
 * - unpinned_skill: skill source not pinned (reserved for future use)
 * - new_tool: tool appeared that was not in baseline bindings
 */

export interface AuditViolation {
  type: 'fingerprint_mismatch' | 'unpinned_server' | 'unpinned_skill' | 'new_tool';
  severity: 'error' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

export interface AuditReport {
  timestamp: string;
  violations: AuditViolation[];
  passed: boolean;
}

export class TrustAuditor {
  /**
   * Audit trust policy against current bindings.
   *
   * @param trust - Current trust policy
   * @param bindings - Current MCP bindings
   * @param previousBindings - Optional baseline bindings for new_tool detection.
   *   When provided, any tool in `bindings` that was not in `previousBindings`
   *   triggers a new_tool warning.
   */
  audit(
    trust: TrustV1,
    bindings: BindingsV1,
    previousBindings?: BindingsV1,
  ): AuditReport {
    const violations: AuditViolation[] = [];

    // Check all bound servers are pinned and fingerprints match
    for (const server of bindings.servers) {
      const pinned = trust.mcp_servers.find(s => s.url === server.url);

      if (!pinned) {
        violations.push({
          type: 'unpinned_server',
          severity: 'warning',
          message: `MCP server not pinned: ${server.name}`,
          details: { url: server.url },
        });
      } else if (server.pinned_fingerprint && server.pinned_fingerprint !== pinned.fingerprint) {
        violations.push({
          type: 'fingerprint_mismatch',
          severity: pinned.pin_mode === 'strict' ? 'error' : 'warning',
          message: `Fingerprint mismatch for server: ${server.name}`,
          details: {
            expected: pinned.fingerprint,
            actual: server.pinned_fingerprint,
          },
        });
      } else if (!server.pinned_fingerprint && pinned.fingerprint) {
        // Server is in trust policy with a fingerprint but binding never pinned one
        violations.push({
          type: 'unpinned_server',
          severity: 'warning',
          message: `Server binding has no pinned fingerprint but trust policy expects one: ${server.name}`,
          details: { url: server.url, expected_fingerprint: pinned.fingerprint },
        });
      }
    }

    // Detect new tools not present in baseline
    if (previousBindings) {
      const baselineToolRefs = new Set<string>();
      for (const server of previousBindings.servers) {
        for (const tool of server.tools) {
          baselineToolRefs.add(`${server.name}:${tool.tool_ref}`);
        }
      }

      for (const server of bindings.servers) {
        for (const tool of server.tools) {
          const qualifiedRef = `${server.name}:${tool.tool_ref}`;
          if (!baselineToolRefs.has(qualifiedRef)) {
            violations.push({
              type: 'new_tool',
              severity: 'warning',
              message: `New tool detected: ${qualifiedRef}`,
              details: {
                server: server.name,
                tool_ref: tool.tool_ref,
                risk_hints: tool.risk_hints,
              },
            });
          }
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      violations,
      passed: violations.filter(v => v.severity === 'error').length === 0,
    };
  }
}
