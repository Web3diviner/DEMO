"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, TrendingUp, ChevronUp, ChevronDown, Minus } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { ChartBoard, ChartEntry } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

// MVP boards (PRD §11): campus chart + rising stars. State/national/genre land with multi-campus.
const TABS: { key: ChartBoard; label: string }[] = [
  { key: "campus", label: "Campus" },
  { key: "rising", label: "Rising Stars" },
];

const score = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

function Delta({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <span className="text-success flex items-center text-xs font-semibold tabular-nums">
        <ChevronUp className="h-3 w-3" aria-hidden />
        {delta}
        <span className="sr-only">up</span>
      </span>
    );
  if (delta < 0)
    return (
      <span className="text-danger flex items-center text-xs font-semibold tabular-nums">
        <ChevronDown className="h-3 w-3" aria-hidden />
        {Math.abs(delta)}
        <span className="sr-only">down</span>
      </span>
    );
  return (
    <span className="text-subtle flex items-center" aria-label="no change">
      <Minus className="h-3 w-3" aria-hidden />
    </span>
  );
}

export function ChartsScreen() {
  const [board, setBoard] = React.useState<ChartBoard>("campus");

  const { data: chart, status } = useQuery({
    queryKey: ["chart", board],
    queryFn: ({ signal }) => api.charts.get(board, null, signal),
  });

  const rising = board === "rising";

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/battles" aria-label="Back" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Charts</h1>
      </div>

      <div
        role="tablist"
        aria-label="Chart board"
        className="bg-surface rounded-pill mt-4 flex gap-1 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={board === t.key}
            onClick={() => setBoard(t.key)}
            className={cn(
              "rounded-pill flex-1 py-1.5 text-sm font-medium transition-colors",
              board === t.key ? "bg-brand text-brand-fg" : "text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-subtle mt-3 flex items-center gap-1.5 text-xs">
        {rising ? (
          <>
            <TrendingUp className="h-3.5 w-3.5" aria-hidden /> Ranked by growth velocity — newcomers
            rise fast. {chart?.periodLabel}.
          </>
        ) : (
          <>
            {chart?.scope ? `${chart.scope} · ` : ""}
            {chart?.periodLabel}. Verified votes carry more weight.
          </>
        )}
      </p>

      <ol className="divide-line mt-3 divide-y">
        {status === "pending" &&
          Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="bg-surface my-1 h-14 animate-pulse rounded-md" />
          ))}
        {chart?.entries.map((e) => (
          <Row key={e.creator.id} entry={e} rising={rising} />
        ))}
      </ol>
    </main>
  );
}

function Row({ entry, rising }: { entry: ChartEntry; rising: boolean }) {
  const { rank, creator } = entry;
  const top3 = rank <= 3;
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={cn(
          "w-6 text-center text-lg font-bold tabular-nums",
          top3 ? "text-gold" : "text-subtle",
        )}
      >
        {rank}
      </span>
      <div className="bg-brand text-brand-fg grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold">
        {creator.displayName.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 font-semibold">
          <span className="truncate">@{creator.handle}</span>
          {creator.verified && (
            <BadgeCheck className="text-gold h-3.5 w-3.5 shrink-0" aria-label="Verified" />
          )}
        </p>
        {creator.campus && <p className="text-subtle truncate text-xs">{creator.campus}</p>}
      </div>
      <div className="text-right">
        {rising ? (
          <span className="text-success text-sm font-bold tabular-nums">+{entry.risingPct}%</span>
        ) : (
          <span className="text-sm font-semibold tabular-nums">{score.format(entry.score)}</span>
        )}
        <div className="flex justify-end">
          <Delta delta={entry.delta} />
        </div>
      </div>
    </li>
  );
}
