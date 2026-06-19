"use client";

import Link from "next/link";
import { Clock, Trophy, Sparkles } from "lucide-react";
import type { Battle } from "@/lib/api/types";
import { format } from "@/lib/money";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { cn } from "@/lib/utils/cn";

const FORMAT_LABEL: Record<Battle["format"], string> = {
  rap: "Rap",
  gospel: "Gospel",
  beat: "Beat",
  choir: "Choir",
  songwriting: "Songwriting",
};

const STATE_STYLE: Record<string, string> = {
  voting: "bg-live text-white",
  open: "bg-brand text-brand-fg",
  settled: "bg-elevated text-muted",
};

export function BattleCard({ battle }: { battle: Battle }) {
  const countdown = useCountdown(battle.endsAt);
  const [a, b] = battle.contestants;
  const total = a.votes + b.votes || 1;
  const aPct = Math.round((a.votes / total) * 100);

  return (
    <Link
      href={`/battles/${battle.id}`}
      className="border-line bg-surface block overflow-hidden rounded-lg border transition-transform active:scale-[0.99]"
    >
      {/* Split posters */}
      <div className="relative grid grid-cols-2">
        {[a, b].map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c.id}
            src={c.posterUrl}
            alt=""
            className={cn(
              "aspect-[4/3] w-full object-cover",
              i === 0 ? "rounded-tl-lg" : "rounded-tr-lg",
            )}
          />
        ))}
        <span className="bg-canvas text-2xs absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 font-black tracking-wider">
          VS
        </span>
        <span
          className={cn(
            "text-2xs rounded-pill absolute top-2 left-2 px-2 py-0.5 font-bold uppercase",
            STATE_STYLE[battle.state] ?? "bg-elevated text-muted",
          )}
        >
          {battle.state === "voting" ? "Live" : battle.state === "open" ? "Soon" : "Ended"}
        </span>
      </div>

      {/* Tally bar */}
      <div className="bg-elevated flex h-1.5">
        <span className="bg-brand h-full" style={{ width: `${aPct}%` }} />
        <span className="bg-live h-full" style={{ width: `${100 - aPct}%` }} />
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-subtle text-2xs font-medium uppercase">
            {FORMAT_LABEL[battle.format]}
          </span>
          {battle.state === "voting" && countdown && (
            <span className="text-live flex items-center gap-1 text-xs font-semibold tabular-nums">
              <Clock className="h-3 w-3" aria-hidden /> {countdown.label}
            </span>
          )}
          {battle.state === "settled" && (
            <span className="text-muted flex items-center gap-1 text-xs font-medium">
              <Trophy className="text-gold h-3 w-3" aria-hidden /> Settled
            </span>
          )}
        </div>
        <h3 className="mt-1 font-semibold">{battle.title}</h3>
        <p className="text-subtle mt-1 flex items-center gap-1 text-xs">
          <Sparkles className="h-3 w-3" aria-hidden /> {format(battle.prizePool)} prize pool
        </p>
      </div>
    </Link>
  );
}
