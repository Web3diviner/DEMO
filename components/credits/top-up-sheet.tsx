"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api/client";
import { fromMinor, format } from "@/lib/money";
import { openCheckout } from "@/lib/payments/paystack";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { Wallet } from "@/lib/api/types";

type Phase = "select" | "processing" | "pending" | "success" | "failed";

async function pollUntilSettled(reference: string, signal: AbortSignal) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !signal.aborted) {
    const s = await api.credits.topUpStatus(reference, signal);
    if (s.status !== "pending") return s;
    await new Promise((r) => setTimeout(r, 1200));
  }
  return { reference, status: "failed" as const, wallet: null };
}

export function TopUpSheet({
  open,
  onClose,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  onConfirmed: (wallet: Wallet) => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("select");
  const [selected, setSelected] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const { data: packs } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: ({ signal }) => api.credits.packs(signal),
    enabled: open,
  });

  // Reset to pack selection when the sheet (re)opens — adjust-state-during-render, not an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPhase("select");
      setSelected(null);
    }
  }

  // Cancel any in-flight status poll when the sheet closes or unmounts (no setState here).
  React.useEffect(() => {
    if (!open) abortRef.current?.abort();
    return () => abortRef.current?.abort();
  }, [open]);

  const buy = async (packId: string) => {
    setSelected(packId);
    setPhase("processing");
    track({ type: "route_view", path: "/credits:topup-start" });
    try {
      const intent = await api.credits.createTopUp(packId);
      const outcome = await openCheckout(intent);
      if (outcome === "cancelled") {
        setPhase("select");
        return;
      }
      // Payment submitted — now wait for the backend's webhook confirmation. NO optimistic credit.
      setPhase("pending");
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const settled = await pollUntilSettled(intent.reference, ctrl.signal);
      if (settled.status === "success" && settled.wallet) {
        onConfirmed(settled.wallet);
        setPhase("success");
      } else {
        setPhase("failed");
      }
    } catch {
      setPhase("failed");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Top up Credits">
      {phase === "select" && (
        <ul className="space-y-2.5">
          {packs?.map((pack) => (
            <li key={pack.id}>
              <button
                type="button"
                onClick={() => buy(pack.id)}
                className="border-line hover:border-line-strong flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="bg-brand/15 text-brand grid h-10 w-10 place-items-center rounded-full">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {format(fromMinor(pack.credits, "CREDITS"))}
                    </span>
                    {pack.badge && (
                      <span className="text-gold text-xs font-medium">{pack.badge}</span>
                    )}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{format(pack.price)}</span>
              </button>
            </li>
          ))}
          <p className="text-subtle pt-2 text-center text-xs">
            Credits are spendable in DEMO and don&apos;t cash out. Secured by Paystack.
          </p>
        </ul>
      )}

      {(phase === "processing" || phase === "pending") && (
        <div
          className="flex flex-col items-center gap-3 py-10 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="text-brand h-8 w-8 animate-spin" aria-hidden />
          <p className="font-medium">
            {phase === "processing" ? "Opening secure checkout…" : "Confirming your payment…"}
          </p>
          <p className="text-subtle max-w-xs text-xs">
            Your balance updates only once payment is confirmed — this keeps Credits safe. Hang
            tight.
          </p>
        </div>
      )}

      {phase === "success" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Credits added</p>
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
          <p className="font-medium">We couldn&apos;t confirm that payment</p>
          <p className="text-subtle max-w-xs text-xs">
            If you were charged, your Credits will appear automatically once confirmed. No charge
            was made if you cancelled.
          </p>
          <div className={cn("mt-2 flex w-full gap-2")}>
            <Button block variant="secondary" onClick={onClose}>
              Close
            </Button>
            {selected && (
              <Button block onClick={() => buy(selected)}>
                Try again
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
