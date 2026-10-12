// ═══════════════════════════════════════════════════════════════
// EPFileDocument — Complete EP File matching the reference format
// Sections: Personal Info, Land, Structure, Tree, Previous Payment
// ═══════════════════════════════════════════════════════════════

import type { EpFileData, Land, Infrastructure, Tree } from '../../types/ep';
import { DocumentHeader } from './DocumentHeader';
import { PersonalInfoSection } from './PersonalInfoSection';

interface EPFileDocumentProps {
  data: EpFileData;
}

export function EPFileDocument({ data }: EPFileDocumentProps) {
  const lands = data.lands ?? [];
  const structures = data.infrastructures ?? [];
  const trees = data.trees ?? [];

  // Mouza from the first land record (reference shows it in section 1)
  const mouza = lands.find((l) => l.mouza)?.mouza ?? '';

  return (
    <>
      <DocumentHeader
        docTitle="Entitled Person's (EP) File"
        projectName={data.project ?? ''}
        epType="[TITLED/NON-TITLED EP]"
      />

      {/* Section 1: Personal Information */}
      <PersonalInfoSection ep={data} mouza={mouza} />

      {/* Section 2: Land Information */}
      <LandSection lands={lands} />

      {/* Section 3: Structure Information */}
      <StructureSection structures={structures} />

      {/* Section 4: Tree Information */}
      <TreeSection trees={trees} />

      {/* Section 5: Previous Payment Information */}
      <PreviousPaymentSection data={data} />

      {/* Signatures */}
      <div className="doc-signatures">
        <div className="sig-block" />
        <div className="sig-block">
          <div className="sig-line">Area Manager, KMC</div>
        </div>
        <div className="sig-block" />
      </div>
    </>
  );
}

// ── Land Section ─────────────────────────────────────────────

