"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, TrendingUp } from "lucide-react";
import { api } from "@/lib/api/client";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { SCORE_META, scoreTone } from "./score-meta";

const num = new Intl.NumberFormat("en-NG");

/** A small inline sparkline for the overall-score trend. Pure SVG, no deps. */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-brand" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function TalentDetail({
  handle,
  open,
  onClose,
}: {
  handle: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, status } = useQuery({
    queryKey: ["scout-talent", handle],
    queryFn: ({ signal }) => api.scout.talent(handle!, signal),
    enabled: open && !!handle,
  });

  return (
    <Sheet open={open} onClose={onClose} title={handle ? `@${handle}` : "Talent"}>
      {status === "pending" && <p className="text-subtle py-8 text-center text-sm">Loading…</p>}
      {data && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1 text-lg font-semibold">
                {data.displayName}
                {data.verified && (
                  <BadgeCheck className="text-gold h-4 w-4" aria-label="Verified" />
                )}
              </p>
              <p className="text-subtle text-xs">
                {data.genre} · {data.campus} · {num.format(data.followers)} followers
              </p>
            </div>
            <div className="text-right">
              <div className="text-brand text-3xl font-bold tabular-nums">{data.overall}</div>
              <div className="text-subtle text-2xs uppercase">Overall</div>
            </div>
          </div>

          {/* Trend */}
          <div className="border-line bg-surface flex items-center justify-between rounded-lg border p-3">
            <span className="text-muted flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-4 w-4" aria-hidden /> 8-week trend
            </span>
            <Sparkline points={data.trend} />
          </div>

          {/* Explainable composite breakdown */}
          <div>
            <h3 className="text-muted mb-2 text-sm font-medium">Why this score</h3>
            <div className="space-y-3">
              {SCORE_META.map(({ key, label }) => {
                const v = Math.round(data.scores[key]);
                const factor = data.factors.find((f) => f.label === label);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="tabular-nums">{v}</span>
                    </div>
                    <div className="bg-elevated mt-1 h-2 w-full overflow-hidden rounded-full">
                      <div
                        className={cn("h-full rounded-full", scoreTone(v))}
                        style={{ width: `${v}%` }}
                      />
                    </div>
                    {factor && <p className="text-subtle mt-1 text-xs">{factor.detail}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-subtle text-2xs">
            Scores are explainable composites, not a single opaque number. Refreshed weekly.
          </p>
        </div>
      )}
    </Sheet>
  );
}
