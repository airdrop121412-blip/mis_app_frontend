// ═══════════════════════════════════════════════════════════════
// Rate File API — EC reference rates for land / structure / tree
// Source: backend routes/api/v1.php (rate-file section)
// Type ∈ 'land' | 'structure' | 'tree'. All responses use the
// ApiResponse envelope.
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';

export type RateFileType = 'land' | 'structure' | 'tree';

export interface RateFileLandRow {
  id: number;
  project_id: number | null;
  mouza: string;
  land_category: string;
  dc_office_rate: string;
  pavc_rate: string;
  is_active: boolean;
}

export interface RateFileStructureRow {
  id: number;
  project_id: number | null;
  district_id: number | null;
  district: string | null;
  upazila_id: number | null;
  upazila: string | null;
  material: string;
  usage_type: string;
  nature: string;
  unit: string;
  rate: string;
  is_active: boolean;
}

export interface RateFileTreeRow {
  id: number;
  project_id: number | null;
  district_id: number | null;
  district: string | null;
  upazila_id: number | null;
  upazila: string | null;
  tree_type: string;
  size: string;
  rate: string;
  is_active: boolean;
}

export type RateFileRow = RateFileLandRow | RateFileStructureRow | RateFileTreeRow;

export interface RateFileLandInput {
  project_id?: number | null;
  mouza: string;
  land_category: string;
  dc_office_rate: number | string;
  pavc_rate: number | string;
  is_active?: boolean;
}

export interface RateFileStructureInput {
  project_id?: number | null;
  district_id?: number | null;
  upazila_id?: number | null;
  material: string;
  usage_type: string;
  nature: string;
  unit: string;
  rate: number | string;
  is_active?: boolean;
}

export interface RateFileTreeInput {
  project_id?: number | null;
  district_id?: number | null;
  upazila_id?: number | null;
  tree_type: string;
  size: string;
  rate: number | string;
  is_active?: boolean;
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}

/** GET /api/v1/rate-file/{type} — list rates for one section, scoped to project_id */
export async function fetchRateFile(
  type: RateFileType,
  projectId?: number | null,
): Promise<RateFileRow[]> {
  const response = await apiClient.get<ApiResponse<RateFileRow[]>>(`/rate-file/${type}`, {
    params: { project_id: projectId ?? undefined },
  });
  return unwrap(response);
}

/** GET /api/v1/rate-file/material-options — unique materials from Entry forms */
export async function fetchMaterialOptions(): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<string[]>>(`/rate-file/material-options`);
  return unwrap(response);
}

/** GET /api/v1/rate-file/usage-type-options — custom usage types from Entry forms */
export async function fetchUsageTypeOptions(): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<string[]>>(`/rate-file/usage-type-options`);
  return unwrap(response);
}

/** GET /api/v1/rate-file/mouza-options — distinct mouzas from Entry land records */
export async function fetchMouzaOptions(): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<string[]>>(`/rate-file/mouza-options`);
  return unwrap(response);
}

/** GET /api/v1/rate-file/land-category-options — custom land types from Entry forms */
export async function fetchLandCategoryOptions(): Promise<string[]> {
  const response = await apiClient.get<ApiResponse<string[]>>(`/rate-file/land-category-options`);
  return unwrap(response);
}

/** POST /api/v1/rate-file/{type} — create a rate entry */
export async function createRateFile(
  type: RateFileType,
  data: RateFileLandInput | RateFileStructureInput | RateFileTreeInput,
): Promise<RateFileRow> {
  const response = await apiClient.post<ApiResponse<RateFileRow>>(`/rate-file/${type}`, data);
  return unwrap(response);
}

/** PUT /api/v1/rate-file/{type}/{id} — update a rate entry */
export async function updateRateFile(
  type: RateFileType,
  id: number,
  data: Partial<RateFileLandInput | RateFileStructureInput | RateFileTreeInput>,
): Promise<RateFileRow> {
  const response = await apiClient.put<ApiResponse<RateFileRow>>(`/rate-file/${type}/${id}`, data);
  return unwrap(response);
}

/** DELETE /api/v1/rate-file/{type}/{id} — delete a rate entry */
export async function deleteRateFile(type: RateFileType, id: number): Promise<null> {
  const response = await apiClient.delete<ApiResponse<null>>(`/rate-file/${type}/${id}`);
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}