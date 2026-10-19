// ═══════════════════════════════════════════════════════════════
// EP Import API — admin-only Excel bulk upload
// Source: backend routes/api/v1.php (imports section, permission: ep.import)
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import apiClient, { buildError } from './client';
import type { ApiResponse } from '../types/api';

export interface EpImportFieldError {
  [field: string]: string[];
}

export interface EpImportRowError {
  row: number;
  sheet?: string;
  name: string;
  errors: EpImportFieldError;
}

export interface EpImportSheetResult {
  sheet: string;
  name: string;
  total: number;
  imported: number;
  skipped: number;
  missing_columns: string[];
  unknown_columns: string[];
  errors: EpImportRowError[];
}

export interface EpImportResult {
  total: number;
  imported: number;
  skipped: number;
  imported_ids: number[];
  missing_columns: string[];
  unknown_columns: string[];
  errors: EpImportRowError[];
  sheets: Record<string, EpImportSheetResult>;
}

/** GET /imports/ep/template — download the .xlsx format workbook */
export async function downloadEpImportTemplate(): Promise<Blob> {
  const response = await apiClient.get<Blob>('/imports/ep/template', {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * The template endpoint replies with a Blob, so a JSON error envelope arrives
 * as a Blob too. Unwrap it so the caller can show the real reason.
 */
apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const body = JSON.parse(text) as ApiResponse<unknown>;
        const errs = body.errors as { code?: string[] } & Record<string, unknown> | null;
        return Promise.reject(
          buildError(
            body.message ?? error.message,
            errs?.code?.[0] ?? 'UNKNOWN_ERROR',
            error.response?.status ?? 0,
            errs ?? undefined,
          ),
        );
      } catch {
        /* not JSON — fall through to the generic error below */
      }
    }
    return Promise.reject(error);
  },
);

/** POST /imports/ep — upload an .xlsx and import rows into the project */
export async function importEpFile(file: File, projectId: number): Promise<EpImportResult> {
  const form = new FormData();
  form.append('project_id', String(projectId));
  form.append('file', file);

  const response = await apiClient.post<ApiResponse<EpImportResult>>('/imports/ep', form);

  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Import failed');
  }
  return body.data;
}

// ── Step-by-step import (table by table) ──────────────────────────

/** The 10 import steps in order, matching backend SHEET_NAMES keys. */
export const EP_IMPORT_STEPS = [
  { key: 'ep',         label: 'EP আপলোড (EP)',          en: 'EP Data',           description: 'Upload EP (Affected Person) data first. This creates DRAFT EPs that child tables link to.' },
  { key: 'family',     label: 'পরিবার (Family)',        en: 'Family Information', description: 'Upload household family members linked to each EP.' },
  { key: 'land',       label: 'আবাদি জমি (Land)',       en: 'Land',              description: 'Upload land/parcel records linked to each EP.' },
  { key: 'crop',       label: 'ফসল (Crop)',            en: 'Crop',              description: 'Upload crop records linked to land parcels.' },
  { key: 'structure',  label: 'কাঠামো (Structure)',      en: 'Structure',         description: 'Upload infrastructure/structure records.' },
  { key: 'tree',       label: 'গাছ (Tree)',            en: 'Tree',              description: 'Upload tree/vegetation records.' },
  { key: 'tenant',     label: 'ভাড়াটিয়া (Tenant)',      en: 'Tenant',            description: 'Upload tenant records linked to structures.' },
  { key: 'business',   label: 'ব্যবসা (Business)',      en: 'Business',          description: 'Upload business records, optionally linked to tenants.' },
  { key: 'worker',     label: 'শ্রমিক (Worker)',        en: 'Worker',            description: 'Upload wage labour records linked to EPs or businesses.' },
  { key: 'gps',        label: 'GPS তথ্য (GPS)',         en: 'GPS Location',      description: 'Upload GPS coordinates for each EP.' },
] as const;

export interface EpStepImportResult {
  step: string;
  sheet_name: string;
  total: number;
  imported: number;
  skipped: number;
  missing_columns: string[];
  unknown_columns: string[];
  errors: EpImportRowError[];
  imported_ids: number[];
  // Chunked-import continuation fields
  upload_key: string;
  total_rows: number;
  offset: number;
  next_offset: number | null;
  batch_size: number;
  done: boolean;
}

/** POST /imports/ep/step — upload a single sheet and import it */
export async function importEpStep(
  file: File,
  projectId: number,
  step: string,
  uploadKey?: string | null,
  offset = 0,
  batchSize = 25,
): Promise<EpStepImportResult> {
  const form = new FormData();
  form.append('project_id', String(projectId));
  form.append('step', step);
  form.append('file', file);
  if (uploadKey) form.append('upload_key', uploadKey);
  form.append('offset', String(offset));
  form.append('batch_size', String(batchSize));

  const response = await apiClient.post<ApiResponse<EpStepImportResult>>('/imports/ep/step', form);

  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Step import failed');
  }
  return body.data;
}

/** GET /imports/ep/step/{step}/count?project_id=X — count existing DRAFT rows for a step */
export async function countEpStep(step: string, projectId: number): Promise<{ count: number }> {
  const response = await apiClient.get<ApiResponse<{ count: number }>>(
    `/imports/ep/step/${step}/count`,
    { params: { project_id: projectId } },
  );

  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Count failed');
  }
  return body.data;
}

/** DELETE /imports/ep/step/{step}?project_id=X — clear all DRAFT data for a step */
export async function clearEpStep(step: string, projectId: number): Promise<{ deleted: number }> {
  const response = await apiClient.delete<ApiResponse<{ deleted: number }>>(
    `/imports/ep/step/${step}`,
    { params: { project_id: projectId } },
  );

  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Clear failed');
  }
  return body.data;
}