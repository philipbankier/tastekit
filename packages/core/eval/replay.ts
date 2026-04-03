import { TraceEvent } from '../schemas/trace.js';
import { ConstitutionV1 } from '../schemas/constitution.js';
import { TraceReader } from '../tracing/reader.js';

/**
 * Replay
 * 
 * Replays traces against updated profiles for regression testing.
 */

export interface ReplayResult {
  trace_path: string;
  profile_version: string;
  violations: Array<{
    event: TraceEvent;
    violation_type: string;
    reason: string;
  }>;
  passed: boolean;
}

export class Replay {
  private reader: TraceReader;
  
  constructor() {
    this.reader = new TraceReader();
  }
  
  replayTrace(tracePath: string, constitution: ConstitutionV1): ReplayResult {
    const events = this.reader.readTrace(tracePath);
    const violations: ReplayResult['violations'] = [];
    
    // Check each event against current constitution
    for (const event of events) {
      // Check for forbidden phrases in outputs
      if (event.event_type === 'tool_result' && event.data?.output) {
        const output = JSON.stringify(event.data.output).toLowerCase();
        
        for (const phrase of constitution.tone.forbidden_phrases) {
          if (output.includes(phrase.toLowerCase())) {
            violations.push({
              event,
              violation_type: 'forbidden_phrase',
              reason: `Output contains forbidden phrase: "${phrase}"`,
            });
          }
        }
      }
      
      // Check for principle violations
      if (event.event_type === 'error' && event.principle_refs) {
        violations.push({
          event,
          violation_type: 'principle_violation',
          reason: `Error occurred while following principles: ${event.principle_refs.join(', ')}`,
        });
      }
    }
    
    return {
      trace_path: tracePath,
      profile_version: constitution.generator_version,
      violations,
      passed: violations.length === 0,
    };
  }
}
