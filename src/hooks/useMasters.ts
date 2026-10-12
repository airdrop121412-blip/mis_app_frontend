// ═══════════════════════════════════════════════════════════════
// useMasters — TanStack Query hooks for master/lookup dropdown data
// Phase 4B-10: Fetches from /api/v1/masters/{entity}
// ═══════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { fetchMaster, fetchUpazilasByDistrict, fetchVillagesByUpazila } from '../api/ep';
import { fetchProjects } from '../api/projects';
import { fetchEpidCodes, type EpidCode } from '../api/epidCodes';
import { useProject } from '../contexts/ProjectContext';
import type { MasterItem } from '../types/ep';

function useMasterList(entity: string, enabled = true) {
  return useQuery({
    queryKey: ['master', entity],
    queryFn: () => fetchMaster(entity),
    staleTime: 5 * 60_000, // 5 minutes — masters rarely change
    enabled,
  });
}

/** Extract label from a master item — uses 'name' column */
export function masterLabel(item: MasterItem): string {
  return String(item.name ?? item.code ?? item.id ?? '—');
}

/** Extract value (PK) from a master item — the API returns it as 'id' */
export function masterValue(item: MasterItem): number {
  return Number(item.id ?? 0);
}

// ── Individual master hooks ──────────────────────────────────
export function useGenders() {
  const { data, ...rest } = useMasterList('gender');
  return { items: data ?? [], ...rest };
}

export function useReligions() {
  const { data, ...rest } = useMasterList('religion');
  return { items: data ?? [], ...rest };
}

export function useOccupations() {
  const { data, ...rest } = useMasterList('occupation');
  return { items: data ?? [], ...rest };
}

export function useDistricts() {
  const { data, ...rest } = useMasterList('district');
  return { items: data ?? [], ...rest };
}

export function useLandStatuses() {
  const { data, ...rest } = useMasterList('land_status');
  return { items: data ?? [], ...rest };
}

export function useRcTypes() {
  const { data, ...rest } = useMasterList('residential_commercial_type');
  return { items: data ?? [], ...rest };
}

export function useLocationSources() {
  const { data, ...rest } = useMasterList('location_source');
  return { items: data ?? [], ...rest };
}

// ── Hierarchical master hooks ────────────────────────────────
export function useUpazilas(districtId: number | null) {
  const { data, ...rest } = useQuery({
    queryKey: ['master', 'upazilas', districtId],
    queryFn: () => fetchUpazilasByDistrict(districtId!),
    staleTime: 5 * 60_000,
    enabled: !!districtId,
  });
  return { items: data ?? [], ...rest };
}

/** Configured project phases for the active project (Admin → EP ID Codes → Project Phase).
 *  Scoped to the active project; shared global codes are included but a
 *  project-specific code overrides a same-named global one — no duplicates. */
export function useProjectPhases() {
  const { project } = useProject();
  const projectId = project?.project_id ?? null;
  const { data, ...rest } = useQuery({
    queryKey: ['epid-code', 'project_phase', projectId ?? 'all'],
    queryFn: () => fetchEpidCodes(projectId, 'project_phase', undefined, true),
    staleTime: 5 * 60_000,
  });
  return { items: data ?? ([] as EpidCode[]), ...rest };
}

/** Configured loss categories for the active project (Admin → EP ID Codes → Loss Category).
 *  Scoped to the active project; shared global codes are included but a
 *  project-specific code overrides a same-named global one — no duplicates. */
export function useLossCategories() {
  const { project } = useProject();
  const projectId = project?.project_id ?? null;
  const { data, ...rest } = useQuery({
    queryKey: ['epid-code', 'loss_category', projectId ?? 'all'],
    queryFn: () => fetchEpidCodes(projectId, 'loss_category', undefined, true),
    staleTime: 5 * 60_000,
  });
  return { items: data ?? ([] as EpidCode[]), ...rest };
}

/** All upazilas (no district filter) — used by the Land nested form. */
export function useAllUpazilas() {
  const { data, ...rest } = useMasterList('upazila');
  return { items: data ?? [], ...rest };
}

export function useVillages(upazilaId: number | null) {
  const { data, ...rest } = useQuery({
    queryKey: ['master', 'villages', upazilaId],
    queryFn: () => fetchVillagesByUpazila(upazilaId!),
    staleTime: 5 * 60_000,
    enabled: !!upazilaId,
  });
  return { items: data ?? [], ...rest };
}

// ── Nested entity master hooks ───────────────────────────────
export function useRelationships() {
  const { data, ...rest } = useMasterList('relationship');
  return { items: data ?? [], ...rest };
}

export function useLandTypes() {
  const { data, ...rest } = useMasterList('land_type');
  return { items: data ?? [], ...rest };
}

export function useOwnershipTypes() {
  const { data, ...rest } = useMasterList('ownership_type');
  return { items: data ?? [], ...rest };
}

export function useLandUseTypes() {
  const { data, ...rest } = useMasterList('land_use_type');
  return { items: data ?? [], ...rest };
}

export function useUnits() {
  const { data, ...rest } = useMasterList('unit');
  return { items: data ?? [], ...rest };
}

export function useTreeTypes() {
  const { data, ...rest } = useMasterList('tree_type');
  return { items: data ?? [], ...rest };
}

export function useTreeAgeCategories() {
  const { data, ...rest } = useMasterList('tree_age_category');
  return { items: data ?? [], ...rest };
}

export function useInfrastructureTypes() {
  const { data, ...rest } = useMasterList('infrastructure_type');
  return { items: data ?? [], ...rest };
}

export function useUsageTypes() {
  const { data, ...rest } = useMasterList('usage_type');
  return { items: data ?? [], ...rest };
}

export function useTenantTypes() {
  const { data, ...rest } = useMasterList('tenant_type');
  return { items: data ?? [], ...rest };
}

export function useEmploymentTypes() {
  const { data, ...rest } = useMasterList('employment_type');
  return { items: data ?? [], ...rest };
}

export function useLandDamageTypes() {
  const { data, ...rest } = useMasterList('land_damage_type');
  return { items: data ?? [], ...rest };
}

export function useCropTypes() {
  const { data, ...rest } = useMasterList('crop_type');
  return { items: data ?? [], ...rest };
}

export function useCropSeasons() {
  const { data, ...rest } = useMasterList('crop_season');
  return { items: data ?? [], ...rest };
}

export function useBusinessTypes() {
  const { data, ...rest } = useMasterList('business_type');
  return { items: data ?? [], ...rest };
}

export function useBusinessCategories() {
  const { data, ...rest } = useMasterList('business_category');
  return { items: data ?? [], ...rest };
}

export function useBusinessOwnershipTypes() {
  const { data, ...rest } = useMasterList('business_ownership_type');
  return { items: data ?? [], ...rest };
}

export function useProjects() {
  const { data, ...rest } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
    staleTime: 5 * 60_000,
  });
  return { items: data ?? [], ...rest };
}
