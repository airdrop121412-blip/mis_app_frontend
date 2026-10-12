// ═══════════════════════════════════════════════════════════════
// Validation API — Exposes centralized Laravel validation rules
// Phase 4B-9: Frontend MUST NOT duplicate these rules.
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type {
  EpValidationResult,
  ProjectValidationResult,
  ReadinessResult,
  ProjectSummary,
} from '../types/validation';

/** GET /api/v1/validation/ep/{ep} — validate a single EP */
export async function validateEp(epId: number): Promise<EpValidationResult> {
  const response = await apiClient.get<ApiResponse<EpValidationResult>>(
    `/validation/ep/${epId}`,
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Validation failed');
  }
  return body.data;
}

/** GET /api/v1/validation/project/{project}/eps — validate all EPs in a project */
export async function validateProjectEps(
  projectId: number,
): Promise<ProjectValidationResult> {
  const response = await apiClient.get<ApiResponse<ProjectValidationResult>>(
    `/validation/project/${projectId}/eps`,
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Validation failed');
  }
  return body.data;
}

/** GET /api/v1/validation/ep/{ep}/epicad-readiness — EPICAD readiness check */
export async function checkEpicadReadiness(epId: number): Promise<ReadinessResult> {
  const response = await apiClient.get<ApiResponse<ReadinessResult>>(
    `/validation/ep/${epId}/epicad-readiness`,
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Readiness check failed');
  }
  return body.data;
}

/** GET /api/v1/validation/ep/{ep}/ec-readiness — EC readiness check */
export async function checkEcReadiness(epId: number): Promise<ReadinessResult> {
  const response = await apiClient.get<ApiResponse<ReadinessResult>>(
    `/validation/ep/${epId}/ec-readiness`,
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Readiness check failed');
  }
  return body.data;
}

/** GET /api/v1/validation/ep/{ep}/voucher-readiness — Voucher readiness check */
export async function checkVoucherReadiness(epId: number): Promise<ReadinessResult> {
  const response = await apiClient.get<ApiResponse<ReadinessResult>>(
    `/validation/ep/${epId}/voucher-readiness`,
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Readiness check failed');
  }
  return body.data;
}

/** GET /api/v1/validation/project/{project}/summary — project summary */
export async function getProjectValidationSummary(
  projectId: number,
): Promise<ProjectSummary> {
  const response = await apiClient.get<ApiResponse<ProjectSummary>>(
    `/validation/project/${projectId}/summary`,
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Summary failed');
  }
  return body.data;
}
