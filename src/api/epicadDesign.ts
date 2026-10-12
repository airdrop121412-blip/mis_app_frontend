// ═══════════════════════════════════════════════════════════════
// EPICAD Design API — reusable card templates
// Backend: EpicadDesignController /api/v1/epicad-designs
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type { EpicadDesign, EpicadDesignInput } from '../types/epicad';

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}

/** GET /api/v1/epicad-designs?project_id= */
export async function listEpicadDesigns(projectId?: number): Promise<EpicadDesign[]> {
  const response = await apiClient.get<ApiResponse<EpicadDesign[]>>('/epicad-designs', {
    params: projectId ? { project_id: projectId } : undefined,
  });
  return unwrap(response);
}

/** POST /api/v1/epicad-designs */
export async function createEpicadDesign(input: EpicadDesignInput): Promise<EpicadDesign> {
  const response = await apiClient.post<ApiResponse<EpicadDesign>>('/epicad-designs', input);
  return unwrap(response);
}

/** PUT /api/v1/epicad-designs/{id} */
export async function updateEpicadDesign(id: number, input: Partial<EpicadDesignInput>): Promise<EpicadDesign> {
  const response = await apiClient.put<ApiResponse<EpicadDesign>>(`/epicad-designs/${id}`, input);
  return unwrap(response);
}

/** DELETE /api/v1/epicad-designs/{id} */
export async function deleteEpicadDesign(id: number): Promise<void> {
  await apiClient.delete(`/epicad-designs/${id}`);
}

/** POST /api/v1/epicad-designs/{id}/upload — upload .html/.doc/.docx template */
export async function uploadEpicadDesignFile(id: number, file: File): Promise<EpicadDesign> {
  const form = new FormData();
  form.append('design', file);
  // No explicit Content-Type — the client interceptor lets the browser set the
  // multipart boundary (an override here strips it and the file never arrives).
  const response = await apiClient.post<ApiResponse<EpicadDesign>>(`/epicad-designs/${id}/upload`, form);
  return unwrap(response);
}