import { appendFileSync } from 'fs';
import { join } from 'path';
import { TraceEvent } from '../schemas/trace.js';
import { hashObject } from '../utils/hash.js';
import { ensureDir, resolveTracesPath } from '../utils/filesystem.js';

/**
 * Tracer
 *
 * Writes trace events to JSONL files.
 */

export class Tracer {
  private runId: string;
  private tracePath: string;

  constructor(workspacePath: string, runId?: string) {
    this.runId = runId || crypto.randomUUID();

    const tracesDir = resolveTracesPath(workspacePath);
    ensureDir(tracesDir);

    this.tracePath = join(tracesDir, `${this.runId}.trace.v1.jsonl`);
  }
  
  getRunId(): string {
    return this.runId;
  }
  
  trace(event: Omit<TraceEvent, 'schema_version' | 'run_id' | 'timestamp'>): void {
    const fullEvent: TraceEvent = {
      schema_version: 'trace_event.v1',
      run_id: this.runId,
      timestamp: new Date().toISOString(),
      ...event,
    };
    
    // Write as JSONL (one event per line)
    const line = JSON.stringify(fullEvent) + '\n';
    appendFileSync(this.tracePath, line);
  }
  
  tracePlan(data: any): void {
    this.trace({
      actor: 'agent',
      event_type: 'plan',
      data,
    });
  }
  
  traceThink(data: any, skillId?: string): void {
    this.trace({
      actor: 'agent',
      event_type: 'think',
      skill_id: skillId,
      data,
    });
  }
  
  traceToolCall(
    toolRef: string,
    input: any,
    skillId?: string,
    stepId?: string
  ): void {
    this.trace({
      actor: 'agent',
      event_type: 'tool_call',
      tool_ref: toolRef,
      skill_id: skillId,
      step_id: stepId,
      input_hash: hashObject(input),
      data: { input },
    });
  }
  
  traceToolResult(
    toolRef: string,
    output: any,
    skillId?: string,
    stepId?: string
  ): void {
    this.trace({
      actor: 'agent',
      event_type: 'tool_result',
      tool_ref: toolRef,
      skill_id: skillId,
      step_id: stepId,
      output_hash: hashObject(output),
      data: { output },
    });
  }
  
  traceApprovalRequest(
    data: any,
    riskScore?: number
  ): void {
    this.trace({
      actor: 'agent',
      event_type: 'approval_requested',
      risk_score: riskScore,
      data,
    });
  }
  
  traceApprovalResponse(approved: boolean, reason?: string): void {
    this.trace({
      actor: 'user',
      event_type: 'approval_response',
      data: { approved, reason },
    });
  }
  
  traceArtifactWritten(artifactPath: string, hash: string): void {
    this.trace({
      actor: 'agent',
      event_type: 'artifact_written',
      output_hash: hash,
      data: { path: artifactPath },
    });
  }
  
  traceError(error: Error, context?: any): void {
    this.trace({
      actor: 'system',
      event_type: 'error',
      error: error.message,
      data: {
        stack: error.stack,
        context,
      },
    });
  }
}
