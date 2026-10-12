// ═══════════════════════════════════════════════════════════════
// Correction Audit API — Field-level data correction with audit trail
// Phase 4B-9
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type {
  CorrectionRecord,
  CorrectionHistoryEntry,
  CorrectionCreateRequest,
  CorrectionEpRow,
  CorrectionHistoryRow,
} from '../types/validation';

/** Pagination metadata returned alongside list endpoints. */
export interface CorrectionPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

function unwrapPagination(meta: unknown): CorrectionPagination {
  const pagination = (meta as { pagination?: CorrectionPagination } | null)?.pagination;

  return pagination ?? { current_page: 1, per_page: 25, total: 0, last_page: 1 };
}

/** GET /api/v1/corrections — list corrections for a project */
export async function fetchCorrections(
  projectId: number,
  params: { entity_type?: string; q?: string; per_page?: number } = {},
): Promise<{ items: CorrectionRecord[]; pagination: Record<string, number> }> {
  const response = await apiClient.get<ApiResponse<CorrectionRecord[]>>(
    '/corrections',
    { params: { project_id: projectId, ...params } },
  );
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message ?? 'Failed to fetch corrections');
  }
  return {
    items: body.data ?? [],
    pagination:
      (body.meta as unknown as { pagination?: Record<string, number> } | null)?.pagination ?? {},
  };
}

/** POST /api/v1/corrections — apply a data correction */
export async function createCorrection(
  request: CorrectionCreateRequest,
): Promise<{
  entity_type: string;
  entity_id: number;
  affected_person_id: number | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  financial_impact: boolean;
}> {
  const response = await apiClient.post<ApiResponse<{
    entity_type: string;
    entity_id: number;
    affected_person_id: number | null;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    financial_impact: boolean;
  }>>('/corrections', request);
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Correction failed');
  }
  return body.data;
}

/** GET /api/v1/corrections/{entityType}/{entityId}/history — correction history */
export async function fetchCorrectionHistory(
  entityType: string,
  entityId: number,
): Promise<CorrectionHistoryEntry[]> {
  const response = await apiClient.get<ApiResponse<CorrectionHistoryEntry[]>>(
    `/corrections/${entityType}/${entityId}/history`,
  );
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message ?? 'Failed to fetch correction history');
  }
  return body.data ?? [];
}

/**
 * GET /api/v1/corrections/eps
 *
 * APPROVED EPs available for admin correction. PAID EPs are excluded by the
 * backend because they follow the additional-payment workflow instead.
 */
export async function listCorrectionEps(params: {
  project_id?: number;
  q?: string;
  district_id?: number;
  upazila_id?: number;
  page?: number;
  per_page?: number;
} = {}): Promise<{ items: CorrectionEpRow[]; pagination: CorrectionPagination }> {
  const response = await apiClient.get<ApiResponse<CorrectionEpRow[]>>('/corrections/eps', {
    params,
  });
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message ?? 'Failed to fetch approved EPs');
  }

  return { items: body.data ?? [], pagination: unwrapPagination(body.meta) };
}

/**
 * GET /api/v1/corrections/history
 *
 * Correction history for a project with HH ID, cause, change type and the
 * acting user (email when present, otherwise name / username).
 */
export async function listCorrectionHistory(params: {
  project_id?: number;
  entity_type?: string;
  change_type?: string;
  q?: string;
  page?: number;
  per_page?: number;
} = {}): Promise<{ items: CorrectionHistoryRow[]; pagination: CorrectionPagination }> {
  const response = await apiClient.get<ApiResponse<CorrectionHistoryRow[]>>('/corrections/history', {
    params,
  });
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message ?? 'Failed to fetch correction history');
  }

  return { items: body.data ?? [], pagination: unwrapPagination(body.meta) };
}

/**
 * DELETE /api/v1/corrections/eps/{ep}
 *
 * Admin-only hard delete of an APPROVED EP. The reason is stored in the
 * Correction History before the record is removed.
 */
export async function deleteCorrectionEp(
  affectedPersonId: number,
  correctionReason: string,
): Promise<void> {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/corrections/eps/${affectedPersonId}`,
    { data: { correction_reason: correctionReason } },
  );
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message ?? 'Correction delete failed');
  }
}
