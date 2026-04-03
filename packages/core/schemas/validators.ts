import { z } from 'zod';
import * as schemas from './index.js';

/**
 * Schema Validators
 * 
 * Centralized validation functions for all TasteKit schemas.
 */

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: z.ZodError };

export function validateConstitution(data: unknown): ValidationResult<schemas.ConstitutionV1> {
  const result = schemas.ConstitutionV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateGuardrails(data: unknown): ValidationResult<schemas.GuardrailsV1> {
  const result = schemas.GuardrailsV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateMemory(data: unknown): ValidationResult<schemas.MemoryV1> {
  const result = schemas.MemoryV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateBindings(data: unknown): ValidationResult<schemas.BindingsV1> {
  const result = schemas.BindingsV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateTrust(data: unknown): ValidationResult<schemas.TrustV1> {
  const result = schemas.TrustV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validatePlaybook(data: unknown): ValidationResult<schemas.PlaybookV1> {
  const result = schemas.PlaybookV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateEvalPack(data: unknown): ValidationResult<schemas.EvalPackV1> {
  const result = schemas.EvalPackV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateSkillsManifest(data: unknown): ValidationResult<schemas.SkillsManifestV1> {
  const result = schemas.SkillsManifestV1Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateTraceEvent(data: unknown): ValidationResult<schemas.TraceEvent> {
  const result = schemas.TraceEventSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateWorkspaceConfig(data: unknown): ValidationResult<schemas.WorkspaceConfig> {
  const result = schemas.WorkspaceConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateSessionState(data: unknown): ValidationResult<schemas.SessionState> {
  const result = schemas.SessionStateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
