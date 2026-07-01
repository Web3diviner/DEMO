"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Crown,
  Lock,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { format } from "@/lib/money";
import { openCheckout } from "@/lib/payments/paystack";
import { useFlag } from "@/lib/flags-provider";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { FanClubTier, SubscriptionStatus } from "@/lib/api/types";

async function pollUntilSettled(reference: string, signal: AbortSignal) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !signal.aborted) {
    const s = await api.premium.subscriptionStatus(reference, signal);
    if (s.status !== "pending") return s;
    await new Promise((r) => setTimeout(r, 1200));
  }
  return { reference, status: "failed" as const, membership: null };
}

export function FanClubScreen({ handle }: { handle: string }) {
  const enabled = useFlag("premium");
  const qc = useQueryClient();
  const [tier, setTier] = React.useState<FanClubTier | null>(null);

  const { data, status } = useQuery({
    queryKey: ["fanclub", handle],
    queryFn: ({ signal }) => api.premium.fanclub(handle, signal),
    enabled,
  });

  if (!enabled) {
    return (
      <main id="main" className="min-h-dscreen grid place-items-center px-8 text-center">
        <div>
          <Crown className="text-muted mx-auto h-10 w-10" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">Fan Clubs are coming soon</h1>
          <p className="text-muted mt-2 text-sm">Back your favourite creators with a membership.</p>
        </div>
      </main>
    );
  }

  if (status === "pending") {
    return <div className="h-dscreen text-muted grid place-items-center">Loading…</div>;
  }
  if (status === "error" || !data) {
    return <div className="h-dscreen text-muted grid place-items-center">Unavailable.</div>;
  }

  const isMember = data.viewer.status === "active";

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href={`/u/${handle}`} aria-label="Back" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-lg font-semibold">Fan Club</h1>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="bg-brand text-brand-fg grid h-14 w-14 place-items-center rounded-full text-xl font-bold">
          {data.creator.displayName.charAt(0)}
        </div>
        <div>
          <p className="flex items-center gap-1 text-lg font-semibold">
            {data.creator.displayName}
            {data.creator.verified && (
              <BadgeCheck className="text-gold h-4 w-4" aria-label="Verified" />
            )}
          </p>
          <p className="text-muted text-sm">@{data.creator.handle}</p>
        </div>
      </div>

      {isMember && (
        <div className="border-brand/40 bg-brand/10 text-brand mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium">
          <Crown className="h-4 w-4" aria-hidden /> You&apos;re a member · renews{" "}
          {data.viewer.expiresAt ? new Date(data.viewer.expiresAt).toLocaleDateString() : ""}
        </div>
      )}

      {/* Tiers */}
      <div className="mt-5 space-y-3">
        {data.tiers.map((t) => {
          const current = data.viewer.tierId === t.id && isMember;
          return (
            <div
              key={t.id}
              className={cn(
                "border-line bg-surface rounded-lg border p-4",
                t.id === "inner" && "border-gold/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  {t.id === "inner" && <Crown className="text-gold h-4 w-4" aria-hidden />}
                  {t.name}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {format(t.price)}
                  <span className="text-subtle font-normal">/mo</span>
                </span>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {t.perks.map((p) => (
                  <li key={p} className="text-muted flex items-center gap-2 text-sm">
                    <Check className="text-success h-3.5 w-3.5 shrink-0" aria-hidden /> {p}
                  </li>
                ))}
              </ul>
              <Button
                block
                className="mt-3"
                variant={current ? "secondary" : "primary"}
                disabled={current}
                onClick={() => setTier(t)}
              >
                {current ? "Current plan" : `Join · ${format(t.price)}/mo`}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Members-only content */}
      <h2 className="text-muted mt-6 mb-2 text-sm font-medium">Members-only</h2>
      <ul className="space-y-2">
        {data.lockedPreview.map((item) => (
          <li
            key={item.id}
            className="border-line bg-surface flex items-center gap-3 rounded-lg border p-3"
          >
            {isMember ? (
              <Sparkles className="text-gold h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Lock className="text-subtle h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className={cn("text-sm", !isMember && "text-muted")}>{item.title}</span>
            {!isMember && <span className="text-subtle text-2xs ml-auto">Locked</span>}
          </li>
        ))}
      </ul>
      <p className="text-subtle mt-2 text-xs">
        Access is granted by your membership entitlement — surfaced as an expiring badge. No wallet,
        seed phrase, or gas.
      </p>

      <SubscribeSheet
        tier={tier}
        creatorHandle={handle}
        onClose={() => setTier(null)}
        onActive={() => {
          qc.invalidateQueries({ queryKey: ["fanclub", handle] });
          qc.invalidateQueries({ queryKey: ["memberships"] });
        }}
      />
    </main>
  );
}

function SubscribeSheet({
  tier,
  creatorHandle,
  onClose,
  onActive,
}: {
  tier: FanClubTier | null;
  creatorHandle: string;
  onClose: () => void;
  onActive: () => void;
}) {
  type Phase = "confirm" | "processing" | "pending" | "active" | "failed";
  const [phase, setPhase] = React.useState<Phase>("confirm");
  const abortRef = React.useRef<AbortController | null>(null);
  const open = tier !== null;

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPhase("confirm");
  }

  React.useEffect(() => {
    if (!open) abortRef.current?.abort();
    return () => abortRef.current?.abort();
  }, [open]);

  const subscribe = async () => {
    if (!tier) return;
    setPhase("processing");
    track({ type: "route_view", path: `/fanclub/${creatorHandle}:subscribe` });
    try {
      const intent = await api.premium.subscribe(creatorHandle, tier.id);
      const outcome = await openCheckout(intent);
      if (outcome === "cancelled") {
        setPhase("confirm");
        return;
      }
      setPhase("pending");
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const settled: SubscriptionStatus = await pollUntilSettled(intent.reference, ctrl.signal);
      if (settled.status === "active") {
        onActive();
        setPhase("active");
      } else {
        setPhase("failed");
      }
    } catch {
      setPhase("failed");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={tier ? `Join ${tier.name}` : "Join"}>
      {tier && phase === "confirm" && (
        <div>
          <div className="border-line flex items-center justify-between border-b pb-3">
            <span className="text-muted text-sm">{tier.name} membership</span>
            <span className="font-bold tabular-nums">
              {format(tier.price)}
              <span className="text-subtle font-normal">/mo</span>
            </span>
          </div>
          <p className="text-subtle mt-3 text-xs">
            Recurring monthly via Paystack. Cancel anytime — access lasts until the period ends.
          </p>
          <Button block className="mt-4" onClick={subscribe}>
            Subscribe
          </Button>
        </div>
      )}

      {(phase === "processing" || phase === "pending") && (
        <div
          className="flex flex-col items-center gap-3 py-10 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="text-brand h-8 w-8 animate-spin" aria-hidden />
          <p className="font-medium">
            {phase === "processing" ? "Opening secure checkout…" : "Confirming your membership…"}
          </p>
          <p className="text-subtle max-w-xs text-xs">
            Your perks unlock once the first payment is confirmed.
          </p>
        </div>
      )}

      {phase === "active" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Crown className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">You&apos;re in! 🎉</p>
          <p className="text-subtle max-w-xs text-xs">Members-only content is unlocked.</p>
          <Button block onClick={onClose} className="mt-1">
            Done
          </Button>
        </div>
      )}

      {phase === "failed" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="bg-danger/15 text-danger grid h-14 w-14 place-items-center rounded-full">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </span>
          <p className="font-medium">We couldn&rsquo;t confirm that payment</p>
          <Button block variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Sheet>
  );
}
