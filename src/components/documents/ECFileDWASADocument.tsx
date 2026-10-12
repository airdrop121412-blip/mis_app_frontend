// ═══════════════════════════════════════════════════════════════
// ECFileDWASADocument — Entitlement Card (EC) document
// A4 landscape, matching the official reference format:
//   Header → EP Personal Info → 18 compensation heads table
//   (Compensation Head | Quantity | PAVC Amount | DC Amount |
//    Compensation | Gross Payable | Previous Payment | Net Payable)
//   → Amount in Words → Grand Total → 4 signatures.
//
// No fabricated financial values:
//   Non-land heads:
//     DC Amount   = assessed amount (assessment lineage)
//     Compensation/Gross = approved compensation amount
//     Previous Payment   = paid amount (sum of paid vouchers per head)
//     Net Payable        = Compensation − Previous Payment
//     PAVC Amount        has no backend source and renders 0.00
//   CfL head for Titled EPs (ownership = 'Title'):
//     Quantity (Dec.)  = sum of the EP's land area converted to decimals
//     PAVC Amount      = Σ per-land (decimal qty × pavc_rate) from Rates
//                        File matched by mouza + land category (0 if no match)
//     DC Amount        = Σ per-land (decimal qty × dc_office_rate) from
//                        Rates File matched by mouza + land category
//     Compensation     = PAVC Amount − DC Amount
//     Gross Payable    = Compensation
//     Previous Payment = 0.00 (payment log not yet wired up)
//     Net Payable      = Compensation
//   Grant & Assistance heads (LDC, DA, SRC, HTG, HCG, CAVHH, AVFHH, MTG,
//   SGfT, GfWL, CfB) computed from the Grant and Assistance config:
//     FIXED               → amount
//     PERCENTAGE          → base × percentage%   (base = PAVC / RV_STRUCTURE)
//     FIXED_AND_PERCENTAGE→ amount + base × percentage%
//     MULTIPLIER          → total land (decimal) × multiplier   (DA)
//     RV for Structure (Squatters) = Σ (structure area_sqft × matched
//     Structure Category Rate) from the Rates File.
//   HTG (House Transfer Grant) and HCG (House Construction Grant) are gated on
//   the EP's PRIMARY structures and use the summed value of only the qualifying
//   structures as their percentage base:
//     HTG → Primary structures whose material is Tin Made / Katcha / Thatched
//     HCG → Primary structures whose material is Pacca / Semi Pacca
//   Secondary structures never count; when no qualifying primary structure
//   exists the head is 0.
//   DA additionally supports per-scope rate records (district + upazila +
//   land category from Admin → Grant & Assistance). When records exist, each
//   land uses the most specific matching record (blank scope = any); lands
//   with no matching record fall back to the item's flat multiplier.
//   CfB (Compensation for Business Loss) is a one-time grant (optionally set
//   district-wise via per-district amount records in Admin → Grant &
//   Assistance). It is earned from the EP's Business Information table
//   (step 8): the Main EP card gets CfB when the EP owns a business
//   (ownership_code OWNER); a Tenant EP card gets CfB when that tenant runs a
//   business (ownership_code TENANT referencing the tenant record); Wage
//   Labour EP cards never get CfB.
// ═══════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import type { EpFileData, Land, Infrastructure, Tenant, Worker, Tree } from '../../types/ep';
import type { EcFullData, Compensation } from '../../types/ec';
import { COMPENSATION_LABELS, COMPENSATION_CATEGORY_ORDER, canonicalCategory } from '../../types/ec';
import { numberToWords } from '../../utils/numberToWords';
import { occupationLabel } from '../../utils/occupation';
import { fetchRateFile, type RateFileLandRow, type RateFileStructureRow, type RateFileTreeRow } from '../../api/rateFile';
import {
  fetchGrantAssistance,
  type GrantAssistanceRow,
} from '../../api/grantAssistance';

