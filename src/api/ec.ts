// ═══════════════════════════════════════════════════════════════
// EC API — CRUD + status transitions + line items + compensations
// Backend: EcController + Nested\EcLineItemController + CompensationController
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { Ec, EcLineItem, Compensation } from '../types/ec';

const BASE = '/ep';

// ── EC CRUD ────────────────────────────────────────────────

/** GET /api/v1/ep/:epId/ec */
export async function fetchEc(epId: number): Promise<Ec> {
  const { data } = await apiClient.get(`${BASE}/${epId}/ec`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/ec — create EC (requires EPICAD) */
export async function createEc(epId: number): Promise<Ec> {
  const { data } = await apiClient.post(`${BASE}/${epId}/ec`);
  return data.data ?? data;
}

/** PUT /api/v1/ep/:epId/ec — update EC (DRAFT only) */
export async function updateEc(epId: number, payload: { assessment_date?: string; remarks?: string }): Promise<Ec> {
  const { data } = await apiClient.put(`${BASE}/${epId}/ec`, payload);
  return data.data ?? data;
}

// ── EC Status Transitions ──────────────────────────────────

/** POST /api/v1/ep/:epId/ec/submit */
export async function submitEc(epId: number): Promise<Ec> {
  const { data } = await apiClient.post(`${BASE}/${epId}/ec/submit`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/ec/verify */
export async function verifyEc(epId: number): Promise<Ec> {
  const { data } = await apiClient.post(`${BASE}/${epId}/ec/verify`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/ec/approve */
export async function approveEc(epId: number): Promise<Ec> {
  const { data } = await apiClient.post(`${BASE}/${epId}/ec/approve`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/ec/reject */
export async function rejectEc(epId: number, remarks: string): Promise<Ec> {
  const { data } = await apiClient.post(`${BASE}/${epId}/ec/reject`, { remarks });
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/ec/recalculate — recalc totals from line items */
export async function recalculateEc(epId: number): Promise<Ec> {
  const { data } = await apiClient.post(`${BASE}/${epId}/ec/recalculate`);
  return data.data ?? data;
}

/** GET /api/v1/ep/:epId/ec/history */
export async function fetchEcHistory(epId: number): Promise<Array<Record<string, unknown>>> {
  const { data } = await apiClient.get(`${BASE}/${epId}/ec/history`);
  return data.data ?? data;
}

// ── EC Line Items ──────────────────────────────────────────

/** GET /api/v1/ep/:epId/ec/line-item */
export async function listEcLineItems(epId: number): Promise<EcLineItem[]> {
  const { data } = await apiClient.get(`${BASE}/${epId}/ec/line-item`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/ec/line-item */
export async function createEcLineItem(epId: number, payload: {
  category: string;
  description?: string;
  assessed_amount: string;
  remarks?: string;
}): Promise<EcLineItem> {
  const { data } = await apiClient.post(`${BASE}/${epId}/ec/line-item`, payload);
  return data.data ?? data;
}

/** PUT /api/v1/ep/:epId/ec/line-item/:lineItemId */
export async function updateEcLineItem(epId: number, lineItemId: number, payload: {
  category?: string;
  description?: string;
  assessed_amount?: string;
  remarks?: string;
}): Promise<EcLineItem> {
  const { data } = await apiClient.put(`${BASE}/${epId}/ec/line-item/${lineItemId}`, payload);
  return data.data ?? data;
}

/** DELETE /api/v1/ep/:epId/ec/line-item/:lineItemId */
export async function deleteEcLineItem(epId: number, lineItemId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${epId}/ec/line-item/${lineItemId}`);
}

// ── Compensations ──────────────────────────────────────────

/** GET /api/v1/ep/:epId/compensation */
export async function listCompensations(epId: number): Promise<Compensation[]> {
  const { data } = await apiClient.get(`${BASE}/${epId}/compensation`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/compensation */
export async function createCompensation(epId: number, payload: {
  category: string;
  approved_amount: string;
  remarks?: string;
}): Promise<Compensation> {
  const { data } = await apiClient.post(`${BASE}/${epId}/compensation`, payload);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/compensation/additional */
export async function createAdditionalCompensation(epId: number, payload: {
  category: string;
  approved_amount: string;
  remarks?: string;
}): Promise<Compensation> {
  const { data } = await apiClient.post(`${BASE}/${epId}/compensation/additional`, payload);
  return data.data ?? data;
}

/** PUT /api/v1/ep/:epId/compensation/:compensationId */
export async function updateCompensation(epId: number, compensationId: number, payload: {
  approved_amount?: string;
  remarks?: string;
}): Promise<Compensation> {
  const { data } = await apiClient.put(`${BASE}/${epId}/compensation/${compensationId}`, payload);
  return data.data ?? data;
}

/** DELETE /api/v1/ep/:epId/compensation/:compensationId */
export async function deleteCompensation(epId: number, compensationId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${epId}/compensation/${compensationId}`);
}

/** POST /api/v1/ep/:epId/compensation/:compensationId/approve */
export async function approveCompensation(epId: number, compensationId: number): Promise<Compensation> {
  const { data } = await apiClient.post(`${BASE}/${epId}/compensation/${compensationId}/approve`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/compensation/:compensationId/cancel */
export async function cancelCompensation(epId: number, compensationId: number): Promise<Compensation> {
  const { data } = await apiClient.post(`${BASE}/${epId}/compensation/${compensationId}/cancel`);
  return data.data ?? data;
}
