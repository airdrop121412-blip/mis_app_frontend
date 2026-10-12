// ═══════════════════════════════════════════════════════════════
// VoucherDocument — Debit Voucher document
// Landscape A4 matching the official DWASA Voucher format:
//   Header "Debit Voucher" → EP Personal Info → compensation
//   categories with Amount (Taka) → Grand Total + In Words
//
// IMPORTANT: Amounts are derived ONLY from the voucher's attached
// compensations (backend-authoritative). No recalculation in React.
// ═══════════════════════════════════════════════════════════════

import type { EpFileData, Tenant, Worker } from '../../types/ep';
import type { VoucherFullData, VoucherCompensation } from '../../types/voucher';
import { COMPENSATION_LABELS, COMPENSATION_CATEGORY_ORDER, canonicalCategory } from '../../types/ec';
import { fetchGrantAssistance, type GrantAssistanceRow } from '../../api/grantAssistance';
import { fetchRateFile, type RateFileLandRow } from '../../api/rateFile';
import { numberToWords } from '../../utils/numberToWords';
import { useQuery } from '@tanstack/react-query';

interface VoucherDocumentProps {
  data: EpFileData;
  voucher: VoucherFullData;
  tenant?: Tenant | null;
  worker?: Worker | null;
  showActions?: boolean;
  pageNumber?: number;
  pageCount?: number;
}

const STYLES = `
.voucher-doc{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:17px}
.voucher-doc *{box-sizing:border-box}
.voucher-doc{margin:0;background:#e9e9e9;min-height:100vh;padding:18px}
.voucher-doc .actions{display:flex;justify-content:flex-end;gap:8px;width:min(100%,297mm);margin:0 auto 10px}
.voucher-doc .action{border:1px solid #555;background:#111;color:#fff;border-radius:3px;padding:7px 14px;font-size:10pt;cursor:pointer}
.voucher-doc .action.secondary{background:#fff;color:#111}
.voucher-doc .paper{width:min(100%,1464px);height:1024px;min-height:0;margin:0 auto;background:#fff;padding:28px 92px 34px;overflow:hidden;box-shadow:0 2px 18px rgba(0,0,0,.12)}
.voucher-doc .header{position:relative;height:94px}
.voucher-doc .ep-type{position:absolute;left:24px;top:0;font-family:"Courier New",monospace;font-size:17px;color:#333;letter-spacing:.4px}
.voucher-doc .header-center{position:absolute;left:24%;width:52%;top:0;text-align:center;font-weight:700;line-height:1.38;font-size:16px;white-space:nowrap;overflow:hidden}
.voucher-doc .voucher-title{display:inline-flex;min-width:150px;height:30px;margin-top:7px;padding:4px 48px 5px;align-items:center;justify-content:center;background:#050505;color:#fff;font-size:18px;font-weight:400;line-height:1}
.voucher-doc .date-page{position:absolute;right:0;top:0;text-align:right;color:#444;font-size:17px;line-height:1.82}
.voucher-doc .top-rule{border-top:1px solid #cfcfcf;height:0}
.voucher-doc .personal{padding:6px 18px 7px}
.voucher-doc .personal-grid{display:grid;grid-template-columns:1.1fr 1.1fr 1fr 1fr;column-gap:18px;row-gap:7px;align-items:baseline;font-size:15px;line-height:1.1}
.voucher-doc .personal-title{font-size:15px;font-weight:700;margin-right:20px}
.voucher-doc .field{min-width:0;overflow-wrap:anywhere;word-break:break-word}
.voucher-doc .field-label{font-weight:400}
.voucher-doc .field-value{margin-left:6px}
.voucher-doc .ownership{text-align:right}
.voucher-doc .amount-note{text-align:right;font-size:15px;margin-top:4px;padding-right:18px}
.voucher-doc .amount-heading{text-align:right;font-weight:700;font-size:15px;padding:3px 36px 4px 0}
.voucher-doc .items{margin:0 18px;border-top:2px dotted #777}
.voucher-doc .item{display:grid;grid-template-columns:minmax(0,1fr) 190px;min-height:23px;align-items:center;border-top:2px dotted #777;padding:2px 0;font-size:15px;line-height:1.05}
.voucher-doc .item:first-child{border-top:0}
.voucher-doc .amount{text-align:right;padding-right:28px;font-variant-numeric:tabular-nums;white-space:nowrap}
.voucher-doc .total-row{display:grid;grid-template-columns:minmax(0,1fr) 190px;margin:0 18px;padding:5px 0 0;font-size:16px;font-weight:700}
.voucher-doc .total-label{text-align:right;padding-right:15px}
.voucher-doc .in-word{margin:2px 40px 0;padding-top:0;font-size:15px;line-height:1.1}
.voucher-doc .signatures{display:grid;grid-template-columns:repeat(4,1fr);column-gap:85px;margin-top:72px;padding:0 2px}
.voucher-doc .signature-line{border-top:2px dotted #777;width:100%;height:7px}
.voucher-doc .signature:first-child{text-align:left}
.voucher-doc .signature:first-child .signature-line{width:100%}
.voucher-doc .name{font-size:14px;text-align:center}
.voucher-doc .signature:first-child .name{text-align:left}
@page{size:A4 landscape;margin:0}
@media(max-width:900px){.voucher-doc{padding:0;background:#fff}.voucher-doc .paper{width:100%;height:auto;min-height:100vh;box-shadow:none;padding:5vw 5vw 4vw}.voucher-doc .personal-grid{font-size:9px}.voucher-doc .personal-title{font-size:10px}.voucher-doc .item,.voucher-doc .in-word,.voucher-doc .name{font-size:9px}.voucher-doc .amount-note,.voucher-doc .amount-title{font-size:9px}.voucher-doc .header-center{font-size:9px}.voucher-doc .voucher-title{font-size:11px}.voucher-doc .date-page,.voucher-doc .ep-type{font-size:8px}}
@media print{
  html,body{margin:0!important;padding:0!important;background:#fff!important}
  .voucher-page>.topbar,.voucher-page>.rule{display:none!important}
  .voucher-bulk-management,.voucher-search-panel,.bulk-voucher-meta{display:none!important}
  .bulk-voucher-print{display:block!important;margin:0!important;padding:0!important}
  .bulk-voucher-print-item{margin:0!important;padding:0!important;break-after:page;page-break-after:always}
  .bulk-voucher-print-item:last-child{break-after:avoid-page;page-break-after:avoid}
  .voucher-doc{width:297mm;height:210mm;background:#fff;padding:0;min-height:0;overflow:hidden;break-after:page;page-break-after:always}
  .voucher-doc .actions{display:none}
  .voucher-doc:last-child{break-after:avoid-page;page-break-after:avoid}
  .voucher-doc .paper{width:297mm;height:210mm;max-width:none;box-shadow:none;margin:0;overflow:hidden}
}
`;

