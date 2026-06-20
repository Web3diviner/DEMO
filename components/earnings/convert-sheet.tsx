"use client";

import * as React from "react";
import { Check, Loader2, AlertTriangle, Coins, ArrowRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { fromMinor, format } from "@/lib/money";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { ConversionResult, Money } from "@/lib/api/types";

type Phase = "form" | "processing" | "success" | "failed";

/** 1 Credit = ₦5 (500 kobo) — mirrors the 100-credit pack price. Quoted here only to preview the
 * result; the server is the source of truth for how many Credits actually land. */
const KOBO_PER_CREDIT = 500;

/** Partial-conversion presets. Computed in integer minor units so there's never float drift. */
const PRESETS = [
  { label: "25%", frac: 0.25 },
  { label: "50%", frac: 0.5 },
  { label: "All", frac: 1 },
] as const;

export function ConvertSheet({
  open,
  onClose,
  available,
  onConverted,
}: {
  open: boolean;
  onClose: () => void;
  available: Money;
  onConverted: (result: ConversionResult) => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("form");
  const [fracIdx, setFracIdx] = React.useState(2); // default "All"
  const [error, setError] = React.useState<string | null>(null);
  const [gained, setGained] = React.useState(0);

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
  // Floor to whole Credits, then only count the kobo that converts cleanly.
  const credits = Math.floor(amountMinor / KOBO_PER_CREDIT);
  const spendMinor = credits * KOBO_PER_CREDIT;
  const spend = fromMinor(spendMinor, available.currency);
  const canConvert = credits >= 1;

  const convert = async () => {
    setPhase("processing");
    setError(null);
    track({ type: "route_view", path: "/earnings:convert-start" });
    try {
      const res = await api.earnings.convert(amountMinor);
      setGained(res.credits);
      onConverted(res);
      setPhase("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't convert that amount");
      setPhase("failed");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Convert to Credits">
      {phase === "form" && (
        <>
          <p className="text-subtle text-sm">
            Available to convert
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
                  i === fracIdx ? "border-brand bg-brand/10 text-brand" : "border-line text-fg",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Conversion preview: earnings in → Credits out, server-quoted rate. */}
          <div className="border-line bg-surface mt-3 flex items-center justify-between gap-3 rounded-lg border p-4">
            <div className="min-w-0">
              <p className="text-subtle text-xs">You convert</p>
              <p className="mt-0.5 truncate font-semibold tabular-nums">{format(spend)}</p>
            </div>
            <ArrowRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0 text-right">
              <p className="text-subtle text-xs">You get</p>
              <p className="text-brand mt-0.5 flex items-center justify-end gap-1 font-semibold tabular-nums">
                <Coins className="h-4 w-4" aria-hidden />
                {credits.toLocaleString()}
              </p>
            </div>
          </div>

          <Button block className="mt-4" disabled={!canConvert} onClick={convert}>
            {canConvert ? `Convert to ${credits.toLocaleString()} Credits` : "Amount too small"}
          </Button>
          <p className="text-subtle mt-3 text-center text-xs">
            1 Credit = ₦5. Credits are spendable on-platform but can&apos;t be cashed out, so
            convert only what you plan to spend.
          </p>
        </>
      )}

      {phase === "processing" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
          <Loader2 className="text-brand h-8 w-8 animate-spin" aria-hidden />
          <p className="font-medium">Converting…</p>
        </div>
      )}

      {phase === "success" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">+{gained.toLocaleString()} Credits 🎉</p>
          <p className="text-subtle max-w-xs text-xs">
            They&apos;re in your wallet now — ready for tips, votes and Fan Club perks.
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
          <p className="font-medium">{error ?? "We couldn't convert that amount"}</p>
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
