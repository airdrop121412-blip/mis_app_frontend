// ═══════════════════════════════════════════════════════════════
// API functions — Report endpoints
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type {
  ApiResponse,
  ReportDataset,
  ReportFilters,
  LoginRequest,
  LoginResponse,
} from '../types/api';

// ── Helper: build query string from filters ───────────────────
function buildParams(filters: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = String(value);
    }
  }
  return params;
}

// ── Report endpoints ──────────────────────────────────────────

/** GET /api/v1/reports/{slug} — fetch report data as JSON */
export async function fetchReport(
  slug: string,
  filters: ReportFilters = {},
): Promise<{ dataset: ReportDataset; meta: Record<string, unknown> }> {
  const response = await apiClient.get<ApiResponse<ReportDataset>>(
    `/reports/${slug}`,
    { params: buildParams(filters) },
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Failed to fetch report');
  }
  return { dataset: body.data, meta: body.meta ?? {} };
}

/** GET /api/v1/reports/{slug}/export — download CSV */
export function buildExportUrl(
  slug: string,
  filters: ReportFilters = {},
): string {
  const params = new URLSearchParams(buildParams({ ...filters, format: 'csv' }));
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  return `${base}/reports/${slug}/export?${params.toString()}`;
}

// ── Auth endpoints ────────────────────────────────────────────

/** POST /api/v1/auth/login */
export async function login(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/auth/login',
    credentials,
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Login failed');
  }
  return body.data;
}

/** POST /api/v1/auth/logout */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
  localStorage.removeItem('auth_token');
}

/** GET /api/v1/auth/me */
export async function fetchCurrentUser(): Promise<LoginResponse['user']> {
  const response = await apiClient.get<ApiResponse<LoginResponse['user']>>(
    '/auth/me',
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Not authenticated');
  }
  return body.data;
}