function nameOf(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string') {
    return (value as { name: string }).name;
  }
  return String(value);
}

function money(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVoucherDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function VoucherDocument({
  data,
  voucher,
  tenant = null,
  worker = null,
  showActions = true,
  pageNumber = 1,
  pageCount = 1,
}: VoucherDocumentProps) {
  const lines = (voucher.voucher_compensations ?? []) as VoucherCompensation[];

  // Build canonical category → amount map from attached compensations (authoritative)
  const amountMap = new Map<string, number>();
  for (const line of lines) {
    const category = canonicalCategory(line.compensation?.category ?? 'OTHER');
    const amount = parseFloat(line.amount) || 0;
    amountMap.set(category, (amountMap.get(category) ?? 0) + amount);
  }
  // A voucher is an ADDITIONAL PAYMENT voucher only when it contains a
  // compensation registered as second-payment (payment_cycle 2) in the
  // database. The EP's PAID status alone must NEVER imply additional.
  const isAdditionalPayment = lines.some(
    (line) => line.compensation?.payment_cycle === 2
  );
  const previousCompensation = ((data.ec as { vouchers?: Array<Record<string, unknown>> } | null | undefined)?.vouchers ?? [])
    .filter((item) => item.voucher_id !== voucher.voucher_id)
    .filter((item) => isAdditionalPayment
      ? item.payment_status === 'PAID' || item.approved_by != null
      : item.payment_status === 'PAID')
    .reduce((sum, item) => sum + (Number(item.approved_amount) || 0), 0);
  const isTenantCard = tenant !== null;
  const isWorkerCard = worker !== null;
  const grantsQuery = useQuery({
    queryKey: ['voucher-grant-assistance', data.project_id],
    queryFn: () => fetchGrantAssistance(data.project_id ?? null),
    staleTime: 10 * 60_000,
    enabled: isTenantCard || isWorkerCard,
  });
  const grants = new Map<string, GrantAssistanceRow>(
    (grantsQuery.data ?? []).map((grant) => [grant.grant_code, grant]),
  );
  const landRatesQuery = useQuery({
    queryKey: ['voucher-land-rates', data.project_id],
    queryFn: () => fetchRateFile('land', data.project_id ?? null),
    staleTime: 10 * 60_000,
    enabled: isTenantCard || isWorkerCard,
  });
  const landRates = (landRatesQuery.data ?? []) as RateFileLandRow[];
  const epTypeLabel = isTenantCard
    ? 'TENANT EP'
    : isWorkerCard
      ? 'WAGE LABOUR EP'
      : /non[\s-]*titled/i.test(String(data.ownership ?? ''))
        ? 'NON-TITLED EP'
        : 'TITLED EP';
  const visibleCategories = isTenantCard
    ? new Set(['SGfT', 'CfB'])
    : isWorkerCard
      ? new Set(['GfWL'])
      : null;

  const epId = tenant?.ep_id ?? worker?.ep_id ?? data.ep_id ?? '—';
  const nid = tenant?.nid_number ?? worker?.nid_number ?? data.nid_number ?? '—';
  const name = tenant?.name ?? worker?.name ?? data.name ?? '—';
  const fatherName = tenant?.father_name ?? worker?.father_name ?? data.father_name ?? '—';
  const sex = nameOf(tenant?.gender ?? worker?.gender ?? data.gender) || '—';
  const mobile = tenant?.mobile ?? worker?.mobile ?? data.mobile ?? '—';
  const occupation = nameOf(tenant?.occupation ?? worker?.occupation ?? data.occupation) || '—';
  const mouza = tenant?.mouza ?? worker?.mouza ?? data.mouza ?? '—';
  const union = tenant?.union_name ?? worker?.union_name ?? data.union_name ?? '—';
  const upazila = nameOf(tenant?.upazila ?? worker?.upazila ?? data.upazila) || '—';
  const ownership = isTenantCard ? 'Tenant' : isWorkerCard ? 'Wage Labour' : data.ownership ?? '—';
  const yearlyIncome = tenant
    ? tenant.annual_income
    : worker
      ? (parseFloat(worker.monthly_income || '0') * 12).toString()
      : data.yearly_income;
  const grandTotal = visibleCategories
    ? Array.from(visibleCategories).reduce((sum, category) =>
      sum + childCompensation(category), 0)
    : parseFloat(voucher.approved_amount) || 0;
  const printVoucher = () => window.print();

  function childCompensation(category: string): number {
    if (!isTenantCard && !isWorkerCard) return amountMap.get(category) ?? 0;
    const grant = grants.get(category);
    if (!grant?.is_active) return 0;

    if (category === 'GfWL' && !isWorkerCard) return 0;
    if (category === 'SGfT' && !isTenantCard) return 0;
    if (category === 'CfB') {
      if (!isTenantCard) return 0;
      const tenantRunsBusiness = (data.businesses ?? []).some((business) =>
        String(business.ownership_code ?? '').toUpperCase() === 'TENANT'
        && Number(business.tenant_id) === Number(tenant?.tenant_id),
      );
      if (!tenantRunsBusiness) return 0;
      const districtId = tenant?.district_id ?? data.district_id ?? null;
      const scoped = grant.rates.filter((rate) => rate.is_active);
      const district = scoped.find((rate) => rate.district_id != null && rate.district_id === districtId);
      const catchAll = scoped.find((rate) => rate.district_id == null);
      return Number(district?.amount ?? catchAll?.amount ?? grant.amount) || 0;
    }

    const amount = Number(grant.amount) || 0;
    const percentage = Number(grant.percentage) || 0;
    const multiplier = Number(grant.multiplier) || 0;
    const decimalPerUnit: Record<number, number> = {
      1: 1, 2: 33, 3: 1.6529, 4: 1, 5: 1 / 435.6, 6: 1 / 40.4686,
      7: 100 / 0.4047, 8: 100, 9: 1,
    };
    const pavc = (data.lands ?? []).reduce((sum, land) => {
      const quantity = Number(land.land_area ?? 0) * (decimalPerUnit[Number(land.land_area_unit_id)] ?? 1);
      const category = String(land.land_type_other || land.land_type || '').trim();
      const rate = landRates.find((item) =>
        item.is_active
        && String(item.mouza).trim() === String(land.mouza ?? '').trim()
        && String(item.land_category).trim() === category,
      );
      return sum + quantity * (Number(rate?.pavc_rate) || 0);
    }, 0);
    if (grant.calculation_type === 'FIXED') return amount;
    if (grant.calculation_type === 'PERCENTAGE') return pavc * percentage / 100;
    if (grant.calculation_type === 'FIXED_AND_PERCENTAGE') return amount + pavc * percentage / 100;
    return multiplier;
  }

  return (
    <div className="voucher-doc">
      <style>{STYLES}</style>
      {showActions && <div className="actions">
        <button type="button" className="action secondary" onClick={printVoucher}>Print</button>
        <button type="button" className="action" onClick={printVoucher}>Download PDF</button>
      </div>}
      <div className="paper">
        <div className="header">
          <div className="ep-type">[{epTypeLabel}]</div>
          <div className="header-center">
            <div>Government of the People&apos;s Republic of Bangladesh</div>
            <div>{data.project ?? 'Project Name'}</div>
            <div className="voucher-title">Debit Voucher</div>
          </div>
          <div className="date-page">
            <div>{formatVoucherDate(voucher.voucher_date)}</div>
            <div>Page {pageNumber} of {pageCount}</div>
          </div>
        </div>
        <div className="top-rule" />
        <div className="personal">
          <div className="personal-grid">
            <div className="personal-title">1. EP&apos;s Personal Information:</div>
            <div className="field">EP ID <span className="field-value">{epId}</span></div>
            <div className="field">NID No: <span className="field-value">{nid}</span></div>
            <div className="field ownership">Ownership: <span className="field-value">{ownership}</span></div>
            <div className="field">Name: <span className="field-value">{name}</span></div>
            <div className="field">F/H Name: <span className="field-value">{fatherName}</span></div>
            <div className="field">Sex: <span className="field-value">{sex}</span></div>
            <div className="field">Yearly Income (BDT): <span className="field-value">{yearlyIncome ?? '—'}</span></div>
            <div className="field">Occupation: <span className="field-value">{occupation}</span></div>
            <div className="field">Mouza: <span className="field-value">{mouza}</span></div>
            <div className="field">Union: <span className="field-value">{union}</span></div>
            <div className="field">Upazila: <span className="field-value">{upazila}</span></div>
            <div />
            <div />
            <div className="field">District: <span className="field-value">{nameOf(data.district) || '—'}</span></div>
            <div className="field">Mobile No: <span className="field-value">{mobile}</span></div>
          </div>
        </div>
        <div className="amount-note">(Amounts in BDT.)</div>
        <div className="amount-heading">Amount (Taka)</div>
        <div className="items">
          {/* Additional vouchers always show the complete 1–19 compensation
              list (zero-value rows kept), then row 19 Previous Payment
              at the end. */}
          {COMPENSATION_CATEGORY_ORDER.map((cat, index) => {
            const amount = visibleCategories && !visibleCategories.has(cat) ? 0 : childCompensation(cat);
            const label = cat === 'CfF'
              ? 'Compensation for Fruits (CfF)'
              : COMPENSATION_LABELS[cat] ?? cat;
            return <div className="item" key={cat}><div>{index + 1}. {label}</div><div className="amount">{money(amount)}</div></div>;
          })}
          {/* Previous Payment section: ONLY on additional-payment vouchers.
              The original voucher must never show it. The amount is the
              previously paid/approved voucher total from the database,
              not a recalculation of the current record. */}
          {isAdditionalPayment && (
            <div className="item" key="previous-compensation">
              <div>19. Previous Payment</div>
              <div className="amount">{money(previousCompensation)}</div>
            </div>
          )}
        </div>
        <div className="total-row"><div className="total-label">Grand Total =</div><div className="amount">{money(grandTotal)}</div></div>
        <div className="in-word"><strong>In Word:</strong>&nbsp;{numberToWords(grandTotal)}</div>
        <div className="signatures">
          <div className="signature"><div className="signature-line" /><div className="name">Area Manager, KMC</div></div>
          <div className="signature"><div className="signature-line" /><div className="name" /></div>
          <div className="signature"><div className="signature-line" /><div className="name" /></div>
          <div className="signature"><div className="signature-line" /><div className="name" /></div>
        </div>
      </div>
    </div>
  );
}