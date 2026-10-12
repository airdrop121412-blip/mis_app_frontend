// ═══════════════════════════════════════════════════════════════
// EP ID Codes API — configurable codes used by the EP ID builder
// Source: backend routes/api/v1.php (ep-id-codes section)
// All responses follow the ApiResponse envelope.
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';

// ── EP ID code type ────────────────────────────────────────────
export interface EpidCode {
  epid_code_id: number;
  category: string;
  name: string;
  code: string;
  district_id: number | null;
  project_id: number | null;
  sort_order: number;
  is_active: boolean;
  remarks: string | null;
}

export interface EpidCodeInput {
  category: string;
  name: string;
  code: string;
  district_id?: number | null;
  project_id?: number | null;
  sort_order?: number;
  is_active?: boolean;
  remarks?: string | null;
}

export type EpidCodeCategoryMap = Record<string, string>;

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}

/** GET /api/v1/ep-id-codes — list codes, optional project_id/category/q filter.
 *  Pass includeGlobal=true to also receive shared global codes, where
 *  project-specific rows override same-named global rows (no duplicates). */
export async function fetchEpidCodes(
  projectId?: number | null,
  category?: string,
  q?: string,
  includeGlobal = false,
): Promise<EpidCode[]> {
  const response = await apiClient.get<ApiResponse<EpidCode[]>>('/ep-id-codes', {
    params: {
      project_id: projectId ?? undefined,
      category: category || undefined,
      q: q || undefined,
      include_global: includeGlobal || undefined,
    },
  });
  return unwrap(response);
}

/** GET /api/v1/ep-id-codes/categories — supported categories (key → label) */
export async function fetchEpidCodeCategories(): Promise<EpidCodeCategoryMap> {
  const response = await apiClient.get<ApiResponse<EpidCodeCategoryMap>>('/ep-id-codes/categories');
  return unwrap(response);
}

/** POST /api/v1/ep-id-codes — create a code entry */
export async function createEpidCode(data: EpidCodeInput): Promise<EpidCode> {
  const response = await apiClient.post<ApiResponse<EpidCode>>('/ep-id-codes', data);
  return unwrap(response);
}

/** PUT /api/v1/ep-id-codes/{id} — update a code entry */
export async function updateEpidCode(id: number, data: Partial<EpidCodeInput>): Promise<EpidCode> {
  const response = await apiClient.put<ApiResponse<EpidCode>>(`/ep-id-codes/${id}`, data);
  return unwrap(response);
}

/** DELETE /api/v1/ep-id-codes/{id} — delete a code entry */
export async function deleteEpidCode(id: number): Promise<null> {
  const response = await apiClient.delete<ApiResponse<null>>(`/ep-id-codes/${id}`);
  return unwrap(response);
}