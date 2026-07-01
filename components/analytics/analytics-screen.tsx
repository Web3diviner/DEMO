"use client";

import * as React from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { format } from "@/lib/money";
import { ViewsChart } from "./views-chart";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsRange } from "@/lib/api/types";

const RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "28d", label: "28 days" },
  { id: "90d", label: "90 days" },
];

const nf = new Intl.NumberFormat("en-NG");
const nfCompact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        up ? "text-success" : "text-danger",
      )}
    >
      <ArrowUpRight className={cn("h-3 w-3", !up && "rotate-90")} aria-hidden />
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: number;
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-4">
      <div className="text-muted flex items-center gap-1.5">
        <Icon className="h-4 w-4" aria-hidden />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5">
        <Delta value={delta} />
        <span className="text-subtle ml-1 text-xs">vs previous</span>
      </p>
    </div>
  );
}

export function AnalyticsScreen() {
  const [range, setRange] = React.useState<AnalyticsRange>("7d");
  const { data, status, isPlaceholderData } = useQuery({
    queryKey: ["analytics", range],
    queryFn: ({ signal }) => api.analytics.get(range, signal),
    placeholderData: keepPreviousData, // keep prior data visible while switching range
  });

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Back to hub" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
      </div>

      {/* Range selector */}
      <div role="tablist" aria-label="Date range" className="mt-4 flex gap-2">
        {RANGES.map((r) => {
          const active = range === r.id;
          return (
            <button
              key={r.id}
              role="tab"
              aria-selected={active}
              onClick={() => setRange(r.id)}
              className={cn(
                "rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-brand text-brand-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {status === "pending" && !data ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface h-24 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="text-muted mt-10 text-center text-sm">Couldn&apos;t load analytics.</p>
      ) : data ? (
        <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
          {/* Headline metrics */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricCard
              icon={Eye}
              label="Views"
              value={nfCompact.format(data.metrics.views.value)}
              delta={data.metrics.views.delta}
            />
            <MetricCard
              icon={Clock}
              label="Watch time"
              value={`${nfCompact.format(data.metrics.watchTimeHours.value)} h`}
              delta={data.metrics.watchTimeHours.delta}
            />
            <MetricCard
              icon={UserPlus}
              label="New followers"
              value={nf.format(data.metrics.followers.value)}
              delta={data.metrics.followers.delta}
            />
            <MetricCard
              icon={TrendingUp}
              label="Earnings"
              value={format(data.metrics.earnings.value, { compact: true })}
              delta={data.metrics.earnings.delta}
            />
          </div>

          {/* Views trend */}
          <section className="border-line bg-surface mt-4 rounded-lg border p-4">
            <h2 className="text-muted text-xs font-medium">Views</h2>
            <p className="mb-3 text-xl font-semibold tabular-nums">
              {nf.format(data.metrics.views.value)}
            </p>
            <ViewsChart series={data.series} />
          </section>

          {/* Top clips */}
          <h2 className="text-subtle mt-6 mb-1 px-1 text-xs font-medium tracking-wide uppercase">
            Top clips
          </h2>
          <ul className="divide-line/60 divide-y">
            {data.topClips.map((clip, i) => (
              <li key={clip.id}>
                <Link
                  href={`/analytics/${clip.id}`}
                  className="hover:bg-elevated/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3"
                >
                  <span className="text-subtle w-4 text-center text-sm font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="bg-elevated h-11 w-11 shrink-0 rounded-md" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{clip.caption}</p>
                    <p className="text-subtle flex items-center gap-2 text-xs tabular-nums">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" aria-hidden /> {nfCompact.format(clip.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" aria-hidden /> {nfCompact.format(clip.likes)}
                      </span>
                    </p>
                  </div>
                  <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          {/* Audience */}
          <h2 className="text-subtle mt-6 mb-2 px-1 text-xs font-medium tracking-wide uppercase">
            Top campuses
          </h2>
          <ul className="space-y-2.5">
            {data.topCampuses.map((c) => (
              <li key={c.name} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-sm">{c.name}</span>
                <span className="bg-elevated h-2 flex-1 overflow-hidden rounded-full">
                  <span
                    className="bg-brand block h-full rounded-full"
                    style={{ width: `${Math.round(c.share * 100)}%` }}
                  />
                </span>
                <span className="text-subtle w-9 text-right text-xs tabular-nums">
                  {Math.round(c.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
