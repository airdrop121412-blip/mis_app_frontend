// ═══════════════════════════════════════════════════════════════
// Dashboard API — Aggregate statistics for the MIS dashboard
// Phase 4B-9
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';
import type { DashboardStats } from '../types/dashboard';

/** GET /api/v1/dashboard/stats — fetch dashboard statistics */
export async function fetchDashboardStats(
  projectId?: number,
): Promise<DashboardStats> {
  const params: Record<string, string> = {};
  if (projectId) params.project_id = String(projectId);

  const response = await apiClient.get<ApiResponse<DashboardStats>>(
    '/dashboard/stats',
    { params },
  );
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Failed to fetch dashboard stats');
  }
  return body.data;
}
