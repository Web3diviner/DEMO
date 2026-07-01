"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, ArrowDownToLine, Info } from "lucide-react";
import { api } from "@/lib/api/client";
import { fromMinor, format } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { TopUpSheet } from "./top-up-sheet";
import type { Wallet } from "@/lib/api/types";

const PLACEHOLDER: Wallet = {
  credits: fromMinor(0, "CREDITS"),
  earnings: fromMinor(0, "NGN"),
};

export function CreditsScreen() {
  const qc = useQueryClient();
  const [topUpOpen, setTopUpOpen] = React.useState(false);

  const { data: wallet = PLACEHOLDER } = useQuery({
    queryKey: ["wallet"],
    queryFn: ({ signal }) => api.wallet.get(signal),
  });

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>

      {/* Fan Credits — spendable, not cashable. */}
      <section className="border-line bg-surface mt-5 rounded-lg border p-5">
        <div className="text-muted flex items-center gap-2">
          <Sparkles className="text-brand h-4 w-4" aria-hidden />
          <span className="text-sm font-medium">Fan Credits</span>
        </div>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{format(wallet.credits)}</p>
        <p className="text-subtle mt-1 flex items-center gap-1 text-xs">
          <Info className="h-3 w-3" aria-hidden /> Spend on battles, gifts &amp; boosts. Credits
          don&apos;t cash out.
        </p>
        <Button block className="mt-4" onClick={() => setTopUpOpen(true)}>
          Top up Credits
        </Button>
      </section>

      {/* Creator earnings — withdrawable, clearly separate. */}
      <section className="border-gold/30 bg-surface mt-4 rounded-lg border p-5">
        <div className="text-muted flex items-center gap-2">
          <ArrowDownToLine className="text-gold h-4 w-4" aria-hidden />
          <span className="text-sm font-medium">Creator earnings</span>
        </div>
        <p className="text-gold mt-2 text-3xl font-semibold tabular-nums">
          {format(wallet.earnings)}
        </p>
        <p className="text-subtle mt-1 text-xs">
          Withdraw to your bank or convert. Separate from Credits.
        </p>
        <Link
          href="/earnings"
          className="rounded-pill border-gold/40 text-gold mt-4 flex h-11 items-center justify-center border font-medium active:scale-[0.98]"
        >
          Manage earnings
        </Link>
      </section>

      <TopUpSheet
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onConfirmed={(w) => qc.setQueryData(["wallet"], w)}
      />
    </main>
  );
}
