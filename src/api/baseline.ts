// ═══════════════════════════════════════════════════════════════
// Baseline API — cross-EP data browser (backend: BaselineController)
// Each endpoint is project-scoped, searchable (`q`), and paginated.
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';

export interface BaselinePagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface BaselineList<T> {
  items: T[];
  pagination: BaselinePagination;
}

export interface BaselineParams {
  project_id?: number;
  q?: string;
  status?: string;
  has_gps?: boolean;
  per_page?: number;
  page?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

// Rows carry flat `hh_id`/`ep_id`/`ep_name` context from the owning EP plus
// master-name strings; the generic shape keeps column rendering simple.
export type BaselineRow = Record<string, unknown> & {
  ep_id?: string | null;
  ep_name?: string | null;
  hh_id?: string | number | null;
};

function unwrap<T>(response: { data: ApiResponse<T[]> }): BaselineList<T> {
  const body = response.data;
  if (!body.success) {
    throw new Error((body.message as string | undefined) ?? 'Request failed');
  }
  const meta = body.meta as Record<string, BaselinePagination> | undefined;
  return {
    items: (body.data as T[] | undefined) ?? [],
    pagination: meta?.pagination ?? { current_page: 1, per_page: 25, total: 0, last_page: 0 },
  };
}

export async function baselineEps(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap<BaselineRow>(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/eps', { params }));
}

export async function baselineFamilyMembers(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/family-members', { params }));
}

export async function baselineLands(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/lands', { params }));
}

export async function baselineCrops(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/crops', { params }));
}

export async function baselineInfrastructures(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/infrastructures', { params }));
}

export async function baselineTrees(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/trees', { params }));
}

export async function baselineTenants(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/tenants', { params }));
}

export async function baselineBusinesses(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/businesses', { params }));
}

export async function baselineWorkers(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/workers', { params }));
}

export async function baselineGps(params: BaselineParams = {}): Promise<BaselineList<BaselineRow>> {
  return unwrap<BaselineRow>(await apiClient.get<ApiResponse<BaselineRow[]>>('/baseline/gps', { params }));
}