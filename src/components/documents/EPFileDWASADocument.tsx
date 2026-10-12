// ═══════════════════════════════════════════════════════════════
// EPFileDWASADocument — Official DWASA EP File (A4 landscape)
// Renders the exact reference format: EP's Personal Information,
// Land, Structure, Tree and Previous Payment sections with the
// DWASA project header and signature block.
// ═══════════════════════════════════════════════════════════════

import type {EpFileData, Land, Infrastructure, Tree, Tenant, Worker} from '../../types/ep';
import { occupationLabel } from '../../utils/occupation';
import '../../styles/documents.css';

const DOC_STYLES = `
.epf-doc{box-sizing:border-box;background:#e9ecef;font-family:Arial,Helvetica,sans-serif;color:#111}
.epf-doc *,.epf-doc *::before,.epf-doc *::after{box-sizing:border-box}
.epf-doc .toolbar{height:58px;background:#173a5e;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 22px;position:sticky;top:0;z-index:5}
.epf-doc .toolbar .tb-title{font-size:15px;font-weight:bold}
.epf-doc .toolbar .tb-actions{display:flex}
.epf-doc .toolbar button{border:0;border-radius:5px;padding:9px 15px;margin-left:6px;cursor:pointer;font-size:14px}
.epf-doc .toolbar .print{background:#fff;color:#173a5e}
.epf-doc .toolbar .close{background:#d9e2ec;color:#173a5e}
.epf-doc .paper{width:100%;max-width:1400px;min-height:980px;margin:24px auto;background:#fff;padding:38px 48px;box-shadow:0 2px 12px #999}
.epf-doc .top{display:flex;justify-content:space-between;font-family:"Courier New",monospace;font-size:14px;color:#444}
.epf-doc .header{text-align:center;font-weight:700;line-height:1.38;margin-top:-2px}
.epf-doc .header .title{display:inline-block;background:#050505;color:#fff;font-weight:400;padding:6px 18px;margin-top:9px}
.epf-doc .rule{border-top:2px solid #777;margin:9px 0 8px}
.epf-doc .section-title{font-size:17px;font-weight:700;margin:8px 0 7px}
.epf-doc .not-found{font-weight:400}
.epf-doc .personal{width:100%;border-collapse:collapse;font-size:15px}
.epf-doc .personal td{padding:5px 8px;vertical-align:top;white-space:nowrap}
.epf-doc .personal .label{font-weight:400}
.epf-doc table.data{width:100%;border-collapse:collapse;font-size:15px}
.epf-doc .data th{font-weight:700;text-decoration:underline;text-align:left;padding:4px 9px}
.epf-doc .data td{padding:5px 9px}
.epf-doc .data .right{text-align:right}
.epf-doc .data th.right{text-align:right}
.epf-doc .data th.num{text-align:center}
.epf-doc .total{border-top:1px solid #ccc;font-weight:700}
.epf-doc .narrow{width:64%}
.epf-doc .structure th,.epf-doc .structure td{padding:6px 9px}
.epf-doc .trees{width:52%}
.epf-doc .trees th,.epf-doc .trees td{text-align:left;padding:6px 9px}
.epf-doc .trees .num{text-align:center}
.epf-doc .signature{display:flex;justify-content:space-between;margin-top:120px;font-size:14px}
.epf-doc .signature .line{width:165px;border-top:2px dotted #777;padding-top:3px}
.epf-doc .page-footer{margin-top:30px;text-align:right;color:#555;font-size:12px}
@media(max-width:1450px){.epf-doc .paper{width:96%;padding:28px}.epf-doc .personal td{white-space:normal}}
@media print{
  @page{size:A4 landscape;margin:10mm}
  .epf-doc{background:#fff}
  .epf-doc .toolbar{display:none!important}
  .epf-doc .paper{width:100%;min-height:auto;margin:0;padding:7mm 9mm;box-shadow:none}
  .epf-doc .page-footer{display:block}
}
`;

