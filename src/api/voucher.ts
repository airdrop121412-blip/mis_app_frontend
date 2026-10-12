// ═══════════════════════════════════════════════════════════════
// Voucher API — CRUD + status transitions + payments
// Backend: VoucherController + PaymentController (nested under EP)
// ═══════════════════════════════════════════════════════════════

import apiClient from './client';
import type { Voucher, VoucherFullData, Payment, PaymentMethod, AdditionalPendingItem } from '../types/voucher';

const BASE = '/ep';

// ── Voucher CRUD ────────────────────────────────────────────

/** GET /api/v1/ep/:epId/voucher — list vouchers for an EP's EC */
export async function listVouchers(epId: number): Promise<Voucher[]> {
  const { data } = await apiClient.get(`${BASE}/${epId}/voucher`);
  return data.data ?? data;
}

/** GET /api/v1/ep/:epId/voucher/:voucherId — full voucher with relations */
export async function fetchVoucher(epId: number, voucherId: number): Promise<VoucherFullData> {
  const { data } = await apiClient.get(`${BASE}/${epId}/voucher/${voucherId}`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/voucher — create voucher from approved compensations */
export async function createVoucher(epId: number): Promise<Voucher> {
  const { data } = await apiClient.post(`${BASE}/${epId}/voucher`);
  return data.data ?? data;
}

/** PUT /api/v1/ep/:epId/voucher/:voucherId — update (PENDING only) */
export async function updateVoucher(
  epId: number,
  voucherId: number,
  payload: { voucher_date?: string; remarks?: string }
): Promise<Voucher> {
  const { data } = await apiClient.put(`${BASE}/${epId}/voucher/${voucherId}`, payload);
  return data.data ?? data;
}

/** DELETE /api/v1/ep/:epId/voucher/:voucherId — delete (PENDING, no payments) */
export async function deleteVoucher(epId: number, voucherId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${epId}/voucher/${voucherId}`);
}

// ── Voucher status transitions ──────────────────────────────

/** POST /api/v1/ep/:epId/voucher/:voucherId/verify */
export async function verifyVoucher(epId: number, voucherId: number): Promise<Voucher> {
  const { data } = await apiClient.post(`${BASE}/${epId}/voucher/${voucherId}/verify`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/voucher/:voucherId/approve — paymentDate used for the auto-recorded disbursement */
export async function approveVoucher(
  epId: number,
  voucherId: number,
  paymentDate?: string
): Promise<Voucher> {
  const { data } = await apiClient.post(
    `${BASE}/${epId}/voucher/${voucherId}/approve`,
    paymentDate ? { payment_date: paymentDate } : {}
  );
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/voucher/:voucherId/cancel */
export async function cancelVoucher(epId: number, voucherId: number): Promise<Voucher> {
  const { data } = await apiClient.post(`${BASE}/${epId}/voucher/${voucherId}/cancel`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/voucher/:voucherId/compensation — attach approved compensation */
export async function attachCompensation(
  epId: number,
  voucherId: number,
  compensationId: number
): Promise<Voucher> {
  const { data } = await apiClient.post(`${BASE}/${epId}/voucher/${voucherId}/compensation`, {
    compensation_id: compensationId,
  });
  return data.data ?? data;
}

// ── Payments (nested under Voucher) ─────────────────────────

/** GET /api/v1/ep/:epId/voucher/:voucherId/payment */
export async function listPayments(epId: number, voucherId: number): Promise<Payment[]> {
  const { data } = await apiClient.get(`${BASE}/${epId}/voucher/${voucherId}/payment`);
  return data.data ?? data;
}

/** POST /api/v1/ep/:epId/voucher/:voucherId/payment — record payment */
export async function recordPayment(
  epId: number,
  voucherId: number,
  payload: {
    payment_method_id: number;
    amount: string | number;
    payment_reference?: string;
    payment_date: string;
    remarks?: string;
  }
): Promise<Payment> {
  const { data } = await apiClient.post(`${BASE}/${epId}/voucher/${voucherId}/payment`, payload);
  return data.data ?? data;
}

/** DELETE /api/v1/ep/:epId/voucher/:voucherId/payment/:paymentId — void payment */
export async function voidPayment(epId: number, voucherId: number, paymentId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${epId}/voucher/${voucherId}/payment/${paymentId}`);
}

// ── Payment methods master ──────────────────────────────────

/** GET /api/v1/masters/payment-method */
export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await apiClient.get('/masters/payment-method');
  return data.data ?? data;
}

// ── Additional-payment worklist ─────────────────────────────

/**
 * GET /api/v1/ep/additional-payment-pending — PAID EPs that already have new
 * loss data (land, crop, structure, tree, business) waiting for a 2nd
 * voucher, each with a persistent "Additional Payment" remark.
 */
export async function fetchAdditionalPending(params?: {
  project_id?: number;
  q?: string;
}): Promise<AdditionalPendingItem[]> {
  const { data } = await apiClient.get(`${BASE}/additional-payment-pending`, { params });
  return data.data ?? data;
}