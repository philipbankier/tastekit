/**
 * TasteKit Adapter Interface
 * 
 * Common interface for all runtime adapters.
 */

import { MemoryV1 } from '@tastekit/core';

export interface ExportOpts {
  includeSkills?: boolean;
  includePlaybooks?: boolean;
  format?: string;
}

export interface InstallOpts {
  overwrite?: boolean;
  validate?: boolean;
}

export interface SimOpts {
  noSideEffects?: boolean;
  dryRun?: boolean;
}

export interface SimResult {
  success: boolean;
  outputs: any;
  trace: any[];
}

export interface MappedMemoryPolicy {
  runtimeSpecific: any;
  notes?: string;
}

export interface TraceEvent {
  timestamp: string;
  type: string;
  data: any;
}

/**
 * TasteKit Adapter Interface
 * 
 * All adapters must implement this interface.
 */
export interface TasteKitAdapter {
  /** Adapter identifier */
  id: string;
  
  /** Adapter version */
  version: string;
  
  /**
   * Detect if this adapter can handle the target runtime
   */
  detect(target: string): Promise<boolean>;
  
  /**
   * Export TasteKit artifacts to adapter format
   */
  export(profilePath: string, outDir: string, opts: ExportOpts): Promise<void>;
  
  /**
   * Install adapter-specific configuration into target runtime
   */
  install(outDir: string, target: string, opts: InstallOpts): Promise<void>;
  
  /**
   * Run simulation (optional)
   */
  runSimulation?(skillId: string, opts: SimOpts): Promise<SimResult>;
  
  /**
   * Map memory policy to runtime-specific format (optional)
   */
  mapMemoryPolicy?(policy: MemoryV1): Promise<MappedMemoryPolicy>;
  
  /**
   * Emit trace event (optional)
   */
  emitTrace?(event: TraceEvent): Promise<void>;
}
