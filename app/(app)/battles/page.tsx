import { BattlesScreen } from "@/components/battles/battles-screen";

/**
 * Battles (PRD §6.5) — time-boxed contests; fans vote with Credits. This is the list; voting lives
 * in /battles/[id]. State machine: Draft→Open→Voting→Settled→Archived.
 */
export const metadata = { title: "Battles" };

export default function BattlesPage() {
  return <BattlesScreen />;
}
