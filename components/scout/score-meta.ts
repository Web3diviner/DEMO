import type { TalentScores } from "@/lib/api/types";

/** The five explainable composites (PRD §6.9), in display order. */
export const SCORE_META: { key: keyof TalentScores; label: string; short: string }[] = [
  { key: "growth", label: "Talent Growth", short: "Growth" },
  { key: "virality", label: "Virality", short: "Viral" },
  { key: "loyalty", label: "Fan Loyalty", short: "Loyalty" },
  { key: "campusInfluence", label: "Campus Influence", short: "Campus" },
  { key: "readiness", label: "Label/Sponsor Readiness", short: "Ready" },
];

export function scoreTone(v: number): string {
  if (v >= 80) return "bg-success";
  if (v >= 60) return "bg-brand";
  if (v >= 40) return "bg-warning";
  return "bg-subtle";
}
