"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Check, Heart } from "lucide-react";
import { api } from "@/lib/api/client";
import { fromMinor, format, gte } from "@/lib/money";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { Wallet } from "@/lib/api/types";

const TIERS = [5, 20, 50, 100]; // Credits

export function TipSheet({
  clipId,
  creatorHandle,
  open,
  onClose,
}: {
  clipId: string;
  creatorHandle: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState<number>(TIERS[1]);
  const [done, setDone] = React.useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: ({ signal }) => api.wallet.get(signal),
    enabled: open,
  });

  // Reset on open (adjust-state-during-render, not an effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount(TIERS[1]);
      setDone(false);
    }
  }

  const tip = useMutation({
    mutationFn: (credits: number) => api.tips.send(clipId, credits),
    onSuccess: (res) => {
      qc.setQueryData<Wallet>(["wallet"], res.wallet);
      track({ type: "engagement", action: "support", clipId });
      setDone(true);
    },
  });

  const canAfford = wallet ? gte(wallet.credits, fromMinor(amount, "CREDITS")) : true;

  return (
    <Sheet open={open} onClose={onClose} title={`Support @${creatorHandle}`}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Thank you! 🎉</p>
          <p className="text-subtle max-w-xs text-xs">
            You sent {format(fromMinor(amount, "CREDITS"))} to @{creatorHandle}. Most goes straight
            to them; Skylora keeps a small fee.
          </p>
          <Button block onClick={onClose} className="mt-1">
            Done
          </Button>
        </div>
      ) : (
        <>
          <p className="text-subtle mb-3 flex items-center justify-center gap-1.5 text-sm">
            <Heart className="text-live h-4 w-4" aria-hidden /> Send Credits to back their talent
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAmount(t)}
                aria-pressed={amount === t}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border py-4 font-semibold transition-colors",
                  amount === t ? "border-brand bg-brand/10 text-brand" : "border-line text-fg",
                )}
              >
                <Coins className="h-4 w-4" aria-hidden /> {t}
              </button>
            ))}
          </div>

          {canAfford ? (
            <Button block className="mt-4" busy={tip.isPending} onClick={() => tip.mutate(amount)}>
              {tip.isPending ? "Sending…" : `Send ${format(fromMinor(amount, "CREDITS"))}`}
            </Button>
          ) : (
            <Link
              href="/credits"
              className="rounded-pill bg-brand text-brand-fg mt-4 flex h-11 items-center justify-center font-medium"
            >
              Top up to support
            </Link>
          )}

          {tip.isError && (
            <p className="text-danger mt-2 text-center text-sm" role="alert">
              {tip.error instanceof Error ? tip.error.message : "Couldn't send your tip."}
            </p>
          )}
          {wallet && (
            <p className="text-subtle mt-3 text-center text-xs">
              Balance: {format(wallet.credits)}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
