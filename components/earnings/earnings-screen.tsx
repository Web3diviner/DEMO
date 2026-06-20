"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpFromLine,
  Coins,
  Crown,
  Gift,
  Landmark,
  ShoppingBag,
  Swords,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { fromMinor, format } from "@/lib/money";
import { ago } from "@/lib/utils/time";
import { Button } from "@/components/ui/button";
import { WithdrawSheet } from "./withdraw-sheet";
import { PayoutMethodSheet } from "./payout-method-sheet";
import { cn } from "@/lib/utils/cn";
import type { EarningEntry, EarningSource, EarningsSummary } from "@/lib/api/types";

const SOURCE: Record<EarningSource, React.ComponentType<{ className?: string }>> = {
  tip: Coins,
  battle: Swords,
  fanclub: Crown,
  market: ShoppingBag,
  bonus: Gift,
  withdrawal: ArrowUpFromLine,
};

const PLACEHOLDER: EarningsSummary = {
  available: fromMinor(0, "NGN"),
  pending: fromMinor(0, "NGN"),
  lifetime: fromMinor(0, "NGN"),
  payoutMethod: null,
  entries: [],
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "muted" }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-subtle text-xs">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate font-semibold tabular-nums",
          tone === "muted" ? "text-muted" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EntryRow({ entry }: { entry: EarningEntry }) {
  const Icon = SOURCE[entry.source];
  const debit = entry.amount.minor < 0;
  const magnitude = fromMinor(Math.abs(entry.amount.minor), entry.amount.currency);
  return (
    <div className="flex items-center gap-3 py-3">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
          debit ? "bg-elevated text-muted" : "bg-gold/15 text-gold",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.label}</p>
        <p className="text-subtle text-xs">
          {ago(entry.createdAt)}
          {entry.status === "pending" && (
            <span className="text-warning ml-1.5 font-medium">· Pending</span>
          )}
        </p>
      </div>
      <span className={cn("shrink-0 text-sm font-semibold tabular-nums", !debit && "text-gold")}>
        {debit ? "−" : "+"}
        {format(magnitude)}
      </span>
    </div>
  );
}

export function EarningsScreen() {
  const qc = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [payoutOpen, setPayoutOpen] = React.useState(false);

  const { data = PLACEHOLDER, status } = useQuery({
    queryKey: ["earnings"],
    queryFn: ({ signal }) => api.earnings.summary(signal),
  });

  const onWithdrawn = (summary: EarningsSummary) => {
    qc.setQueryData(["earnings"], summary);
    // Keep the wallet card (Credits screen) in sync with the new withdrawable balance.
    qc.setQueryData<{ credits: unknown; earnings: unknown }>(["wallet"], (w) =>
      w ? { ...w, earnings: summary.available } : w,
    );
  };

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/credits" aria-label="Back to wallet" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>
      </div>

      {/* Withdrawable balance */}
      <section className="border-gold/30 bg-surface mt-5 rounded-lg border p-5">
        <div className="text-muted flex items-center gap-2">
          <TrendingUp className="text-gold h-4 w-4" aria-hidden />
          <span className="text-sm font-medium">Available to withdraw</span>
        </div>
        <p className="text-gold mt-2 text-4xl font-semibold tabular-nums">
          {format(data.available)}
        </p>
        <div className="border-line mt-4 flex gap-4 border-t pt-4">
          <Stat label="Pending" value={format(data.pending)} tone="muted" />
          <Stat label="Lifetime" value={format(data.lifetime)} />
        </div>
        <Button
          block
          className="mt-4"
          disabled={data.available.minor === 0}
          onClick={() => setWithdrawOpen(true)}
        >
          <ArrowUpFromLine className="mr-1 h-4 w-4" aria-hidden /> Withdraw
        </Button>
      </section>

      {/* Payout method */}
      <div className="border-line bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3">
        <span className="bg-elevated text-muted grid h-9 w-9 shrink-0 place-items-center rounded-full">
          <Landmark className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {data.payoutMethod
              ? `${data.payoutMethod.bank} ${data.payoutMethod.accountMask}`
              : "No payout method"}
          </p>
          <p className="text-subtle text-xs">Payout account</p>
        </div>
        <button
          type="button"
          onClick={() => setPayoutOpen(true)}
          className="text-brand text-sm font-medium"
        >
          {data.payoutMethod ? "Change" : "Add"}
        </button>
      </div>

      {/* Ledger */}
      <h2 className="text-subtle mt-6 mb-1 px-1 text-xs font-medium tracking-wide uppercase">
        Recent activity
      </h2>
      {status === "pending" ? (
        <ul className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="bg-surface h-14 animate-pulse rounded-lg" />
          ))}
        </ul>
      ) : data.entries.length === 0 ? (
        <p className="text-subtle py-10 text-center text-sm">
          No earnings yet. Tips, battles and Fan Club income show up here.
        </p>
      ) : (
        <ul className="divide-line/60 divide-y">
          {data.entries.map((e) => (
            <li key={e.id}>
              <EntryRow entry={e} />
            </li>
          ))}
        </ul>
      )}

      <WithdrawSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        available={data.available}
        payoutMethod={data.payoutMethod}
        onConfirmed={onWithdrawn}
      />
      <PayoutMethodSheet
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        currentMethod={data.payoutMethod}
        onSaved={(summary) => qc.setQueryData(["earnings"], summary)}
      />
    </main>
  );
}
