// ═══════════════════════════════════════════════════════════════
// EPICAD API — CRUD + print operations
// Backend: EpicadController (nested under EP resource)
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { Epicad } from '../types/epicad';

const BASE = '/ep';

/** GET /api/v1/ep/:epId/epicad — show existing EPICAD */
export async function fetchEpicad(epId: number): Promise<Epicad> {
  const { data } = await apiClient.get(`${BASE}/${epId}/epicad`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/epicad — create EPICAD (issue card) */
export async function createEpicad(epId: number, remarks?: string): Promise<Epicad> {
  const { data } = await apiClient.post(`${BASE}/${epId}/epicad`, { remarks });
  return data.data ?? data;
}

/** PUT /api/v1/ep/:epicadId/epicad — update EPICAD */
export async function updateEpicad(
  epId: number,
  payload: { issue_date?: string; remarks?: string }
): Promise<Epicad> {
  const { data } = await apiClient.put(`${BASE}/${epId}/epicad`, payload);
  return data.data ?? data;
}

/** DELETE /api/v1/ep/:epId/epicad — delete EPICAD (only if NOT_PRINTED & no EC) */
export async function deleteEpicad(epId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${epId}/epicad`);
}

/** POST /api/v1/ep/:epId/epicad/print — transition print status */
export async function printEpicad(epId: number): Promise<Epicad> {
  const { data } = await apiClient.post(`${BASE}/${epId}/epicad/print`);
  return data.data ?? data;
}

/** GET /api/v1/ep/:epId/epicad-readiness — check if EP is ready for EPICAD */
export async function checkEpicadReadiness(epId: number): Promise<{
  ep_id: number;
  ep_id_code: string | null;
  readable: boolean;
  issues: Array<{ code: string; message: string; severity: string }>;
}> {
  const { data } = await apiClient.get(`/validation/ep/${epId}/epicad-readiness`);
  return data.data ?? data;
}
