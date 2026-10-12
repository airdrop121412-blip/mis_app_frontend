// ═══════════════════════════════════════════════════════════════
// Formatting utilities — Money, date, boolean, percentage
// ═══════════════════════════════════════════════════════════════

import type { ColumnType } from '../types/api';

/**
 * Format a money string for display.
 * Preserves 2-decimal precision from the backend.
 */
export function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a date value (string or ISO datetime) to YYYY-MM-DD.
 */
export function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const str = String(value);
  // Handle ISO datetime: "2025-06-15T00:00:00.000000Z"
  if (str.includes('T')) {
    return str.split('T')[0]!;
  }
  return str;
}

/**
 * Format an integer for display with locale separators.
 */
export function formatInteger(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-BD').format(num);
}

/**
 * Format a number (decimal) for display.
 */
export function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

/**
 * Format a percentage value.
 */
export function formatPercentage(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value);
  return `${num.toFixed(2)}%`;
}

/**
 * Format a boolean (0/1) value.
 */
export function formatBoolean(value: unknown): string {
  return value ? 'Yes' : 'No';
}

/**
 * Generic cell formatter based on column type.
 * This is the primary formatting entry point for table cells.
 */
export function formatCell(value: unknown, type: ColumnType): string {
  switch (type) {
    case 'money':
      return formatMoney(value);
    case 'date':
      return formatDate(value);
    case 'integer':
      return formatInteger(value);
    case 'number':
      return formatNumber(value);
    case 'percentage':
      return formatPercentage(value);
    case 'boolean':
      return formatBoolean(value);
    case 'string':
    default:
      return value === null || value === undefined ? '—' : String(value);
  }
}

/**
 * Format a summary value based on heuristic key names.
 * Money keys typically contain: amount, assessed, compensation, grant, paid, outstanding
 */
export function formatSummaryValue(
  key: string,
  value: unknown,
): string {
  if (value === null || value === undefined) return '—';

  const moneyKeys = [
    'amount', 'assessed', 'compensation', 'grant', 'paid',
    'outstanding', 'total',
  ];
  const isMoney = moneyKeys.some((k) => key.toLowerCase().includes(k));

  if (isMoney) return formatMoney(value);
  return formatInteger(value);
}

/**
 * Format an ISO timestamp to a human-readable datetime string.
 * Example: "2025-06-15T14:30:00.000000Z" → "15 Jun 2025, 2:30 PM"
 */
export function formatTimestamp(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  try {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return String(value);
  }
}
