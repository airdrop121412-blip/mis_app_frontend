// ═══════════════════════════════════════════════════════════════
// Occupation display helper — when the user picks the generic
// "Other" occupation the manually typed occupation_other text is what
// should appear in the lists and on the printed files (EPICAD, EP File),
// not the literal "Other".
// ═══════════════════════════════════════════════════════════════

interface OccupationSource {
  occupation?: string | { name?: string } | null;
  occupation_name?: string | null;
  occupation_other?: string | null;
}

/**
 * Resolve an occupation value for display, preferring `occupation_other`
 * whenever the selected master occupation is the generic "Other".
 */
export function occupationLabel(i: OccupationSource): string {
  const rel = i.occupation && typeof i.occupation === 'object' ? i.occupation.name : i.occupation;
  const name = String(i.occupation_name ?? rel ?? '').trim();
  if (/other/i.test(name) && i.occupation_other) {
    return String(i.occupation_other);
  }
  return name;
}