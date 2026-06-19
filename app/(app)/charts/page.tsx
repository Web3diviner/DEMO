import { ChartsScreen } from "@/components/charts/charts-screen";

/**
 * Charts (PRD §6.4) — campus + Rising Stars for the MVP. Time-decay scoring; Rising ranks growth
 * velocity, not absolute totals. Verified-user weighting applies to official boards.
 */
export const metadata = { title: "Charts" };

export default function ChartsPage() {
  return <ChartsScreen />;
}