const DOC_STYLES = `
.ecf-doc{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;color:#111}
.ecf-doc *,.ecf-doc *::before,.ecf-doc *::after{box-sizing:border-box}
.ecf-doc body{margin:0;background:#eee}
.ecf-doc .toolbar{background:#173b63;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:5}
.ecf-doc .toolbar strong{font-size:15px;font-weight:bold}
.ecf-doc .toolbar button{border:0;border-radius:4px;padding:9px 16px;cursor:pointer;font-weight:600}
.ecf-doc .toolbar .print-btn{background:#fff;color:#173b63}
.ecf-doc .paper{width:297mm;min-height:210mm;margin:18px auto;background:#fff;padding:8mm 9mm;position:relative;box-shadow:0 0 10px rgba(0,0,0,.25)}
.ecf-doc .top-row{display:flex;justify-content:space-between;font-family:"Courier New",monospace;font-size:12px;color:#333}
.ecf-doc .header{text-align:center;font-size:14px;line-height:1.4;font-weight:700;margin-top:-2px}
.ecf-doc .project-name{font-size:15px;font-weight:700}
.ecf-doc .ec-title{display:inline-block;background:#000;color:#fff;padding:5px 18px;margin-top:7px;font-size:15px;font-weight:500}
.ecf-doc .blue-rule{border-top:1px solid #7894ad;margin:5px 0 7px}
.ecf-doc .section-title{font-size:15px;font-weight:700;margin:5px 0}
.ecf-doc .personal-table{width:100%;border-collapse:collapse;font-size:13px}
.ecf-doc .personal-table td{padding:3px 6px;white-space:nowrap}
.ecf-doc .double-rule{border-top:3px double #777;margin:5px 0}
.ecf-doc .amount-note{text-align:right;font-style:italic;font-size:12px;margin-bottom:4px}
.ecf-doc .compensation{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px}
.ecf-doc .compensation th,.ecf-doc .compensation td{border:1px dashed #9aa9b7;padding:3px 5px;height:21px}
.ecf-doc .compensation th{background:#eaf3fa;text-align:center;font-weight:700}
.ecf-doc .compensation .item{width:28%;text-align:left}
.ecf-doc .compensation .qty{width:10%}
.ecf-doc .compensation .money{width:12.4%}
.ecf-doc .number{text-align:right;white-space:nowrap}
.ecf-doc .amount-words{font-size:12.5px;margin:5px 0 0 12px}
.ecf-doc .grand-total{text-align:right;font-size:14px;font-weight:700;margin-top:4px}
.ecf-doc .signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:55px;text-align:center;font-size:12px;margin-top:55px}
.ecf-doc .signature-line{border-top:1px dashed #333;padding-top:4px}
.ecf-doc .page-number{position:absolute;right:9mm;bottom:4mm;font-size:10px;color:#555}
@media print{
  .ecf-doc body{background:#fff}
  .ecf-doc .toolbar{display:none!important}
  .ecf-doc .paper{width:100%;min-height:auto;margin:0;padding:0;box-shadow:none}
}
@media screen and (max-width:1100px){
  .ecf-doc .paper{width:98%;min-height:auto}
}
`;

interface ECFileDWASADocumentProps {
    data: EpFileData;
    /** Name of the active (currently selected) project shown in the header */
    projectName?: string;
    /**
     * When set, the card is rendered for a Tenant EP ID: the EP's Personal
     * Information comes from the tenant record, Ownership shows "Tenant",
     * and only the Shifting Grant for Tenants (SGfT) head and — when the
     * tenant runs a business (step 8 Business Information) — the
     * Compensation for Business Loss (CfB) head are populated — every other
     * compensation head stays 0.
     */
    tenant?: Tenant | null;
    /**
     * When set, the card is rendered for a Wage Labour EP ID: the EP's
     * Personal Information comes from the worker record, Ownership shows
     * "Wage Labour", and only the Grant for Wage Loss (GfWL) head is
     * populated — every other compensation head stays 0.
     */
    worker?: Worker | null;
}

function nameOf(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
        const name = (v as { name?: unknown }).name;
        return typeof name === 'string' ? name : '';
    }
    return String(v);
}

// Map a tree's age-category name to the Tree Rates file size and its tree
// type to the Rates file tree_type so rate lookup matches.
function treeTypeForRates(tree: Tree): string {
    const t = nameOf(tree.tree_type).trim();
    if (!t) return '';
    if (/different variety|variety/i.test(t)) return 'Different Variety';
    if (/various/i.test(t)) return 'Various';
    if (/total tree/i.test(t)) return 'Total Tree';
    const matched = t.replace(/\s+/g, ' ').toLowerCase();
    if (matched === 'bamboo bush') return 'Bamboo bush';
    if (matched === 'timber & fruit' || matched === 'timber and fruit') return 'Timber & fruit';
    if (t === 'Timber') return 'Timber';
    if (t === 'Timber & fruit') return 'Timber & fruit';
    return t;
}

function canonicalTreeSize(tree: Tree): string {
    const age = nameOf(tree.tree_age_category);
    if (/big|large/i.test(age)) return 'Large';
    if (/medium/i.test(age)) return 'Medium';
    if (/small/i.test(age)) return 'Small';
    if (/sapling|plant/i.test(age)) return 'Sapling';
    return '';
}

