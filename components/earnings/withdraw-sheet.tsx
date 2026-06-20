"use client";

import * as React from "react";
import { Check, Loader2, AlertTriangle, Landmark } from "lucide-react";
import { api } from "@/lib/api/client";
import { fromMinor, format } from "@/lib/money";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { EarningsSummary, Money, PayoutMethod } from "@/lib/api/types";

type Phase = "form" | "processing" | "success" | "failed";

/** Partial-withdrawal presets. Computed in integer minor units, so there's never float drift. */
const PRESETS = [
  { label: "25%", frac: 0.25 },
  { label: "50%", frac: 0.5 },
  { label: "All", frac: 1 },
] as const;

export function WithdrawSheet({
  open,
  onClose,
  available,
  payoutMethod,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  available: Money;
  payoutMethod: PayoutMethod | null;
  onConfirmed: (summary: EarningsSummary) => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("form");
  const [fracIdx, setFracIdx] = React.useState(2); // default "All"
  const [error, setError] = React.useState<string | null>(null);

  // Reset whenever the sheet (re)opens — adjust-state-during-render, not an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPhase("form");
      setFracIdx(2);
      setError(null);
    }
  }

  const frac = PRESETS[fracIdx].frac;
  const amountMinor = frac === 1 ? available.minor : Math.floor(available.minor * frac);
  const amount = fromMinor(amountMinor, available.currency);
  const canWithdraw = amountMinor > 0 && !!payoutMethod;

  const withdraw = async () => {
    setPhase("processing");
    setError(null);
    track({ type: "route_view", path: "/earnings:withdraw-start" });
    try {
      const res = await api.earnings.withdraw(amountMinor);
      if (res.status === "processing") {
        onConfirmed(res.summary);
        setPhase("success");
      } else {
        setPhase("failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start that withdrawal");
      setPhase("failed");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Withdraw earnings">
      {phase === "form" && (
        <>
          <p className="text-subtle text-sm">
            Available to withdraw
            <span className="text-gold ml-1 font-semibold tabular-nums">{format(available)}</span>
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setFracIdx(i)}
                aria-pressed={i === fracIdx}
                className={cn(
                  "rounded-lg border py-3 text-sm font-semibold transition-colors",
                  i === fracIdx ? "border-gold bg-gold/10 text-gold" : "border-line text-fg",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="border-line bg-surface mt-3 flex items-center gap-3 rounded-lg border p-3">
            <span className="bg-gold/15 text-gold grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <Landmark className="h-4 w-4" aria-hidden />
            </span>
            {payoutMethod ? (
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-medium">
                  {payoutMethod.bank} {payoutMethod.accountMask}
                </span>
                <span className="text-subtle text-xs">Arrives in 1–2 business days</span>
              </span>
            ) : (
              <span className="text-muted flex-1 text-sm">Add a bank account to withdraw.</span>
            )}
          </div>

          <Button block className="mt-4" disabled={!canWithdraw} onClick={withdraw}>
            {payoutMethod ? `Withdraw ${format(amount)}` : "Add payout method"}
          </Button>
          <p className="text-subtle mt-3 text-center text-xs">
            Earnings are real money, kept separate from Credits. Balance updates once your bank
            confirms.
          </p>
        </>
      )}

      {phase === "processing" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
          <Loader2 className="text-gold h-8 w-8 animate-spin" aria-hidden />
          <p className="font-medium">Starting your withdrawal…</p>
        </div>
      )}

      {phase === "success" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">On its way 🎉</p>
          <p className="text-subtle max-w-xs text-xs">
            {format(amount)} is heading to {payoutMethod?.bank} {payoutMethod?.accountMask}.
            It&apos;s in your activity as pending until your bank settles it.
          </p>
          <Button block onClick={onClose} className="mt-2">
            Done
          </Button>
        </div>
      )}

      {phase === "failed" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="bg-danger/15 text-danger grid h-14 w-14 place-items-center rounded-full">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </span>
          <p className="font-medium">{error ?? "We couldn't start that withdrawal"}</p>
          <p className="text-subtle max-w-xs text-xs">No money has moved. You can try again.</p>
          <div className="mt-2 flex w-full gap-2">
            <Button block variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button block onClick={() => setPhase("form")}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
