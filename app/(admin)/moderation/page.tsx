import { ShieldAlert } from "lucide-react";

/**
 * Moderation queue — placeholder. The real console (review queue, content/user actions, ledger +
 * fraud dashboards) is built against the admin contract once moderation rules land. Server-side
 * staff RBAC is required to reach this route.
 */
export const metadata = { title: "Moderation" };

export default function ModerationPage() {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <ShieldAlert className="h-5 w-5" aria-hidden /> Review queue
      </h1>
      <p className="text-muted mt-2 text-sm">
        Staff-only. Content &amp; user actions, ledger and fraud dashboards attach here.
      </p>
    </div>
  );
}
