"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Coins,
  ShieldAlert,
  TrendingUp,
  Wallet,
  Undo2,
  Check,
  Snowflake,
  ArrowUpRight,
  Flag,
  Inbox,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { format } from "@/lib/money";
import { ago } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import type { FraudAction, FraudSignal, LedgerEntry } from "@/lib/api/types";

const SEVERITY: Record<FraudSignal["severity"], string> = {
  high: "bg-danger/15 text-danger",
  medium: "bg-warning/15 text-warning",
  low: "bg-elevated text-muted",
};

const FRAUD_LABEL: Record<FraudSignal["type"], string> = {
  velocity: "Velocity",
  chargeback: "Chargeback risk",
  self_dealing: "Self-dealing",
  multi_account: "Multi-account",
  payout_mismatch: "Payout mismatch",
};

const KIND_LABEL: Record<LedgerEntry["kind"], string> = {
  topup: "Top-up",
  tip: "Tip",
  battle: "Battle",
  market: "Market",
  conversion: "Conversion",
  withdrawal: "Withdrawal",
  commission: "Commission",
  refund: "Refund",
};

export function TreasuryConsole() {
  const qc = useQueryClient();

  const { data: ledger, status: ledgerStatus } = useQuery({
    queryKey: ["admin-ledger"],
    queryFn: ({ signal }) => api.admin.ledger(signal),
  });
  const { data: signals, status: fraudStatus } = useQuery({
    queryKey: ["admin-fraud"],
    queryFn: ({ signal }) => api.admin.fraud(signal),
  });

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: FraudAction }) =>
      api.admin.resolveFraud(id, action),
    // Optimistically drop the resolved signal; rollback on error.
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["admin-fraud"] });
      const prev = qc.getQueryData<FraudSignal[]>(["admin-fraud"]);
      qc.setQueryData<FraudSignal[]>(["admin-fraud"], (cur) =>
        (cur ?? []).filter((s) => s.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-fraud"], ctx.prev);
    },
  });

  const totals = ledger?.totals;
  const highRisk = signals?.filter((s) => s.severity === "high").length ?? 0;

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Banknote className="h-5 w-5" aria-hidden /> Treasury &amp; Risk
      </h1>
      <p className="text-muted mt-1 text-sm">
        Platform money ledger and fraud signals. Server-truth figures; staff-only. Every resolution
        is logged and re-checked server-side.
      </p>

      {/* Money roll-up */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Money
          icon={TrendingUp}
          label="Gross volume"
          value={totals ? format(totals.grossVolume, { compact: true }) : "—"}
        />
        <Money
          icon={Banknote}
          label="Platform revenue"
          value={totals ? format(totals.platformRevenue, { compact: true }) : "—"}
          tone="ok"
        />
        <Money
          icon={Wallet}
          label="Owed to creators"
          value={totals ? format(totals.creatorPayable, { compact: true }) : "—"}
        />
        <Money
          icon={Coins}
          label="Credits in circulation"
          value={totals ? format(totals.creditsInCirculation, { compact: true }) : "—"}
        />
        <Money
          icon={Undo2}
          label="Refunded"
          value={totals ? format(totals.refunded, { compact: true }) : "—"}
          tone="danger"
        />
        <Money
          icon={ShieldAlert}
          label="High-risk signals"
          value={String(highRisk)}
          tone="danger"
        />
      </div>

      {/* Fraud signals */}
      <h2 className="mt-7 flex items-center gap-2 text-sm font-semibold">
        <ShieldAlert className="h-4 w-4" aria-hidden /> Risk signals
        {signals && signals.length > 0 && (
          <span className="bg-danger/15 text-danger rounded-pill px-2 py-0.5 text-xs font-bold">
            {signals.length}
          </span>
        )}
      </h2>
      <div className="mt-3 space-y-3">
        {fraudStatus === "pending" &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-surface h-24 animate-pulse rounded-lg" />
          ))}
        {fraudStatus === "success" && signals?.length === 0 && (
          <div className="text-muted grid place-items-center gap-2 py-12 text-center text-sm">
            <Inbox className="h-8 w-8" aria-hidden />
            No open signals. The books look clean.
          </div>
        )}
        {signals?.map((s) => (
          <Signal
            key={s.id}
            signal={s}
            onResolve={(action) => resolve.mutate({ id: s.id, action })}
          />
        ))}
      </div>

      {/* Ledger */}
      <h2 className="mt-7 text-sm font-semibold">Recent ledger</h2>
      <div className="border-line divide-line bg-surface mt-3 divide-y overflow-hidden rounded-lg border">
        {ledgerStatus === "pending" &&
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse" />)}
        {ledger?.entries.map((e) => (
          <Entry key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}

function Money({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "ok" | "danger";
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3">
      <div className="text-subtle flex items-center gap-1.5 text-xs">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-bold tabular-nums",
          tone === "danger" && "text-danger",
          tone === "ok" && "text-success",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Signal({
  signal,
  onResolve,
}: {
  signal: FraudSignal;
  onResolve: (action: FraudAction) => void;
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-pill text-2xs px-2 py-0.5 font-bold uppercase",
            SEVERITY[signal.severity],
          )}
        >
          {signal.severity}
        </span>
        <span className="text-muted text-xs font-medium">{FRAUD_LABEL[signal.type]}</span>
        {signal.amount && (
          <span className="text-fg text-xs font-semibold tabular-nums">
            {format(signal.amount, { compact: true })}
          </span>
        )}
        <span className="text-subtle text-2xs ml-auto">{ago(signal.detectedAt)}</span>
      </div>
      <p className="mt-1.5 text-sm">{signal.summary}</p>
      <p className="text-muted text-xs">
        @{signal.subject.handle} · {signal.subject.displayName}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Action label="Clear" tone="ok" icon={Check} onClick={() => onResolve("clear")} />
        <Action
          label="Freeze funds"
          tone="danger"
          icon={Snowflake}
          onClick={() => onResolve("freeze")}
        />
        <Action label="Escalate" icon={ArrowUpRight} onClick={() => onResolve("escalate")} />
      </div>
    </div>
  );
}

function Action({
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ok" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        tone === "danger"
          ? "border-danger/30 text-danger hover:bg-danger/10"
          : tone === "ok"
            ? "border-success/30 text-success hover:bg-success/10"
            : "border-line text-fg hover:bg-elevated",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Entry({ entry }: { entry: LedgerEntry }) {
  const debit = entry.amount.minor < 0;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="bg-elevated text-muted text-2xs rounded-pill shrink-0 px-2 py-0.5 font-medium">
        {KIND_LABEL[entry.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {entry.description}
          {entry.flagged && (
            <Flag
              className="text-danger ml-1 inline h-3 w-3 align-[-1px]"
              aria-label="Flagged for review"
            />
          )}
        </p>
        <p className="text-subtle text-xs">
          {entry.counterparty ? `@${entry.counterparty} · ` : ""}
          {ago(entry.createdAt)}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          debit ? "text-danger" : "text-fg",
        )}
      >
        {format(entry.amount)}
      </span>
    </div>
  );
}
