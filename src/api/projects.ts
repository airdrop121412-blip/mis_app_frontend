// ═══════════════════════════════════════════════════════════════
// Projects API — list & create projects
// Source: backend routes/api/v1.php (projects section)
// All responses follow the ApiResponse envelope.
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';

// ── Project type ──────────────────────────────────────────────
export interface Project {
  project_id: number;
  project_code: string;
  name: string;
  phase: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  remarks: string | null;
}

export interface ProjectCreateInput {
  project_code: string;
  name: string;
  phase?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  remarks?: string | null;
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}

/** GET /api/v1/projects — list projects (paginated) */
export async function fetchProjects(): Promise<Project[]> {
  const response = await apiClient.get<ApiResponse<Project[]>>('/projects', {
    params: { per_page: 100, is_active: 1 },
  });
  return unwrap(response);
}

/** POST /api/v1/projects — create a new project */
export async function createProject(data: ProjectCreateInput): Promise<Project> {
  const response = await apiClient.post<ApiResponse<Project>>('/projects', data);
  return unwrap(response);
}

/** DELETE /api/v1/projects/{project} — delete an empty project */
export async function deleteProject(projectId: number): Promise<void> {
  await apiClient.delete(`/projects/${projectId}`);
}