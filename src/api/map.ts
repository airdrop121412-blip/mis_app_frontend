// ═══════════════════════════════════════════════════════════════
// Map API — GPS survey points for the EP GPS Location map page
// Source: backend routes/api/v1.php (map section)
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';

export interface GpsSurveyPoint {
  affected_person_id: number;
  ep_id: string | null;
  hh_id: string | null;
  name: string | null;
  father_name: string | null;
  nid_number: string | null;
  mobile: string | null;
  status: string | null;
  district_id: number | null;
  upazila_id: number | null;
  district: string | null;
  upazila: string | null;
  location_source: string | null;
  gps_latitude: string | null;
  gps_longitude: string | null;
  project_id: number;
}

/** GET /api/v1/map/surveys?bbox=minLng,minLat,maxLng,maxLat&project_id= */
export async function getMapSurveys(params: {
  bbox: string;
  project_id?: number;
  status?: string;
}): Promise<GpsSurveyPoint[]> {
  const response = await apiClient.get<ApiResponse<GpsSurveyPoint[]>>('/map/surveys', { params });
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message ?? 'Failed to load GPS surveys');
  }
  return body.data ?? [];
}