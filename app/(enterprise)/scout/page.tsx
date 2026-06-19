import { ScoutDashboard } from "@/components/scout/scout-dashboard";

/**
 * Talent Intelligence (PRD §6.9) — the enterprise scouting product. Explainable composite scores
 * (Talent Growth, Virality, Fan Loyalty, Campus Influence, Label/Sponsor Readiness) with
 * search/filter/export. Enterprise auth + RBAC enforced server-side; this is the dashboard UI.
 */
export const metadata = { title: "Talent Intelligence" };

export default function ScoutPage() {
  return <ScoutDashboard />;
}
