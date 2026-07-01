"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ShieldCheck,
  Wallet,
  Sparkles,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { openCheckout } from "@/lib/payments/paystack";
import { useSession, patchSession } from "@/lib/auth/session";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

const perks = [
  { Icon: BadgeCheck, title: "Verified badge", body: "A gold check that proves it's really you." },
  {
    Icon: Sparkles,
    title: "Unlock creator tools",
    body: "Battles, earnings, and your Talent Hub.",
  },
  {
    Icon: Wallet,
    title: "Invisible wallet",
    body: "Set up for you automatically — no seed phrase, no gas.",
  },
];

type Phase = "intro" | "checkout" | "pending" | "minting" | "verified" | "failed";

async function pollUntilSettled(reference: string, signal: AbortSignal) {
  const deadline = Date.now() + 30_000;
  let status: "pending" | "minting" | "verified" | "failed" = "pending";
  while (Date.now() < deadline && !signal.aborted) {
    const s = await api.creators.registerStatus(reference, signal);
    status = s.status;
    if (status === "verified" || status === "failed") return status;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return status;
}

export function CreatorRegister() {
  const session = useSession();
  const alreadyVerified = session.user?.verifiedCreator ?? false;
  const [phase, setPhase] = React.useState<Phase>("intro");
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const verify = async () => {
    setPhase("checkout");
    track({ type: "route_view", path: "/creator/register:start" });
    try {
      const intent = await api.creators.registerIntent();
      const outcome = await openCheckout(intent);
      if (outcome === "cancelled") {
        setPhase("intro");
        return;
      }
      // Payment submitted — wait for the webhook confirm, then the gas-sponsored mint. NO optimistic badge.
      setPhase("pending");
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      // Surface the mint step as soon as the backend reports it.
      const tick = setInterval(async () => {
        try {
          const s = await api.creators.registerStatus(intent.reference, ctrl.signal);
          if (s.status === "minting") setPhase("minting");
        } catch {
          /* ignore intermediate poll errors */
        }
      }, 1000);
      const status = await pollUntilSettled(intent.reference, ctrl.signal);
      clearInterval(tick);
      if (status === "verified") {
        patchSession({ verifiedCreator: true });
        setPhase("verified");
      } else {
        setPhase("failed");
      }
    } catch {
      setPhase("failed");
    }
  };

  if (alreadyVerified && phase !== "verified") {
    return (
      <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-10 pb-28 text-center">
        <span className="bg-gold/15 text-gold mx-auto grid h-16 w-16 place-items-center rounded-2xl">
          <BadgeCheck className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">You&apos;re verified ✓</h1>
        <p className="text-muted mt-2 text-sm">
          Your gold badge is live and your creator tools are unlocked.
        </p>
        <Link
          href="/profile"
          className="rounded-pill bg-brand text-brand-fg mt-6 inline-flex h-12 items-center justify-center px-6 font-medium"
        >
          Go to your Hub
        </Link>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-8 pb-28">
      <div className="bg-brand/15 text-gold grid h-14 w-14 place-items-center rounded-2xl">
        <ShieldCheck className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Become a verified creator</h1>
      <p className="text-muted mt-2 text-sm">
        A one-time <span className="text-fg font-semibold">$1</span> verification keeps Skylora real
        and unlocks everything you need to get discovered.
      </p>

      <ul className="mt-6 space-y-3">
        {perks.map(({ Icon, title, body }) => (
          <li key={title} className="border-line bg-surface flex gap-3 rounded-lg border p-4">
            <Icon className="text-gold mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-muted text-sm">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      {(phase === "intro" || phase === "checkout") && (
        <>
          <Button block size="lg" className="mt-6" busy={phase === "checkout"} onClick={verify}>
            {phase === "checkout" ? "Opening secure checkout…" : "Verify for $1"}
          </Button>
          <p className="text-subtle mt-3 text-center text-xs">
            Your badge appears once payment is confirmed. Secured by Paystack.
          </p>
        </>
      )}

      {(phase === "pending" || phase === "minting") && (
        <div
          className="mt-6 flex flex-col items-center gap-3 py-6 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="text-gold h-8 w-8 animate-spin" aria-hidden />
          <p className="font-medium">
            {phase === "pending" ? "Confirming your payment…" : "Minting your badge…"}
          </p>
          <p className="text-subtle max-w-xs text-xs">
            {phase === "pending"
              ? "We never charge your badge until Paystack confirms. Hang tight."
              : "Setting up your invisible wallet and badge — no gas, no seed phrase."}
          </p>
        </div>
      )}

      {phase === "verified" && (
        <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
          <span className="bg-gold/15 text-gold grid h-16 w-16 place-items-center rounded-full">
            <BadgeCheck className="h-8 w-8" aria-hidden />
          </span>
          <p className="text-lg font-semibold">You&apos;re verified! 🎉</p>
          <p className="text-subtle max-w-xs text-xs">
            Your gold badge is live and your creator tools are unlocked.
          </p>
          <Link
            href="/profile"
            className="rounded-pill bg-brand text-brand-fg mt-1 inline-flex h-12 items-center justify-center px-6 font-medium"
          >
            Go to your Hub
          </Link>
        </div>
      )}

      {phase === "failed" && (
        <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
          <span className="bg-danger/15 text-danger grid h-14 w-14 place-items-center rounded-full">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </span>
          <p className="font-medium">We couldn&apos;t confirm that</p>
          <p className="text-subtle max-w-xs text-xs">
            If you were charged, your badge will appear automatically once confirmed. No charge was
            made if you cancelled.
          </p>
          <Button block className="mt-2" onClick={verify}>
            <Check className="mr-1 h-4 w-4" aria-hidden /> Try again
          </Button>
        </div>
      )}
    </main>
  );
}
