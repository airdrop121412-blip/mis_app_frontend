// ═══════════════════════════════════════════════════════════════
// Users & Roles API — Admin → Users / Roles
// Source: backend routes/api/v1.php (users / roles sections)
// All responses follow the ApiResponse envelope.
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { ApiResponse } from '../types/api';

// ── Types ──────────────────────────────────────────────────────
export interface AdminRole {
  role_id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  permissions?: Array<{ permission_id: number; code: string; name: string }>;
}

export interface AdminUser {
  user_id: number;
  username: string;
  full_name: string;
  designation: string | null;
  email: string | null;
  mobile: string | null;
  is_active: boolean;
  roles: AdminRole[];
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface CreateUserInput {
  full_name: string;
  designation?: string | null;
  email?: string | null;
  username: string;
  password?: string;
  password_confirmation?: string;
  is_active?: boolean;
}

export interface UpdateUserInput {
  full_name?: string;
  designation?: string | null;
  email?: string | null;
  mobile?: string | null;
  password?: string;
  password_confirmation?: string;
  is_active?: boolean;
}

export interface CreateUserResult {
  user: AdminUser;
  temp_password: string | null;
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data;
  if (!body.success || body.data === null) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data;
}

/** GET /api/v1/users — list users (paginated) */
export async function fetchUsers(
  params: { q?: string; is_active?: boolean; per_page?: number } = {},
): Promise<Paginated<AdminUser>> {
  const response = await apiClient.get<ApiResponse<Paginated<AdminUser>>>('/users', {
    params: {
      q: params.q || undefined,
      is_active: params.is_active ?? undefined,
      per_page: params.per_page ?? 100,
    },
  });
  return unwrap(response);
}

/** POST /api/v1/users — create a user (admin-set or temp password) */
export async function createUser(data: CreateUserInput): Promise<CreateUserResult> {
  const response = await apiClient.post<ApiResponse<CreateUserResult>>('/users', data);
  return unwrap(response);
}

/** PUT /api/v1/users/{id} — update a user */
export async function updateUser(id: number, data: UpdateUserInput): Promise<AdminUser> {
  const response = await apiClient.put<ApiResponse<AdminUser>>(`/users/${id}`, data);
  return unwrap(response);
}

/** POST /api/v1/users/{id}/assign-role — replace the user's single role */
export async function assignUserRole(id: number, roleId: number): Promise<AdminUser> {
  const response = await apiClient.post<ApiResponse<AdminUser>>(`/users/${id}/assign-role`, {
    role_id: roleId,
  });
  return unwrap(response);
}

/** DELETE /api/v1/users/{id} — remove a user account */
export async function deleteUser(id: number): Promise<null> {
  const response = await apiClient.delete<ApiResponse<null>>(`/users/${id}`);
  return unwrap(response);
}

/** GET /api/v1/roles — list roles with their permissions */
export async function fetchRoles(): Promise<AdminRole[]> {
  const response = await apiClient.get<ApiResponse<AdminRole[]>>('/roles');
  return unwrap(response);
}
