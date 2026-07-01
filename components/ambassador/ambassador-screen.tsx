"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Copy, Check, Share2, Trophy, Sparkles, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import { format } from "@/lib/money";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";

const num = new Intl.NumberFormat("en-NG");

export function AmbassadorScreen() {
  const [copied, setCopied] = React.useState(false);

  const { data, status } = useQuery({
    queryKey: ["ambassador"],
    queryFn: ({ signal }) => api.ambassador.get(signal),
  });

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referralUrl);
      setCopied(true);
      track({ type: "route_view", path: "/ambassador:copy" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = () => {
    if (!data) return;
    void navigator
      .share?.({
        title: "Join me on Skylora",
        text: "Come show your talent on Skylora 🎤",
        url: data.referralUrl,
      })
      .catch(() => {});
  };

  if (status === "pending") {
    return (
      <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
        <div className="bg-surface h-40 animate-pulse rounded-lg" />
      </main>
    );
  }
  if (status === "error" || !data) {
    return <div className="text-muted h-dscreen grid place-items-center">Couldn&apos;t load.</div>;
  }

  const { code, stats, tier, leaderboard } = data;
  const progress = Math.min(100, Math.round((tier.activated / tier.nextAt) * 100));

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Megaphone className="text-brand h-6 w-6" aria-hidden /> Campus Ambassador
      </h1>
      <p className="text-muted mt-1 text-sm">Grow your campus on Skylora and earn Credits.</p>

      {/* Referral card */}
      <section className="border-line bg-surface mt-5 rounded-lg border p-5">
        <p className="text-subtle text-xs font-medium uppercase">Your referral code</p>
        <p className="mt-1 text-2xl font-bold tracking-wide">{code}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="rounded-pill bg-brand text-brand-fg flex h-11 flex-1 items-center justify-center gap-2 font-medium active:scale-[0.98]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={share}
            aria-label="Share"
            className="border-line grid h-11 w-11 place-items-center rounded-full border active:scale-[0.96]"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        <p className="text-subtle mt-3 flex items-center gap-1.5 text-xs">
          <ShieldCheck className="text-gold h-3.5 w-3.5 shrink-0" aria-hidden />
          You earn when invites get <strong className="mx-1">verified &amp; active</strong> — not
          just for sign-ups.
        </p>
      </section>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Invited" value={stats.invited} />
        <Stat label="Joined" value={stats.joined} />
        <Stat label="Activated" value={stats.activated} highlight />
      </div>

      {/* Tier progress */}
      <section className="border-line bg-surface mt-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold">
            <Trophy className="text-gold h-4 w-4" aria-hidden /> {tier.name}
          </span>
          <span className="text-gold flex items-center gap-1 text-sm font-semibold">
            <Sparkles className="h-4 w-4" aria-hidden /> {format(stats.rewards)} earned
          </span>
        </div>
        <div
          className="bg-elevated mt-3 h-2.5 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={tier.activated}
          aria-valuemin={0}
          aria-valuemax={tier.nextAt}
        >
          <div className="bg-brand h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-subtle mt-2 text-xs">
          {tier.nextAt - tier.activated} more activations to unlock {format(tier.nextReward)}.
        </p>
      </section>

      {/* Leaderboard */}
      <h2 className="text-muted mt-6 mb-2 text-sm font-medium">Campus leaderboard</h2>
      <ol className="divide-line divide-y">
        {leaderboard.map((a) => (
          <li
            key={a.handle}
            className={cn(
              "flex items-center gap-3 py-3",
              a.you && "bg-brand/5 -mx-2 rounded-md px-2",
            )}
          >
            <span
              className={cn(
                "w-5 text-center font-bold tabular-nums",
                a.rank <= 3 ? "text-gold" : "text-subtle",
              )}
            >
              {a.rank}
            </span>
            <div className="bg-brand text-brand-fg grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold">
              {a.displayName.charAt(0)}
            </div>
            <span className="flex-1 font-medium">
              @{a.handle} {a.you && <span className="text-brand text-xs">(you)</span>}
            </span>
            <span className="text-sm tabular-nums">{num.format(a.activations)}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3 text-center">
      <div className={cn("text-2xl font-bold tabular-nums", highlight && "text-brand")}>
        {num.format(value)}
      </div>
      <div className="text-subtle text-xs">{label}</div>
    </div>
  );
}