function LandSection({ lands }: { lands: Land[] }) {
  const totalArea = lands.reduce((sum, l) => sum + (parseFloat(String(l.land_area)) || 0), 0);

  return (
    <>
      <div className="doc-section-title">2. Land Information:</div>
      {lands.length === 0 ? (
        <div className="doc-empty">No land records.</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th>Mouza</th>
              <th>Category of Land</th>
              <th className="text-right">Area/Quantity (Decimal)</th>
              <th className="text-right">DC Rate (In Decimal)</th>
              <th className="text-right">PAVC Rate (In Decimal)</th>
            </tr>
          </thead>
          <tbody>
            {lands.map((land) => (
              <tr key={land.land_id}>
                <td>{land.mouza ?? '—'}</td>
                <td>{land.land_use_type ?? land.land_type ?? '—'}</td>
                <td className="text-right">{land.land_area}</td>
                <td className="text-right">—</td>
                <td className="text-right">—</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={2}><strong>Total Land =</strong></td>
              <td className="text-right"><strong>{totalArea.toFixed(4)}</strong></td>
              <td className="text-right" />
              <td className="text-right" />
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}

// ── Structure Section ────────────────────────────────────────

function StructureSection({ structures }: { structures: Infrastructure[] }) {
  // Group by type: Type | Use | Unit | Quantity | Number (Count)
  const grouped = new Map<string, { type: string; use: string; qty: number; count: number }>();
  for (const s of structures) {
    const type = s.infrastructure_type ?? 'Unknown';
    if (!grouped.has(type)) {
      grouped.set(type, { type, use: s.usage_type ?? '', qty: 0, count: 0 });
    }
    const g = grouped.get(type)!;
    g.qty += parseFloat(String(s.area_sqft ?? 0)) || 0;
    g.count += 1;
  }
  const totalCount = structures.length;

  return (
    <>
      <div className="doc-section-title">3. Structure Information:</div>
      {structures.length === 0 ? (
        <div className="doc-empty">No structure records.</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Use of Structure</th>
              <th>Unit</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Number (Count)</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.values()).map((g) => (
              <tr key={g.type}>
                <td>{g.type}</td>
                <td>{g.use || '—'}</td>
                <td>SFT</td>
                <td className="text-right">{g.qty ? g.qty.toLocaleString('en-US') : '—'}</td>
                <td className="text-right">{g.count}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={4}><strong>Total Number of Structures =</strong></td>
              <td className="text-right"><strong>{totalCount}</strong></td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}

// ── Tree Section ─────────────────────────────────────────────

// Map backend tree_age_category → reference columns (Big→Large, Plant→Sapling)
const AGE_COLUMNS: Array<{ key: string; label: string; match: string[] }> = [
  { key: 'large', label: 'Large', match: ['Big', 'Large'] },
  { key: 'medium', label: 'Medium', match: ['Medium'] },
  { key: 'sapling', label: 'Sapling', match: ['Plant', 'Sapling'] },
  { key: 'small', label: 'Small', match: ['Small'] },
];

function TreeSection({ trees }: { trees: Tree[] }) {
  // Group by category (tree_type), break down by age category
  const grouped = new Map<string, { large: number; medium: number; sapling: number; small: number; total: number }>();
  let grandTotal = 0;

  // Map a backend age category to a reference column key
  const ageKey = (age: string): 'large' | 'medium' | 'sapling' | 'small' => {
    for (const col of AGE_COLUMNS) {
      if (col.match.some((m) => age.includes(m))) return col.key as 'large' | 'medium' | 'sapling' | 'small';
    }
    return 'small'; // unknown age → count under Small
  };

  for (const tree of trees) {
    const cat = tree.tree_type ?? 'Unknown';
    if (!grouped.has(cat)) {
      grouped.set(cat, { large: 0, medium: 0, sapling: 0, small: 0, total: 0 });
    }
    const g = grouped.get(cat)!;
    const qty = tree.quantity ?? 0;
    const age = tree.tree_age_category ?? '';
    g[ageKey(age)] += qty;
    g.total += qty;
    grandTotal += qty;
  }

  return (
    <>
      <div className="doc-section-title">4. Tree Information:</div>
      {trees.length === 0 ? (
        <div className="doc-empty">No tree records.</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th>Category of Tree</th>
              <th className="text-center">Large</th>
              <th className="text-center">Medium</th>
              <th className="text-center">Sapling</th>
              <th className="text-center">Small</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.entries()).map(([cat, counts]) => (
              <tr key={cat}>
                <td>{cat}</td>
                <td className="text-center">{counts.large || ''}</td>
                <td className="text-center">{counts.medium || ''}</td>
                <td className="text-center">{counts.sapling || ''}</td>
                <td className="text-center">{counts.small || ''}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td><strong>Total =</strong></td>
              <td colSpan={3} />
              <td className="text-center"><strong>{grandTotal}</strong></td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}

// ── Previous Payment Section ─────────────────────────────────

function PreviousPaymentSection({ data }: { data: EpFileData }) {
  const ec = data.ec as Record<string, unknown> | null | undefined;
  const vouchers = ((ec?.vouchers as Array<Record<string, unknown>> | undefined) ?? [])
    .filter((voucher) => String(voucher.payment_status ?? '') === 'PAID');

  return (
    <>
      <div className="doc-section-title">5. Previous Payment Information:</div>
      {vouchers.length === 0 ? (
        <div className="doc-empty">No previous payments recorded.</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th>Voucher #</th>
              <th>Date</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v, i) => (
              <tr key={i}>
                <td>{String(v.voucher_number ?? '—')}</td>
                <td>{String(v.voucher_date ?? '—')}</td>
                <td className="text-right">{String(v.approved_amount ?? '0')}</td>
                <td>{String(v.payment_status ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="doc-note"><strong>Previous Payment:</strong> {vouchers.length > 0 ? 'Yes' : 'No'}</div>
    </>
  );
}
