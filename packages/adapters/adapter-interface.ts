/**
 * TasteKit Adapter Interface
 * 
 * Common interface for all runtime adapters.
 */

import type { MemoryV1, TraceEvent } from '@actrun_ai/tastekit-core';
import type { GeneratorContext } from '@actrun_ai/tastekit-core/generators';

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

export interface SimulationSummary {
  domain: string;
  principleCount: number;
  guardrailCount: number;
  skillCount: number;
  autonomyLevel: number;
  adapters: string[];
}

export interface MappedMemoryPolicy {
  runtimeSpecific: string;
  notes?: string;
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
  runSimulation?(workspace: GeneratorContext, opts?: SimOpts): Promise<SimulationSummary>;
  
  /**
   * Map memory policy to runtime-specific format (optional)
   */
  mapMemoryPolicy?(policy: MemoryV1): Promise<MappedMemoryPolicy>;
  
  /**
   * Emit trace event (optional)
   */
  emitTrace?(events: TraceEvent[], outDir: string): Promise<void>;
}
