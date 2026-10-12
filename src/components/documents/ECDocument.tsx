// ═══════════════════════════════════════════════════════════════
// ECDocument — Entitlement Card (EC) document
// Landscape A4 matching the official DWASA EC format:
//   Header → EP Personal Info → 18 compensation categories table
//   (Compensation | Quantity | DC Amount | PAVC Amount | Net Payable)
//   → Gross/Previous/Net totals → Grand Total + In Words
//
// No fabricated financial values: DC Amount = assessed_amount (the
// DC-based assessment, per COMPENSATION-RULES.md §2.1 Access lineage);
// PAVC Amount has no backend source and renders blank.
// ═══════════════════════════════════════════════════════════════

import type { EpFileData } from '../../types/ep';
import type { EcFullData, Compensation } from '../../types/ec';
import { COMPENSATION_LABELS, COMPENSATION_CATEGORY_ORDER, canonicalCategory } from '../../types/ec';
import { numberToWords } from '../../utils/numberToWords';
import { DocumentHeader } from './DocumentHeader';
import { PersonalInfoSection } from './PersonalInfoSection';

interface ECDocumentProps {
  data: EpFileData;
}

export function ECDocument({ data }: ECDocumentProps) {
  const ec = (data.ec ?? {}) as unknown as EcFullData;
  const compensations = (ec.compensations ?? []) as Compensation[];
  const lineItems = (ec.line_items ?? []) as Array<{ category: string; assessed_amount: string }>;

  // Build canonical-category → compensation map (legacy codes canonicalized)
  const compMap = new Map<string, Compensation>();
  for (const c of compensations) {
    compMap.set(canonicalCategory(c.category), c);
  }

  // Build canonical-category → assessed amount map from line items
  const assessedMap = new Map<string, string>();
  for (const li of lineItems) {
    assessedMap.set(canonicalCategory(li.category), li.assessed_amount);
  }

  // Totals (backend-authoritative)
  const grossTotal = compensations.reduce(
    (sum, c) => sum + (parseFloat(c.approved_amount) || 0),
    0
  );
  const assessedTotal = lineItems.reduce(
    (sum, li) => sum + (parseFloat(li.assessed_amount) || 0),
    0
  );

  // Previous payment = sum of vouchers (backend-authoritative)
  const vouchers = (ec.vouchers ?? []) as Array<Record<string, unknown>>;
  const previousTotal = vouchers.reduce(
    (sum, v) => sum + (String(v.payment_status ?? '') === 'PAID'
      ? (parseFloat(String(v.approved_amount ?? 0)) || 0)
      : 0),
    0
  );
  const previousByCategory = new Map<string, number>();
  for (const voucher of vouchers) {
    if (String(voucher.payment_status ?? '') !== 'PAID') continue;
    const lines = (voucher.voucher_compensations as Array<Record<string, unknown>> | undefined) ?? [];
    for (const line of lines) {
      const compensation = line.compensation as Record<string, unknown> | undefined;
      const category = canonicalCategory(String(compensation?.category ?? ''));
      if (category) previousByCategory.set(category, (previousByCategory.get(category) ?? 0) + (Number(line.amount) || 0));
    }
  }

  const netPayable = grossTotal - previousTotal;

  return (
    <>
      <DocumentHeader
        docTitle="Entitlement Card (EC)"
        projectName={data.project ?? ''}
        epType="[TITLED/NON-TITLED EP]"
      />

      {/* EP Personal Info */}
      <PersonalInfoSection ep={data} />

      {/* Compensation Table — 18 official categories */}
      <div className="doc-section-title">Compensation Details:</div>
      <table className="comp-table">
        <thead>
          <tr>
            <th className="cat-col">Compensation</th>
            <th className="text-center">Quantity (Dec.)</th>
            <th className="amt-col">DC Amount</th>
            <th className="amt-col">Previous Compensation</th>
            <th className="amt-col">Net Payable</th>
          </tr>
          <tr>
            <th />
            <th />
            <th className="amt-col">(Amounts in BDT.)</th>
            <th className="amt-col">(Amounts in BDT.)</th>
            <th className="amt-col">(Amounts in BDT.)</th>
          </tr>
        </thead>
        <tbody>
          {COMPENSATION_CATEGORY_ORDER.map((cat) => {
            const comp = compMap.get(cat);
            const assessed = assessedMap.get(cat);
            const approved = comp ? parseFloat(comp.approved_amount) || 0 : 0;

            return (
              <tr key={cat}>
                <td>{COMPENSATION_LABELS[cat] ?? cat}</td>
                <td className="text-center">—</td>
                <td className="amt-col">{assessed ? Number(assessed).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>
                <td className="amt-col">{previousByCategory.get(cat) ? previousByCategory.get(cat)!.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>
                <td className="amt-col">{approved ? approved.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}</td>
              </tr>
            );
          })}

          {/* Totals — Gross Payable | Previous Payment | Net Payable */}
          <tr className="total-row">
            <td><strong>Gross Payable</strong></td>
            <td />
            <td className="amt-col"><strong>{assessedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
            <td className="amt-col" />
            <td className="amt-col"><strong>{grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
          </tr>
          <tr className="total-row">
            <td><strong>Previous Payment</strong></td>
            <td />
            <td className="amt-col" />
            <td className="amt-col" />
            <td className="amt-col"><strong>{previousTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
          </tr>
          <tr className="grand-total">
            <td colSpan={4}><strong>Grand Total =</strong></td>
            <td className="amt-col"><strong>{netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
          </tr>
        </tbody>
      </table>

      {/* In Words */}
      <div className="doc-in-words">
        <strong>In Word:</strong> {numberToWords(netPayable)}
      </div>

      {/* Signatures */}
      <div className="doc-signatures">
        <div className="sig-block">
          <div className="sig-line">Prepared By</div>
        </div>
        <div className="sig-block">
          <div className="sig-line">Verified By</div>
        </div>
        <div className="sig-block">
          <div className="sig-line">Approved By</div>
        </div>
      </div>
    </>
  );
}