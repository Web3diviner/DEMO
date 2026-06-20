"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { RetentionChart } from "./retention-chart";
import { cn } from "@/lib/utils/cn";
import type { TrafficSource } from "@/lib/api/types";

const nfCompact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

const SOURCE_LABEL: Record<TrafficSource, string> = {
  fyp: "For You",
  following: "Following",
  profile: "Profile",
  search: "Search",
  share: "Shares",
};

function Engagement({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="border-line bg-surface flex flex-col items-center gap-1 rounded-lg border py-3">
      <Icon className="text-muted h-4 w-4" aria-hidden />
      <span className="text-lg font-semibold tabular-nums">{nfCompact.format(value)}</span>
      <span className="text-subtle text-2xs">{label}</span>
    </div>
  );
}

export function ClipAnalyticsScreen({ clipId }: { clipId: string }) {
  const { data, status } = useQuery({
    queryKey: ["clip-analytics", clipId],
    queryFn: ({ signal }) => api.analytics.clip(clipId, signal),
  });

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/analytics" aria-label="Back to Studio" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-xl font-semibold tracking-tight">
          {data?.clip.caption ?? "Clip insights"}
        </h1>
      </div>

      {status === "pending" && (
        <div className="mt-4 space-y-3">
          <div className="bg-surface h-20 animate-pulse rounded-lg" />
          <div className="bg-surface h-40 animate-pulse rounded-lg" />
        </div>
      )}

      {status === "error" && (
        <p className="text-muted mt-10 text-center text-sm">Couldn&apos;t load clip insights.</p>
      )}

      {status === "success" && data && (
        <>
          {/* Engagement */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Engagement icon={Eye} label="Views" value={data.views} />
            <Engagement icon={Heart} label="Likes" value={data.likes} />
            <Engagement icon={MessageCircle} label="Comments" value={data.comments} />
            <Engagement icon={Share2} label="Shares" value={data.shares} />
          </div>

          {/* Watch metrics */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="border-line bg-surface rounded-lg border p-4">
              <p className="text-subtle text-xs">Avg. watched</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {Math.round(data.avgWatchPct * 100)}%
              </p>
            </div>
            <div className="border-line bg-surface rounded-lg border p-4">
              <p className="text-subtle text-xs">Completion</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {Math.round(data.completionRate * 100)}%
              </p>
            </div>
          </div>

          {/* Retention curve */}
          <section className="border-line bg-surface mt-4 rounded-lg border p-4">
            <h2 className="text-muted text-xs font-medium">Audience retention</h2>
            <p className="text-subtle mt-0.5 mb-3 text-xs">Share still watching across the clip</p>
            <RetentionChart data={data.retention} avgWatchPct={data.avgWatchPct} />
            <div className="text-subtle text-2xs mt-1 flex justify-between tabular-nums">
              <span>Start</span>
              <span>50%</span>
              <span>End</span>
            </div>
          </section>

          {/* Traffic sources */}
          <h2 className="text-subtle mt-6 mb-2 px-1 text-xs font-medium tracking-wide uppercase">
            Where views came from
          </h2>
          <ul className="space-y-2.5">
            {data.sources.map((s) => (
              <li key={s.source} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-sm">{SOURCE_LABEL[s.source]}</span>
                <span className="bg-elevated h-2 flex-1 overflow-hidden rounded-full">
                  <span
                    className={cn("bg-brand block h-full rounded-full")}
                    style={{ width: `${Math.round(s.share * 100)}%` }}
                  />
                </span>
                <span className="text-subtle w-9 text-right text-xs tabular-nums">
                  {Math.round(s.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