/** Money format for the reference document (Indian grouping, 2 decimals). */
function money(v: string | number | null | undefined): string {
    const n = parseFloat(String(v ?? ''));
    if (!Number.isFinite(n)) return '0.00';
    return n.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

/** Quantity (Dec.) format — plain number, 4 decimals max, no grouping. */
function qty(v: number): string {
    if (!Number.isFinite(v) || v === 0) return '';
    return v.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 4});
}

/** Land-area unit converts to decimal (Rates File land rates are per decimal). */
const DECIMAL_PER_UNIT: Record<number, number> = {
    1: 1,            // DECIMAL
    2: 33,           // BIGHA
    3: 1.6529,       // KATHA (720 / 435.6 sqft)
    4: 1,            // SHOTOK
    5: 1 / 435.6,    // SQFT
    6: 1 / 40.4686,  // SQM
    7: 100 / 0.4047, // HECTARE
    8: 100,          // ACRE
    9: 1,            // PIECE (fallback; not a real area)
};

/** Convert a land row's area to its decimal equivalent. */
function landAreaInDecimal(land: Land): number {
    const area = parseFloat(String(land.land_area ?? '0')) || 0;
    const unitId = Number(land.land_area_unit_id ?? 1);
    const factor = DECIMAL_PER_UNIT[unitId] ?? 1;
    return area * factor;
}

/** Resolved land category label used to match the Rates File land category. */
function landCategoryLabel(land: Land): string {
    if (land.land_type_other && String(land.land_type_other).trim()) return String(land.land_type_other).trim();
    if (land.land_type) {
        const t = nameOf(land.land_type).trim();
        if (t) return t;
    }
    return '';
}

