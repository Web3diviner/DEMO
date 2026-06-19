"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays } from "lucide-react";
import { api } from "@/lib/api/client";
import type { BattleState } from "@/lib/api/types";
import { BattleCard } from "./battle-card";
import { cn } from "@/lib/utils/cn";

const TABS: { key: BattleState | "all"; label: string }[] = [
  { key: "voting", label: "Live" },
  { key: "open", label: "Upcoming" },
  { key: "settled", label: "Past" },
];

export function BattlesScreen() {
  const [tab, setTab] = React.useState<BattleState | "all">("voting");

  const { data: battles, status } = useQuery({
    queryKey: ["battles", tab],
    queryFn: ({ signal }) => api.battles.list(tab, signal),
  });

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Battles</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="text-muted hover:text-fg flex items-center gap-1.5 text-sm font-medium"
          >
            <CalendarDays className="h-4 w-4" aria-hidden /> Events
          </Link>
          <Link
            href="/charts"
            className="text-muted hover:text-fg flex items-center gap-1.5 text-sm font-medium"
          >
            <BarChart3 className="h-4 w-4" aria-hidden /> Charts
          </Link>
        </div>
      </div>
      <p className="text-muted mt-1 text-sm">
        Back your favourite with Credits. Verified votes count more.
      </p>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Battle status"
        className="bg-surface rounded-pill mt-4 flex gap-1 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-pill flex-1 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-brand text-brand-fg" : "text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {status === "pending" &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-surface h-56 animate-pulse rounded-lg" />
          ))}
        {status === "success" && battles?.length === 0 && (
          <p className="text-subtle py-10 text-center text-sm">
            Nothing here yet — check back soon.
          </p>
        )}
        {battles?.map((b) => (
          <BattleCard key={b.id} battle={b} />
        ))}
      </div>
    </main>
  );
}
