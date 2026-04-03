import { readFileSync } from 'fs';
import { TraceEvent } from '../schemas/trace.js';

/**
 * Trace Reader
 * 
 * Reads and parses trace files.
 */

export class TraceReader {
  readTrace(tracePath: string): TraceEvent[] {
    const content = readFileSync(tracePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    return lines
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line) as TraceEvent);
  }
  
  filterByEventType(events: TraceEvent[], eventType: string): TraceEvent[] {
    return events.filter(e => e.event_type === eventType);
  }
  
  filterBySkill(events: TraceEvent[], skillId: string): TraceEvent[] {
    return events.filter(e => e.skill_id === skillId);
  }
  
  filterByActor(events: TraceEvent[], actor: 'agent' | 'user' | 'system'): TraceEvent[] {
    return events.filter(e => e.actor === actor);
  }
  
  getErrors(events: TraceEvent[]): TraceEvent[] {
    return this.filterByEventType(events, 'error');
  }
  
  getApprovals(events: TraceEvent[]): {
    requests: TraceEvent[];
    responses: TraceEvent[];
  } {
    return {
      requests: this.filterByEventType(events, 'approval_requested'),
      responses: this.filterByEventType(events, 'approval_response'),
    };
  }
}
