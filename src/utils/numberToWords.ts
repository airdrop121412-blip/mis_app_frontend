// ═══════════════════════════════════════════════════════════════
// numberToWords — Convert a numeric amount to English words
// Uses the Indian numbering system (Lac/Crore) to match the
// official DWASA reference documents, e.g.
//   1013097.80 → "Ten Lac Thirteen Thousand Ninety Seven Taka
//                 And Eighty Paisa only."
// Used for "Amount in Words" on Voucher / EC documents.
// ═══════════════════════════════════════════════════════════════

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

/** Convert an integer (0–999) to words */
function threeDigits(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }
  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ONES[remainder] ?? '');
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      parts.push((TENS[tens] ?? '') + (ones > 0 ? `-${ONES[ones]}` : ''));
    }
  }
  return parts.join(' ');
}

/** Convert 0–99 to words */
function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? '';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (TENS[tens] ?? '') + (ones > 0 ? `-${ONES[ones]}` : '');
}

/**
 * Convert a non-negative integer to words using the Indian numbering
 * system (Crore / Lac / Thousand), e.g. 1013097 → "Ten Lac Thirteen
 * Thousand Ninety Seven".
 */
function indianIntegerToWords(n: number): string {
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lac`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  return parts.join(' ');
}

/**
 * Convert a decimal amount to words matching the reference format:
 *   1013097.80 → "Ten Lac Thirteen Thousand Ninety Seven Taka And Eighty Paisa only."
 *   15000.00   → "Fifteen Thousand Taka only."
 */
export function numberToWords(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Zero Taka only.';

  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value);

  const taka = Math.floor(num);
  const paisa = Math.round((num - taka) * 100);

  const takaWords = indianIntegerToWords(taka);
  let result = `${takaWords} Taka`;

  if (paisa > 0) {
    result += ` And ${indianIntegerToWords(paisa)} Paisa`;
  }

  return `${result} only.`;
}