/**
 * Feature flags for staged rollout (premium, marketplace, multi-campus, etc.).
 *
 * Defaults live here for type-safety and SSR; real values come from the backend/flag service and
 * are hydrated per-request. Reading an unknown flag is a compile error, not a silent false.
 */

export type FlagKey =
  | "premium"
  | "marketplace"
  | "multiCampus"
  | "battles"
  | "dms"
  | "talentIntelligence";

export type Flags = Record<FlagKey, boolean>;

export const DEFAULT_FLAGS: Flags = {
  // Enabled for this build; in production the backend flips flags for staged rollout.
  premium: true,
  marketplace: true,
  multiCampus: false,
  battles: true,
  dms: true,
  talentIntelligence: true,
};

/** Merge server-provided overrides onto defaults; ignores unknown keys defensively. */
export function resolveFlags(overrides?: Partial<Flags>): Flags {
  if (!overrides) return DEFAULT_FLAGS;
  const out = { ...DEFAULT_FLAGS };
  (Object.keys(DEFAULT_FLAGS) as FlagKey[]).forEach((k) => {
    if (typeof overrides[k] === "boolean") out[k] = overrides[k] as boolean;
  });
  return out;
}
