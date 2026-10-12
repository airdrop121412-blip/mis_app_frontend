// ═══════════════════════════════════════════════════════════════
// Grant and Assistance API — resettlement grant config
// Source: backend routes/api/v1.php (grant-assistance section)
// These items drive the EC File compensation for the LDC / DA / SRC /
// HTG / HCG / CAVHH / AVFHH / MTG / SGfT / GfWL heads.
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';

export type GrantCalculationType = 'FIXED' | 'PERCENTAGE' | 'FIXED_AND_PERCENTAGE' | 'MULTIPLIER';
export type GrantPercentageBase = 'PAVC' | 'RV_STRUCTURE';

/** Per-scope rate record for a grant item:
 *  DA uses district/upazila/land-category × multiplier,
 *  CfB uses district × amount (one-time BDT amount per district). */
export interface GrantAssistanceRateRow {
  id: number;
  district_id: number | null;
  district: string | null;
  upazila_id: number | null;
  upazila: string | null;
  land_category: string | null;
  amount: string;
  multiplier: string;
  is_active: boolean;
}

export interface GrantAssistanceRateInput {
  district_id: number | null;
  upazila_id: number | null;
  land_category: string | null;
  amount?: number | string;
  multiplier: number | string;
  is_active?: boolean;
}

export interface GrantAssistanceRow {
  id: number;
  project_id: number | null;
  grant_code: string;
  grant_name: string;
  calculation_type: GrantCalculationType;
  amount: string;
  percentage: string;
  percentage_base: GrantPercentageBase | null;
  category: string | null;
  multiplier: string;
  is_active: boolean;
  rates: GrantAssistanceRateRow[];
}

export interface GrantAssistanceInput {
  project_id?: number | null;
  grant_name: string;
  calculation_type: GrantCalculationType;
  amount: number | string;
  percentage: number | string;
  percentage_base: GrantPercentageBase | null;
  category: string | null;
  multiplier: number | string;
  is_active?: boolean;
  rates?: GrantAssistanceRateInput[];
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}

/** GET /api/v1/grant-assistance — list grant items, optionally scoped to project_id */
export async function fetchGrantAssistance(
  projectId?: number | null,
): Promise<GrantAssistanceRow[]> {
  const response = await apiClient.get<ApiResponse<GrantAssistanceRow[]>>(`/grant-assistance`, {
    params: { project_id: projectId ?? undefined },
  });
  return unwrap(response);
}

/** PUT /api/v1/grant-assistance/{grant_code} — update one item */
export async function updateGrantAssistance(
  grantCode: string,
  data: GrantAssistanceInput,
): Promise<GrantAssistanceRow> {
  const response = await apiClient.put<ApiResponse<GrantAssistanceRow>>(
    `/grant-assistance/${grantCode}`,
    data,
  );
  return unwrap(response);
}