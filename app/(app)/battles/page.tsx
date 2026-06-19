import { Swords } from "lucide-react";

/**
 * Battles — placeholder surface. Format/scoring/vote-cost come from DEMO_PRD.md (see
 * docs/ASSUMPTIONS.md, flagged 🔴). Voting will consume Credits via the same optimistic queue +
 * server-confirmation pattern as engagement, but the rules must be confirmed before building.
 */
export const metadata = { title: "Battles" };

export default function BattlesPage() {
  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Swords className="text-live h-6 w-6" aria-hidden /> Battles
      </h1>
      <p className="text-muted mt-3 text-sm">
        Head-to-head talent battles, decided by fans. Coming together once the format and scoring
        are confirmed.
      </p>
    </main>
  );
}
