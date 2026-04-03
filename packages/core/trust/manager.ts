import { TrustV1, TrustMCPServer, TrustSkillSource } from '../schemas/trust.js';
import { hashString } from '../utils/hash.js';

/**
 * Trust Manager
 * 
 * Manages trust policy for MCP servers and skill sources.
 */

export class TrustManager {
  private policy: TrustV1;
  
  constructor(policy: TrustV1) {
    this.policy = policy;
  }
  
  pinMCPServer(url: string, fingerprint: string, mode: 'strict' | 'warn' = 'strict'): void {
    const existing = this.policy.mcp_servers.find(s => s.url === url);
    
    if (existing) {
      existing.fingerprint = fingerprint;
      existing.pin_mode = mode;
    } else {
      this.policy.mcp_servers.push({
        url,
        fingerprint,
        pin_mode: mode,
      });
    }
  }
  
  pinSkillSource(
    type: 'local' | 'git',
    pathOrUrl: string,
    hash: string,
    mode: 'strict' | 'warn' = 'strict'
  ): void {
    const source: TrustSkillSource = {
      type,
      pin_mode: mode,
    };
    
    if (type === 'local') {
      source.path = pathOrUrl;
      source.hash = hash;
    } else {
      source.url = pathOrUrl;
      source.commit = hash;
    }
    
    this.policy.skill_sources.push(source);
  }
  
  verifyMCPServer(url: string, currentFingerprint: string): {
    trusted: boolean;
    reason?: string;
  } {
    const pinned = this.policy.mcp_servers.find(s => s.url === url);
    
    if (!pinned) {
      return {
        trusted: false,
        reason: 'Server not pinned in trust policy',
      };
    }
    
    if (pinned.fingerprint !== currentFingerprint) {
      return {
        trusted: false,
        reason: `Fingerprint mismatch (expected: ${pinned.fingerprint}, got: ${currentFingerprint})`,
      };
    }
    
    return { trusted: true };
  }
  
  getPolicy(): TrustV1 {
    return this.policy;
  }
}
