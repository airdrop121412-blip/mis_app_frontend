// ═══════════════════════════════════════════════════════════════
// Axios HTTP client — configured for the Laravel Sanctum API
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import type { ApiResponse } from '../types/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: {
    Accept: 'application/json',
  },
});

// ── Request interceptor: attach Bearer token ──────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Multipart uploads must NOT carry an explicit Content-Type — the browser has
  // to append the multipart boundary itself. An instance- or request-level
  // 'application/json' (or a boundary-less 'multipart/form-data') makes PHP see
  // an empty $_FILES, so $request->file('file') returns null.
  const isFormData =
    typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isFormData) {
    // Drop any inherited/overridden content type so axios + the browser set it.
    if (config.headers && typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
      delete (config.headers as Record<string, unknown>)['content-type'];
    }
  } else if (config.data !== undefined) {
    // JSON requests still need the header (the instance default is now unset).
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Content-Type', 'application/json');
    }
  }

  return config;
});

// ── Typed API error ────────────────────────────────────────────
export interface ApiError extends Error {
  code: string;
  status: number;
  errors?: Record<string, unknown>;
}

export function buildError(
  message: string,
  code: string,
  status: number,
  errors?: Record<string, unknown>,
): ApiError {
  const err = new Error(message) as ApiError;
  err.name = 'ApiError';
  err.code = code;
  err.status = status;
  err.errors = errors;
  return err;
}

// ── Response interceptor: unwrap errors ───────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const data = error.response.data as ApiResponse<unknown>;
      if (error.response.status === 401) {
        localStorage.removeItem('auth_token');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(buildError(
        data?.message ?? error.message,
        data?.errors?.code?.[0] ?? 'UNKNOWN_ERROR',
        error.response.status,
        data?.errors ?? undefined,
      ));
    }
    return Promise.reject(buildError('Network error', 'NETWORK_ERROR', 0));
  },
);

export default apiClient;
