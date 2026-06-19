import { ModerationQueue } from "@/components/moderation/moderation-queue";

/**
 * Moderation console (PRD §10.3 — a launch blocker). Staff-only review queue: automated first-pass
 * flags + user reports, with content/user actions. Server enforces staff SSO + role; this is the UI.
 * Ledger + fraud dashboards attach alongside this queue.
 */
export const metadata = { title: "Moderation" };

export default function ModerationPage() {
  return <ModerationQueue />;
}