interface EPFileDWASADocumentProps {
    data: EpFileData;
    /** Name of the active (currently selected) project shown in the header */
    projectName?: string;
    /**
     * When set, the document is rendered for a Tenant EP (typed a Tenant EP
     * ID). Section 1 uses the tenant's own record and section 3 lists the
     * structure the tenant occupies (Sl No from the Tenant table). Land, Tree
     * and Previous Payment sections are shown as "Not Found".
     */
    tenant?: Tenant | null;
    /**
     * When set, the document is rendered for a Wage Labour EP (typed a Wage
     * Labour EP ID). Section 1 uses the worker's own record; Land, Structure,
     * Tree and Previous Payment sections are shown as "Not Found".
     */
    worker?: Worker | null;
}

// Map a backend age category to the reference tree columns.
const AGE_MAP: Array<{ key: 'large' | 'medium' | 'small' | 'sapling'; label: string; match: string[] }> = [
    {key: 'large', label: 'Large', match: ['Big', 'Large']},
    {key: 'medium', label: 'Medium', match: ['Medium']},
    {key: 'small', label: 'Small', match: ['Small']},
    {key: 'sapling', label: 'Sapling', match: ['Plant', 'Sapling']},
];

function fmtArea(v: string | number | null | undefined): string {
    const n = parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n.toFixed(4) : '—';
}

function fmtNum(v: string | number | null | undefined, maxFrac = 0): string {
    const n = parseFloat(String(v ?? ''));
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('en-IN', {maximumFractionDigits: maxFrac});
}

// The file-data endpoint serializes nested relations as { <id>, name }
// objects; this resolves them back to their display name (strings pass through).
function nameOf(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
        const name = (v as { name?: unknown }).name;
        return typeof name === 'string' ? name : '';
    }
    return String(v);
}

// Structure "Category" (structure_material) — when the master value is the
// generic "Other", print the manually typed description instead.
function catLabel(s: Infrastructure): string {
    const raw = nameOf(s.structure_material);
    if (/other/i.test(raw) && s.structure_material_other) {
        return String(s.structure_material_other);
    }
    return raw;
}

/** Structure Usage Type — resolve "Other" → usage_type_other */
function useLabel(s: Infrastructure): string {
    const raw = nameOf(s.usage_type);
    if (/other/i.test(raw) && s.usage_type_other) {
        return String(s.usage_type_other);
    }
    return raw;
}

/** Tree Type — resolve "Other" → tree_type_other */
function treeTypeLabel(t: Tree): string {
    const raw = nameOf(t.tree_type);
    if (/other/i.test(raw) && t.tree_type_other) {
        return String(t.tree_type_other);
    }
    return raw;
}

/** Land — resolve "Other" → land_use_type_other / land_type_other */
function landCatLabel(l: Land): string {
    const use = nameOf(l.land_use_type);
    if (/other/i.test(use) && l.land_use_type_other) {
        return String(l.land_use_type_other);
    }
    if (use) return use;
    const t = nameOf(l.land_type);
    if (/other/i.test(t) && l.land_type_other) {
        return String(l.land_type_other);
    }
    return t;
}

/** Worker Gender — resolve "Other" → gender_other */
function workerGenderLabel(w: { gender?: unknown; gender_other?: string | null }): string {
    const raw = nameOf(w.gender);
    if (/other/i.test(raw) && w.gender_other) {
        return String(w.gender_other);
    }
    return raw;
}