export function ECFileDWASADocument({data, projectName, tenant, worker}: ECFileDWASADocumentProps) {
    const ec = (data.ec ?? {}) as unknown as EcFullData;
    const compensations = (ec.compensations ?? []) as Compensation[];
    const ownership = String(data.ownership ?? '');
    const isNonTitled = /non/i.test(ownership);
    const isTitled = !isNonTitled;
    const lands = (data.lands ?? []) as Land[];
    const tenantEp = tenant ?? null;
    const isTenantEpDoc = tenantEp !== null;
    const workerEp = worker ?? null;
    const isWorkerEpDoc = workerEp !== null;
    const ownershipHeader = isTenantEpDoc
        ? '[TENANT EP]'
        : isWorkerEpDoc
            ? '[WAGE LABOUR EP]'
            : isNonTitled
                ? '[NON-TITLED EP]'
                : '[TITLE EP]';
    const today = new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'long', year: 'numeric'});

    // Conditional-grant eligibility from the EP record:
    //   AVFHH → EP is Female only
    //   CAVHH → EP yearly income < 90,000 only
    //   SGfT  → EP is a Tenant only
    //   GfWL  → EP occupation is Wage Labour only
    const sexLabel = nameOf(data.gender) || '—';
    const isFemale = /female/i.test(String(nameOf(data.gender)));
    const yearlyIncomeValue = parseFloat(String(data.yearly_income ?? '')) || 0;
    const isLowIncome = yearlyIncomeValue < 90000;
    // data.is_tenant is the main-EP "does this EP have tenants occupying it"
    // flag (true for every main EP with tenants) — it must NOT make the card
    // look like a tenant card. SGfT is only for real Tenant cards, signalled
    // by the card_kind tag from the lookup (or the tenant prop).
    const isTenantEp =
        data.card_kind === 'tenant' ||
        /tenant/i.test(String(data.ownership ?? ''));
    const occupationLabelValue = occupationLabel({
        occupation: data.occupation ?? null,
        occupation_other: data.occupation_other,
    });
    const isWageLabour =
        /wage\s*labou?r/i.test(occupationLabelValue) || data.card_kind === 'worker';

    // CfB (Compensation for Business Loss) eligibility comes from the EP's
    // Business Information table (step 8):
    //   Main EP card   → eligible when the EP owns a business
    //                    (ownership_code = OWNER)
    //   Tenant EP card → eligible when that tenant has a business
    //                    (ownership_code = TENANT tied to the tenant record)
    //   Worker EP card → not eligible
    const businesses = (data.businesses ?? []) as Array<Record<string, unknown>>;
    const epOwnsBusiness = businesses.some(
        (b) => String(b.ownership_code ?? '').toUpperCase() === 'OWNER',
    );
    const tenantRunsBusiness =
        tenantEp !== null &&
        businesses.some(
            (b) =>
                String(b.ownership_code ?? '').toUpperCase() === 'TENANT' &&
                Number(b.tenant_id) === Number(tenantEp.tenant_id),
        );
    const isCfbEligible = isWorkerEpDoc ? false : isTenantEpDoc ? tenantRunsBusiness : epOwnsBusiness;
    // CfB per-district records are looked up by the card's own district.
    const cfbDistrictId = tenantEp?.district_id ?? data.district_id ?? null;

    // Tenant EP card → the EC's Personal Information comes from the actual
    // Tenant record, not the main EP.
    const tenantInfo = tenantEp
        ? {
            epId: tenantEp.ep_id ?? '—',
            nid: tenantEp.nid_number ?? '—',
            name: tenantEp.name ?? '—',
            fh: tenantEp.father_name ?? '—',
            mobile: tenantEp.mobile ?? '—',
            sex: nameOf(tenantEp.gender) || '—',
            income:
                tenantEp.annual_income != null && String(tenantEp.annual_income).trim() !== ''
                    ? money(tenantEp.annual_income)
                    : '—',
            occupation: occupationLabel(tenantEp) || '—',
            mouza: tenantEp.mouza ?? '—',
            union: tenantEp.union_name ?? '—',
            upazila: nameOf(tenantEp.upazila) || '—',
            district: nameOf(tenantEp.district) || '—',
        }
        : null;

    // Wage Labour EP card → the EC's Personal Information comes from the
    // actual Worker record, not the main EP.
    const workerInfo = workerEp
        ? {
            epId: workerEp.ep_id ?? '—',
            nid: workerEp.nid_number ?? '—',
            name: workerEp.name ?? '—',
            fh: workerEp.father_name ?? '—',
            mobile: workerEp.mobile ?? '—',
            sex:
                (/other/i.test(nameOf(workerEp.gender)) && workerEp.gender_other
                    ? String(workerEp.gender_other)
                    : nameOf(workerEp.gender)) || '—',
            income:
                workerEp.monthly_income != null && parseFloat(String(workerEp.monthly_income)) > 0
                    ? money((parseFloat(String(workerEp.monthly_income)) || 0) * 12)
                    : '—',
            occupation: occupationLabel(workerEp) || '—',
            mouza: workerEp.mouza ?? '—',
            union: workerEp.union_name ?? '—',
            upazila: nameOf(workerEp.upazila) || '—',
            district: nameOf(workerEp.district) || '—',
        }
        : null;

    // Land Rates File (used only for the CfL head of Titled EPs).
    const landRatesQuery = useQuery({
        queryKey: ['rate-file', 'land', data.project_id],
        queryFn: () => fetchRateFile('land', data.project_id ?? null),
        staleTime: 10 * 60_000,
    });
    const landRates = (landRatesQuery.data ?? []) as RateFileLandRow[];

    // Structure Rates File (used for the RV for Structure (Squatters) base).
    const structureRatesQuery = useQuery({
        queryKey: ['rate-file', 'structure', data.project_id],
        queryFn: () => fetchRateFile('structure', data.project_id ?? null),
        staleTime: 10 * 60_000,
    });
    const structureRates = (structureRatesQuery.data ?? []) as RateFileStructureRow[];

    // Tree Rates File — used for the "Compensation for Tree" head (CfF row).
    // Amount = Σ per-tree quantity × matched Tree Rate, scoped to the EP's
    // district / upazila + tree type + size.
    const treeRatesQuery = useQuery({
        queryKey: ['rate-file', 'tree', data.project_id],
        queryFn: () => fetchRateFile('tree', data.project_id ?? null),
        staleTime: 10 * 60_000,
    });
    const treeRates = (treeRatesQuery.data ?? []) as RateFileTreeRow[];
    const trees = (data.trees ?? []) as Tree[];
    const cffAmount = trees.reduce((sum, t) => {
        const qty = t.quantity ?? 0;
        if (qty <= 0) return sum;
        const type = treeTypeForRates(t);
        const size = canonicalTreeSize(t);
        if (type === '' || size === '') return sum;
        const candidates = treeRates.filter((r) =>
            r.is_active &&
            (r.district_id == null || r.district_id === data.district_id) &&
            (r.upazila_id == null || r.upazila_id === data.upazila_id) &&
            (r.tree_type ?? '').trim() === type &&
            (r.size ?? '').trim() === size,
        );
        if (candidates.length === 0) return sum;
        candidates.sort((a, b) => ((b.district_id != null ? 1 : 0) + (b.upazila_id != null ? 1 : 0)) - ((a.district_id != null ? 1 : 0) + (a.upazila_id != null ? 1 : 0)));
        return sum + qty * (parseFloat(candidates[0]!.rate) || 0);
    }, 0);

    // Grant and Assistance config (used for the LDC / DA / SRC / HTG / HCG /
    // CAVHH / AVFHH / MTG / SGfT / GfWL / CfB heads).
    const grantsQuery = useQuery({
        queryKey: ['grant-assistance', data.project_id],
        queryFn: () => fetchGrantAssistance(data.project_id ?? null),
        staleTime: 10 * 60_000,
    });
    const grants = (grantsQuery.data ?? []) as GrantAssistanceRow[];
    const grantMap = new Map<string, GrantAssistanceRow>(grants.map((g) => [g.grant_code, g]));

    // CfL — Titled EP: value each land against the Rates File (mouza + land
    // category) and sum. Unmatched lands contribute 0 to both rates.
    let cflQuantity = 0;
    let cflPavc = 0;
    let cflDc = 0;
    for (const land of lands) {
        const landQty = landAreaInDecimal(land);
        const mouza = String(land.mouza ?? '').trim();
        const category = landCategoryLabel(land);
        const rate = mouza && category
            ? landRates.find(
                (r) => String(r.mouza).trim() === mouza && String(r.land_category).trim() === category,
            )
            : undefined;
        cflQuantity += landQty;
        cflPavc += rate ? landQty * (parseFloat(rate.pavc_rate) || 0) : 0;
        cflDc += rate ? landQty * (parseFloat(rate.dc_office_rate) || 0) : 0;
    }
    const cflCompensation = cflPavc - cflDc;

    // RV for Structure (Squatters) = Σ per-structure (area_sqft × matched
    // Structure Category Rate). Match each structure to a rate-file row by
    // district/upazila (null = all), material, usage type, nature and unit.
    //
    // The same per-structure value feeds the two house grants:
    //   HTG (House Transfer Grant)     → PRIMARY only, Tin Made / Katcha / Thatched
    //   HCG (House Construction Grant) → PRIMARY only, Pacca / Semi Pacca
    // Both grants apply only when the EP has at least one qualifying structure,
    // and their percentage base is the SUM of those qualifying structures'
    // values (secondary structures never count).
    const infrastructures = (data.infrastructures ?? []) as Infrastructure[];
    const epDistrictId = data.district_id;
    const epUpazilaId = data.upazila_id;
    const HTG_MATERIALS = ['Tin Made', 'Katcha', 'Thatched'];
    const HCG_MATERIALS = ['Pacca', 'Semi Pacca'];
    let rvStructureAmount = 0;
    let htgStructureAmount = 0;
    let hcgStructureAmount = 0;
    let htgStructureCount = 0;
    let hcgStructureCount = 0;
    for (const s of infrastructures) {
        const area = parseFloat(String(s.area_sqft ?? '0')) || 0;
        const material =
            s.structure_material === 'Other'
                ? String(s.structure_material_other ?? '').trim()
                : String(s.structure_material ?? '').trim();
        const usage = String(s.usage_type_other ?? '').trim() || nameOf(s.usage_type);
        const nature = String(s.structure_nature ?? '').trim();
        const unit = String(s.unit ?? '').trim() || 'SFT';
        const rateRow = material && usage && nature && unit
            ? structureRates.find((r) =>
                r.is_active &&
                (r.district_id == null || r.district_id === epDistrictId) &&
                (r.upazila_id == null || r.upazila_id === epUpazilaId) &&
                String(r.material).trim() === material &&
                String(r.usage_type).trim() === usage &&
                String(r.nature).trim() === nature &&
                String(r.unit).trim() === unit,
            )
            : undefined;
        const value = area * (rateRow ? parseFloat(rateRow.rate) || 0 : 0);
        rvStructureAmount += value;

        if (nature === 'Primary') {
            if (HTG_MATERIALS.includes(material)) {
                htgStructureAmount += value;
                htgStructureCount += 1;
            }
            if (HCG_MATERIALS.includes(material)) {
                hcgStructureAmount += value;
                hcgStructureCount += 1;
            }
        }
    }

    // Grant & Assistance heads (LDC, DA, SRC, HTG, HCG, CAVHH, AVFHH, MTG,
    // SGfT, GfWL, CfB). Computed from the Grant and Assistance config:
    //   FIXED               → amount
    //   PERCENTAGE          → base × percentage%
    //   FIXED_AND_PERCENTAGE→ amount + base × percentage%
    //   MULTIPLIER          → total land (decimal) × multiplier  (DA)
    // where the percentage base is PAVC Amount (CfL) or RV for Structure
    // (Squatters). Returns 0 when the item is inactive or unconfigured.
    //
    // DA with per-scope rate records: each land is valued with the most
    // specific matching record (district + upazila + land category, where a
    // blank scope matches anything). District/upazila come from the EP (lands
    // do not carry them). Lands without a match fall back to the item's flat
    // multiplier.
    function daMultiplierForLand(land: Land): number {
        const g = grantMap.get('DA');
        if (!g || !g.is_active) return 0;
        const records = (g.rates ?? []).filter((r) => r.is_active);
        if (records.length === 0) return parseFloat(g.multiplier) || 0;
        const category = landCategoryLabel(land).toLowerCase();
        const candidates = records
            .filter((r) =>
                (r.district_id == null || r.district_id === epDistrictId) &&
                (r.upazila_id == null || r.upazila_id === epUpazilaId) &&
                (!r.land_category || (category !== '' && String(r.land_category).trim().toLowerCase() === category)),
            )
            .map((r) => ({
                specificity: (r.district_id != null ? 1 : 0) + (r.upazila_id != null ? 1 : 0) + (r.land_category ? 1 : 0),
                multiplier: parseFloat(r.multiplier) || 0,
            }));
        if (candidates.length === 0) return parseFloat(g.multiplier) || 0;
        candidates.sort((a, b) => b.specificity - a.specificity);
        return candidates[0]!.multiplier;
    }

    function grantValue(code: string): number {
        const g = grantMap.get(code);
        if (!g || !g.is_active) return 0;
        if (code === 'AVFHH' && !isFemale) return 0;
        if (code === 'CAVHH' && !isLowIncome) return 0;
        if (code === 'SGfT' && !isTenantEp && !isTenantEpDoc) return 0;
        if (code === 'GfWL' && !isWageLabour && !isWorkerEpDoc) return 0;
        if (code === 'CfB' && !isCfbEligible) return 0;
        const amount = parseFloat(g.amount) || 0;
        const percentage = parseFloat(g.percentage) || 0;
        const multiplier = parseFloat(g.multiplier) || 0;
        // HTG / HCG are earned only from qualifying PRIMARY structures and use
        // the sum of those structures' values as the base. Every other head
        // keeps the configured base (PAVC or the full RV for Structure total).
        let base: number;
        if (code === 'HTG') {
            if (htgStructureCount === 0) return 0;
            base = htgStructureAmount;
        } else if (code === 'HCG') {
            if (hcgStructureCount === 0) return 0;
            base = hcgStructureAmount;
        } else {
            base = (g.percentage_base ?? 'PAVC') === 'RV_STRUCTURE' ? rvStructureAmount : cflPavc;
        }
        switch (g.calculation_type) {
            case 'FIXED':
                // CfB (Compensation for Business Loss) may be configured
                // district-wise: the card's district picks the record amount. A
                // record with no district = any district (catch-all). When no
                // record matches, fall back to the item's flat amount.
                if (code === 'CfB') {
                    const records = (g.rates ?? []).filter((r) => r.is_active);
                    if (records.length === 0) return amount;
                    const districtId = cfbDistrictId;
                    const match = districtId != null
                        ? records.find((r) => r.district_id === districtId)
                        : undefined;
                    if (match) return parseFloat(match.amount) || 0;
                    const catchAll = records.find((r) => r.district_id == null);
                    if (catchAll) return parseFloat(catchAll.amount) || 0;
                    return amount;
                }
                return amount;
            case 'MULTIPLIER':
                if (code === 'DA') {
                    return lands.reduce(
                        (sum, land) => sum + landAreaInDecimal(land) * daMultiplierForLand(land),
                        0,
                    );
                }
                return cflQuantity * multiplier;
            case 'PERCENTAGE':
                return base * (percentage / 100);
            case 'FIXED_AND_PERCENTAGE':
                return amount + base * (percentage / 100);
            default:
                return 0;
        }
    }

    const GRANT_CODES = ['LDC', 'DA', 'SRC', 'HTG', 'HCG', 'CAVHH', 'AVFHH', 'MTG', 'SGfT', 'GfWL', 'CfB'];

    // Canonical-category → compensation record
    const compMap = new Map<string, Compensation>();
    for (const c of compensations) {
        compMap.set(canonicalCategory(c.category), c);
    }

    let grandTotal = 0;

    const rows = COMPENSATION_CATEGORY_ORDER.map((cat) => {
        const comp = compMap.get(cat);
        const compensation = comp ? parseFloat(comp.approved_amount) || 0 : 0;
        const previous = comp ? parseFloat(comp.paid_amount ?? '0') || 0 : 0;
        const dc = comp ? parseFloat(comp.assessed_amount) || 0 : 0;

        // Tenant EP card: only the Shifting Grant for Tenants (SGfT) head and
        // — when the tenant runs a business (step 8 Business Information) —
        // the Compensation for Business Loss (CfB) head are populated from the
        // grant config; every other compensation head (and the tenant's
        // previous payment) stays 0.
        if (isTenantEpDoc) {
            const isSgft = cat === 'SGfT';
            const isCfb = cat === 'CfB';
            const value = isSgft ? grantValue('SGfT') : isCfb ? grantValue('CfB') : 0;
            const net = value - 0;
            grandTotal += net;
            return {cat, quantity: 0, pavc: 0, dc: 0, compensation: value, gross: value, previous: 0, net};
        }

        // Wage Labour EP card: only the Grant for Wage Loss (GfWL) head is
        // populated from the grant config; every other compensation head (and
        // the worker's previous payment) stays 0.
        if (isWorkerEpDoc) {
            const isGfwl = cat === 'GfWL';
            const value = isGfwl ? grantValue('GfWL') : 0;
            const net = value - 0;
            grandTotal += net;
            return {cat, quantity: 0, pavc: 0, dc: 0, compensation: value, gross: value, previous: 0, net};
        }

        // CfL for Titled EPs is computed from the Rates File instead of the
        // assessment / approved lineage.
        if (cat === 'CfL' && isTitled) {
            const net = cflCompensation;
            grandTotal += net;
            return {cat, quantity: cflQuantity, pavc: cflPavc, dc: cflDc, compensation: cflCompensation, gross: cflCompensation, previous: 0, net};
        }

        // RV for Structure (Squatters) is computed from the Structure Rates
        // File (Σ per-structure area_sqft × matched rate).
        if (cat === 'RV_STRUCTURE') {
            const value = rvStructureAmount;
            if (value > 0) {
                const net = value - previous;
                grandTotal += net;
                return {cat, quantity: 0, pavc: 0, dc: 0, compensation: value, gross: value, previous, net};
            }
        }

        // "Compensation for Tree" head (CfF row) is computed from the Tree
        // Rates File (Σ per-tree quantity × matched rate). No quantity shown.
        if (cat === 'CfF') {
            const value = cffAmount;
            if (value > 0) {
                const net = value - previous;
                grandTotal += net;
                return {cat, quantity: 0, pavc: 0, dc: 0, compensation: value, gross: value, previous, net};
            }
        }

        // Grant & Assistance heads use ONLY the admin-configured value in the
        // Compensation column (the Grant and Assistance file is the source of
        // truth for these heads). A head that is not configured / inactive
        // renders as zero — it never falls back to the approved lineage, so
        // e.g. DA shows 0.00 unless a DA grant has been added. When the item
        // is configured but the EP does not meet the eligibility condition
        // (sex / income / tenant / wage labour) grantValue returns 0 and the
        // row renders as zero too.
        if (GRANT_CODES.includes(cat)) {
            const configured = !!grantMap.get(cat)?.is_active;
            if (!configured) {
                return {cat, quantity: 0, pavc: 0, dc: 0, compensation: 0, gross: 0, previous: 0, net: 0};
            }
            const value = grantValue(cat);
            const net = value - previous;
            grandTotal += net;
            return {cat, quantity: 0, pavc: 0, dc: 0, compensation: value, gross: value, previous, net};
        }

        const net = compensation - previous;
        grandTotal += net;
        return {cat, quantity: 0, pavc: 0, dc, compensation, gross: compensation, previous, net};
    });

    const epId = tenantInfo?.epId ?? workerInfo?.epId ?? data.ep_id ?? '—';
    const nid = tenantInfo?.nid ?? workerInfo?.nid ?? data.nid_number ?? '—';
    const name = tenantInfo?.name ?? workerInfo?.name ?? data.name ?? '—';
    const fatherName = tenantInfo?.fh ?? workerInfo?.fh ?? data.father_name ?? '—';
    const sex = tenantInfo?.sex ?? workerInfo?.sex ?? sexLabel;
    const income = tenantInfo?.income ?? workerInfo?.income ?? money(data.yearly_income);
    const mobile = tenantInfo?.mobile ?? workerInfo?.mobile ?? data.mobile ?? '—';
    const occupation = tenantInfo?.occupation ?? workerInfo?.occupation ?? (occupationLabelValue || '—');
    const mouza = tenantInfo?.mouza ?? workerInfo?.mouza ?? data.mouza ?? '—';
    const union = tenantInfo?.union ?? workerInfo?.union ?? data.union_name ?? '—';
    const upazila = tenantInfo?.upazila ?? workerInfo?.upazila ?? (nameOf(data.upazila) || '—');
    const district = tenantInfo?.district ?? workerInfo?.district ?? (nameOf(data.district) || '—');

    return (
        <div className="ecf-doc">
            <style>{DOC_STYLES}</style>

            <div className="toolbar">
                <strong>Entitlement Card (EC)</strong>
                <button type="button" className="print-btn" onClick={() => window.print()}>
                    Print / Save PDF
                </button>
            </div>

            <div className="paper">
                {/* HEADER */}
                <div className="top-row">
                    <span>{ownershipHeader}</span>
                    <span>{today}</span>
                </div>

                <div className="header">
                    Government of the People's Republic of Bangladesh
                    <br/>
                    <span className="project-name">{projectName?.trim() ? projectName : 'Your Project Name'}</span>
                    <br/>
                    <span className="ec-title">Entitlement Card (EC)</span>
                </div>

                <div className="blue-rule"/>

                {/* ── PERSONAL INFORMATION ── */}
                <div className="section-title">1. EP's Personal Information:</div>

                <table className="personal-table">
                    <tbody>
                    <tr>
                        <td>EP ID: {epId}</td>
                        <td>NID No: {nid}</td>
                        <td>Name: {name}</td>
                        <td>F/H Name: {fatherName}</td>
                    </tr>
                    <tr>
                        <td>Ownership: {isTenantEpDoc ? 'Tenant' : (isWorkerEpDoc ? 'Wage Labour' : ownership)}</td>
                        <td>Sex: {sex}</td>
                        <td>Yearly Income (BDT): {income}</td>
                        <td>Occupation: {occupation}</td>
                    </tr>
                    <tr>
                        <td>Mobile No: {mobile}</td>
                        <td>Mouza: {mouza}</td>
                        <td>Union: {union}</td>
                        <td>Upazila: {upazila}</td>
                        <td>District: {district}</td>
                    </tr>
                    </tbody>
                </table>

                <div className="double-rule"/>

                <div className="amount-note">(Amounts in BDT.)</div>

                {/* ── COMPENSATION ── */}
                <table className="compensation">
                    <thead>
                    <tr>
                        <th className="item">Compensation Head</th>
                        <th className="qty">Quantity (Dec.)</th>
                        <th className="money">PAVC Amount</th>
                        <th className="money">DC Amount</th>
                        <th className="money">Compensation</th>
                        <th className="money">Cross Payable</th>
                        <th className="money">Previous Payment</th>
                        <th className="money">Net Payable</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((row) => (
                        <tr key={row.cat}>
                            <td>{COMPENSATION_LABELS[row.cat] ?? row.cat}</td>
                            <td className="number">{qty(row.quantity)}</td>
                            <td className="number">{money(row.pavc)}</td>
                            <td className="number">{money(row.dc)}</td>
                            <td className="number">{money(row.compensation)}</td>
                            <td className="number">{money(row.gross)}</td>
                            <td className="number">{money(row.previous)}</td>
                            <td className="number">{money(row.net)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                {/* ── AMOUNT IN WORDS ── */}
                <div className="amount-words">
                    <b>In Word:</b> <span>{numberToWords(grandTotal)}</span>
                </div>

                {/* ── GRAND TOTAL ── */}
                <div className="grand-total">
                    Grand Total = <span>{money(grandTotal)}</span>
                </div>

                {/* ── SIGNATURES ── */}
                <div className="signatures">
                    <div>
                        <div className="signature-line">Area Manager, KMC</div>
                    </div>
                    <div>
                        <div className="signature-line">(Signature)</div>
                        Project Director
                    </div>
                    <div>
                        <div className="signature-line">(Signature)</div>
                        Project Representative
                    </div>
                    <div>
                        <div className="signature-line">(Signature)</div>
                        District Commissioner
                    </div>
                </div>

                {/* PAGE NUMBER */}
                <div className="page-number">
                    Page <span>1</span> of <span>1</span>
                </div>
            </div>
        </div>
    );
}