export function EPFileDWASADocument({data, projectName, tenant, worker}: EPFileDWASADocumentProps) {
    const lands: Land[] = data.lands ?? [];
    const structures: Infrastructure[] = data.infrastructures ?? [];
    const trees: Tree[] = data.trees ?? [];
    const ec = data.ec as Record<string, unknown> | null | undefined;
    const vouchers = (ec?.vouchers as Array<Record<string, unknown>> | undefined) ?? [];
    const tenantEp = tenant ?? null;
    const workerEp = worker ?? null;
    const isTenantEp = tenantEp !== null;
    const isWorkerEp = workerEp !== null;
    const isIndirectEp = isTenantEp || isWorkerEp;

    const mouza = data.mouza ?? lands.find((l) => l.mouza)?.mouza ?? '';
    const ownership = data.ownership ?? '';
    const epType = isTenantEp
        ? 'TENANT EP'
        : isWorkerEp
            ? 'WAGE LABOUR EP'
            : /non/i.test(ownership)
                ? 'NON-TITLED EP'
                : /tit/i.test(ownership)
                    ? 'TITLED EP'
                    : '[TITLED/NON-TITLED EP]';
    const today = new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'long', year: 'numeric'});

    // Tenant EP → personal info comes from the Tenant record itself.
    const p = tenantEp
        ? {
            epId: tenantEp.ep_id ?? '—',
            nid: tenantEp.nid_number ?? '—',
            name: tenantEp.name ?? '—',
            fh: tenantEp.father_name ?? '—',
            sex: nameOf(tenantEp.gender) || '—',
            income: fmtNum(tenantEp.annual_income) || '—',
            occupation: occupationLabel(tenantEp) || '—',
            mouza: tenantEp.mouza ?? '—',
            union: tenantEp.union_name ?? '—',
            upazila: nameOf(tenantEp.upazila) || '—',
            district: nameOf(tenantEp.district) || '—',
        }
        : workerEp
            ? {
                epId: workerEp.ep_id ?? '—',
                nid: workerEp.nid_number ?? '—',
                name: workerEp.name ?? '—',
                fh: workerEp.father_name ?? '—',
                sex: workerGenderLabel(workerEp) || '—',
                income: fmtNum((Number(workerEp.monthly_income) || 0) * 12) || '—',
                occupation: occupationLabel(workerEp) || '—',
                mouza: workerEp.mouza ?? '—',
                union: workerEp.union_name ?? '—',
                upazila: nameOf(workerEp.upazila) || '—',
                district: nameOf(workerEp.district) || '—',
            }
            : null;

    const totalLandArea = lands.reduce((sum, l) => sum + (parseFloat(String(l.land_area)) || 0), 0);

    // Sl No ordering is shared with the tenant form: structures are numbered
    // ascending by infrastructure_id. The EP File uses the same ordering so the
    // Structure Sl No entered on the Tenant form always matches the document.
    const slByInfrastructureId = new Map<number, number>();
    const structureById = new Map<number, Infrastructure>();
    [...structures]
        .sort((a, b) => Number(a.infrastructure_id) - Number(b.infrastructure_id))
        .forEach((s, i) => {
            const id = Number(s.infrastructure_id);
            if (id) {
                slByInfrastructureId.set(id, i + 1);
                structureById.set(id, s);
            }
        });

    // Every structure a tenant EP rents, in Sl No order — from the tenant's
    // structure pivot, falling back to the single legacy infrastructure column.
    const tenantStructureIds =
        tenantEp && Array.isArray(tenantEp.infrastructures) && tenantEp.infrastructures.length > 0
            ? tenantEp.infrastructures
                .map((x) => Number(x.infrastructure_id))
                .sort((a, b) => a - b)
            : tenantEp && Number(tenantEp.infrastructure_id)
                ? [Number(tenantEp.infrastructure_id)]
                : [];

    // Structures grouped by (use, nature, material) for the owner EP file.
    const structureGroup = new Map<string, { use: string; type: string; cat: string; qty: number; count: number }>();
    for (const s of structures) {
        const use = useLabel(s);
        const type = nameOf(s.structure_nature);
        const cat = catLabel(s);
        const key = `${use}|${type}|${cat}`;
        const g = structureGroup.get(key) ?? {use, type, cat, qty: 0, count: 0};
        g.qty += parseFloat(String(s.area_sqft ?? 0)) || 0;
        g.count += 1;
        structureGroup.set(key, g);
    }
    const totalStructureCount = structures.length;

    // Trees grouped by category, broken down by age.
    const treeGroup = new Map<string, { large: number; medium: number; small: number; sapling: number }>();
    const ageKey = (age: string): 'large' | 'medium' | 'small' | 'sapling' => {
        for (const col of AGE_MAP) {
            if (col.match.some((m) => age.includes(m))) return col.key;
        }
        return 'small';
    };
    for (const tree of trees) {
        const cat = treeTypeLabel(tree) || 'Unknown';
        const g = treeGroup.get(cat) ?? {large: 0, medium: 0, small: 0, sapling: 0};
        g[ageKey(nameOf(tree.tree_age_category))] += Number(tree.quantity ?? 0) || 0;
        treeGroup.set(cat, g);
    }

    return (
        <div className="epf-doc">
            <style>{DOC_STYLES}</style>

            <div className="toolbar">
                <strong className="tb-title">EP File Preview</strong>
                <div className="tb-actions">
                    <button type="button" className="print" onClick={() => window.print()}>
                        Print / Save PDF
                    </button>
                    <button type="button" className="close" onClick={() => window.scrollTo(0, 0)}>
                        Top
                    </button>
                </div>
            </div>

            <div className="paper">
                <div className="top">
                    <span>{epType}</span>
                    <span>{today}</span>
                </div>

                <div className="header">
                    Government of the People's Republic of Bangladesh<br/>
                    {projectName?.trim() ? projectName : 'Saidadabad Water Treatment Plant Project, Phase- III'}<br/>
                    <span className="title">Entitled Person's (EP) File</span>
                </div>

                <div className="rule"/>

                <div className="section-title">1. EP's Personal Information:</div>
                <table className="personal">
                    <tbody>
                    <tr>
                        <td><span className="label">EP ID :</span> {p?.epId ?? data.ep_id ?? '—'}</td>
                        <td>NID No: {p?.nid ?? data.nid_number ?? '—'}</td>
                        <td>Name: {p?.name ?? data.name}</td>
                        <td>F/H Name: {p?.fh ?? data.father_name ?? '—'}</td>
                    </tr>
                    <tr>
                        <td>Ownership: {isTenantEp ? 'Tenant' : (isWorkerEp ? 'Wage Labour' : decision(ownership))}</td>
                        <td>Sex: {p?.sex ?? data.gender ?? '—'}</td>
                        <td>Yearly Income (BDT): {p ? p.income : fmtNum(data.yearly_income)}</td>
                        <td>Occupation: {(p?.occupation ?? occupationLabel({ occupation: data.occupation ?? null, occupation_other: data.occupation_other })) || '—'}</td>
                    </tr>
                    <tr>
                        <td>Mouza: {p ? p.mouza : (mouza || '—')}</td>
                        <td>Union: {p?.union ?? data.union_name ?? '—'}</td>
                        <td>Upazila: {p?.upazila ?? data.upazila ?? '—'}</td>
                        <td>District: {p?.district ?? data.district ?? '—'}</td>
                    </tr>
                    </tbody>
                </table>

                <div className="rule"/>

                {!isIndirectEp && lands.length > 0 ? (
                    <>
                        <div className="section-title">2. Land Information:</div>
                        <table className="data">
                            <thead>
                            <tr>
                                <th>Mouza</th>
                                <th>Category of Land</th>
                                <th className="right">Area/Quantity (Decimal)</th>
                                <th className="right">DC Rate (In Decimal)</th>
                                <th className="right">PAVC Rate (In Decimal)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {lands.map((land) => (
                                <tr key={land.land_id}>
                                    <td>{land.mouza ?? '—'}</td>
                                    <td>{landCatLabel(land) || '—'}</td>
                                    <td className="right">{fmtArea(land.land_area)}</td>
                                    <td className="right">{fmtNum(land.dc_pay_amount)}</td>
                                    <td className="right">—</td>
                                </tr>
                            ))}
                            <tr className="total">
                                <td colSpan={2}>Total Land =</td>
                                <td className="right">{totalLandArea.toFixed(4)}</td>
                                <td/>
                                <td/>
                            </tr>
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="section-title">2. Land Information: <span className="not-found">Not Found.</span>
                    </div>
                )}

                <div className="rule"/>

                {isTenantEp ? (
                    <>
                        <div className="section-title">3. Structure Information:</div>
                        <table className="data structure narrow">
                            <thead>
                            <tr>
                                <th>Sl No</th>
                                <th>Use of Structure</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Unit</th>
                                <th className="right">Quantity</th>
                                <th className="right">Number (Count)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {tenantStructureIds.length > 0 ? tenantStructureIds.map((id) => {
                                const mother = structureById.get(id);
                                return (
                                    <tr key={id}>
                                        <td>{slByInfrastructureId.get(id) ?? '—'}</td>
                                        <td>Tenant</td>
                                        <td>{nameOf(tenantEp!.tenant_type) || '—'}</td>
                                        <td>{mother ? (catLabel(mother) || '—') : '—'}</td>
                                        <td>SFT</td>
                                        <td className="right">{mother ? fmtNum(mother.area_sqft) : '—'}</td>
                                        <td className="right">1</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td>—</td>
                                    <td>Tenant</td>
                                    <td>{nameOf(tenantEp!.tenant_type) || '—'}</td>
                                    <td>—</td>
                                    <td>SFT</td>
                                    <td className="right">—</td>
                                    <td className="right">1</td>
                                </tr>
                            )}
                            <tr className="total">
                                <td colSpan={6}>Total Number of Structures =</td>
                                <td className="right">{Math.max(tenantStructureIds.length, 1)}</td>
                            </tr>
                            </tbody>
                        </table>
                    </>
                ) : !isWorkerEp && structures.length > 0 ? (
                    <>
                        <div className="section-title">3. Structure Information:</div>
                        <table className="data structure narrow">
                            <thead>
                            <tr>
                                <th>Use of Structure</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Unit</th>
                                <th className="right">Quantity</th>
                                <th className="right">Number (Count)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Array.from(structureGroup.values()).map((g) => (
                                <tr key={`${g.use}|${g.type}|${g.cat}`}>
                                    <td>{g.use || '—'}</td>
                                    <td>{g.type || '—'}</td>
                                    <td>{g.cat || '—'}</td>
                                    <td>SFT</td>
                                    <td className="right">{fmtNum(g.qty)}</td>
                                    <td className="right">{g.count}</td>
                                </tr>
                            ))}
                            <tr className="total">
                                <td colSpan={5}>Total Number of Structures =</td>
                                <td className="right">{totalStructureCount}</td>
                            </tr>
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="section-title">3. Structure Information: <span
                        className="not-found">Not Found.</span></div>
                )}

                <div className="rule"/>

                {!isIndirectEp && treeGroup.size > 0 ? (
                    <>
                        <div className="section-title">4. Tree Information:</div>
                        <table className="data trees">
                            <thead>
                            <tr>
                                <th>Category of Tree</th>
                                <th className="num">Large</th>
                                <th className="num">Medium</th>
                                <th className="num">Small</th>
                                <th className="num">Sapling</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Array.from(treeGroup.entries()).map(([cat, counts]) => (
                                <tr key={cat}>
                                    <td>{cat}</td>
                                    <td className="num">{counts.large || ''}</td>
                                    <td className="num">{counts.medium || ''}</td>
                                    <td className="num">{counts.small || ''}</td>
                                    <td className="num">{counts.sapling || ''}</td>
                                </tr>
                            ))}
                            <tr className="total">
                                <td>Total =</td>
                                <td className="num">{Array.from(treeGroup.values()).reduce((s, c) => s + c.large, 0) || ''}</td>
                                <td className="num">{Array.from(treeGroup.values()).reduce((s, c) => s + c.medium, 0) || ''}</td>
                                <td className="num">{Array.from(treeGroup.values()).reduce((s, c) => s + c.small, 0) || ''}</td>
                                <td className="num">{Array.from(treeGroup.values()).reduce((s, c) => s + c.sapling, 0) || ''}</td>
                            </tr>
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="section-title">4. Tree Information: <span className="not-found">Not Found.</span>
                    </div>
                )}

                <div className="rule"/>

                {!isIndirectEp && vouchers.length > 0 ? (
                    <>
                        <div className="section-title">5. Previous Payment Information:</div>
                        <table className="data">
                            <thead>
                            <tr>
                                <th>Voucher #</th>
                                <th>Date</th>
                                <th className="right">Amount (BDT)</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {vouchers.map((v, i) => (
                                <tr key={i}>
                                    <td>{String(v.voucher_number ?? '—')}</td>
                                    <td>{String(v.voucher_date ?? '—')}</td>
                                    <td className="right">{fmtNum(String(v.approved_amount ?? ''))}</td>
                                    <td>{String(v.payment_status ?? '—')}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div className="section-title">5. Previous Payment Information: <span className="not-found">Not Found.</span>
                    </div>
                )}

                <div className="signature">
                    <div>
                        <div className="line">Area Manager, KMC</div>
                    </div>
                    <div>
                        <div className="line">&nbsp;</div>
                    </div>
                    <div>
                        <div className="line">&nbsp;</div>
                    </div>
                    <div>
                        <div className="line">&nbsp;</div>
                    </div>
                </div>

                <div className="page-footer">Page 1 of 1</div>
            </div>
        </div>
    );
}

function decision(ownership: string): string {
    const v = ownership.trim();
    if (!v) return '—';
    return /non/i.test(v) ? 'Non-Titled' : /tit/i.test(v) ? 'Titled' : v;
}