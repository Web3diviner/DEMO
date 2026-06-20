"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  BarChart3,
  ChevronRight,
  Crown,
  Film,
  Fingerprint,
  Gauge,
  Megaphone,
  MoreHorizontal,
  Play,
  Settings,
  Sparkles,
  Store,
  Swords,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useFlag } from "@/lib/flags-provider";
import { Button } from "@/components/ui/button";
import { SCORE_META, scoreTone } from "@/components/scout/score-meta";
import { cn } from "@/lib/utils/cn";
import { ProfileActionsSheet } from "./profile-actions-sheet";
import type { Achievement, Profile } from "@/lib/api/types";

const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

const ACHIEVEMENT_META: Record<
  Achievement["kind"],
  { Icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  verified: { Icon: BadgeCheck, tint: "border-gold/30 bg-gold/10 text-gold" },
  rising: { Icon: TrendingUp, tint: "border-brand/30 bg-brand/10 text-brand" },
  milestone: { Icon: Sparkles, tint: "border-brand/30 bg-brand/10 text-brand" },
  battle: { Icon: Swords, tint: "border-live/30 bg-live/10 text-live" },
  chart: { Icon: Trophy, tint: "border-gold/30 bg-gold/10 text-gold" },
  founder: { Icon: Crown, tint: "border-gold/30 bg-gold/10 text-gold" },
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold tabular-nums">{compact.format(value)}</div>
      <div className="text-subtle text-xs">{label}</div>
    </div>
  );
}

export function TalentHub({ handle, editable = false }: { handle: string; editable?: boolean }) {
  const qc = useQueryClient();
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const marketplaceOn = useFlag("marketplace");
  const premiumOn = useFlag("premium");
  const { data, status } = useQuery({
    queryKey: ["profile", handle],
    queryFn: ({ signal }) => api.profiles.get(handle, signal),
  });

  // Follow/unfollow — optimistic toggle of the viewer state + follower count, reconciled with the
  // server's truth on success.
  const follow = useMutation({
    mutationFn: (value: boolean) => api.profiles.follow(handle, value),
    onMutate: (value) => {
      const prev = qc.getQueryData<Profile>(["profile", handle]);
      if (prev)
        qc.setQueryData<Profile>(["profile", handle], {
          ...prev,
          viewer: { following: value },
          followerCount: prev.followerCount + (value ? 1 : -1),
        });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["profile", handle], ctx.prev),
    onSuccess: (res) => {
      const cur = qc.getQueryData<Profile>(["profile", handle]);
      if (cur)
        qc.setQueryData<Profile>(["profile", handle], {
          ...cur,
          viewer: { following: res.following },
          followerCount: res.followerCount,
        });
    },
  });

  if (status === "pending") {
    return (
      <div className="h-dscreen grid place-items-center">
        <div className="border-line border-t-fg h-9 w-9 animate-spin rounded-full border-2" />
        <span className="sr-only">Loading profile</span>
      </div>
    );
  }
  if (status === "error" || !data) {
    return <div className="text-muted h-dscreen grid place-items-center">Profile unavailable.</div>;
  }

  const { creator, bio, followerCount, followingCount, totalLikes, clips } = data;
  const { talentScore, scores, achievements } = data;
  const tier = talentScore >= 85 ? "Elite" : talentScore >= 70 ? "Established" : "Rising";

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-28">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand text-brand-fg grid h-16 w-16 place-items-center rounded-full text-2xl font-bold">
            {creator.displayName.charAt(0)}
          </div>
          <div>
            <h1 className="flex items-center gap-1.5 text-xl font-semibold">
              {creator.displayName}
              {creator.verified && (
                <BadgeCheck className="text-gold h-5 w-5" aria-label="Verified creator" />
              )}
            </h1>
            <p className="text-muted text-sm">@{creator.handle}</p>
            {creator.campus && <p className="text-subtle text-xs">{creator.campus}</p>}
          </div>
        </div>
        {editable ? (
          <Link
            href="/settings"
            aria-label="Settings"
            className="text-muted hover:text-fg grid h-11 w-11 place-items-center rounded-full"
          >
            <Settings className="h-5 w-5" />
          </Link>
        ) : (
          <button
            type="button"
            aria-label="More options"
            onClick={() => setActionsOpen(true)}
            className="text-muted hover:text-fg grid h-11 w-11 place-items-center rounded-full"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        )}
      </header>

      <div className="border-line mt-5 flex items-center justify-around rounded-lg border py-3">
        <Stat label="Followers" value={followerCount} />
        <Stat label="Following" value={followingCount} />
        <Stat label="Likes" value={totalLikes} />
      </div>

      <p className="mt-4 text-sm leading-relaxed">{bio}</p>

      {/* Talent Score — the transparent composite (PRD §6.2/§6.9). */}
      <section className="border-line bg-surface mt-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <span className="text-muted flex items-center gap-1.5 text-sm font-medium">
            <Gauge className="text-gold h-4 w-4" aria-hidden /> Talent Score
          </span>
          <span className="bg-gold/15 text-gold rounded-pill px-2.5 py-0.5 text-xs font-semibold">
            {tier}
          </span>
        </div>
        <p className="mt-1 text-4xl font-semibold tabular-nums">
          {talentScore}
          <span className="text-subtle text-lg font-normal"> / 100</span>
        </p>
        <ul className="mt-3 space-y-2">
          {SCORE_META.map(({ key, short }) => (
            <li key={key} className="flex items-center gap-3">
              <span className="text-subtle w-16 shrink-0 text-xs">{short}</span>
              <span className="bg-elevated h-1.5 flex-1 overflow-hidden rounded-full">
                <span
                  className={cn("block h-full rounded-full", scoreTone(scores[key]))}
                  style={{ width: `${Math.round(scores[key])}%` }}
                />
              </span>
              <span className="text-subtle w-7 text-right text-xs tabular-nums">
                {Math.round(scores[key])}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Achievements (soulbound badges). */}
      {achievements.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {achievements.map((a) => {
            const { Icon, tint } = ACHIEVEMENT_META[a.kind];
            return (
              <li
                key={a.id}
                className={cn(
                  "rounded-pill flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium",
                  tint,
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {a.label}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        {editable ? (
          <Link
            href="/profile/edit"
            className="border-line text-fg rounded-pill flex h-11 flex-1 items-center justify-center border font-medium active:scale-[0.98]"
          >
            Edit profile
          </Link>
        ) : (
          <>
            <Button
              block
              variant={data.viewer.following ? "secondary" : "primary"}
              aria-pressed={data.viewer.following}
              onClick={() => follow.mutate(!data.viewer.following)}
            >
              {data.viewer.following ? "Following" : "Follow"}
            </Button>
            <Link
              href="/dms"
              className="border-line text-fg rounded-pill flex h-11 flex-1 items-center justify-center border font-medium active:scale-[0.98]"
            >
              Message
            </Link>
          </>
        )}
      </div>

      {/* Own-only creator tools — hidden on public profile views. */}
      {editable && (
        <>
          <Link
            href="/content"
            className="border-line bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3 active:scale-[0.99]"
          >
            <span className="bg-brand/15 text-brand grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <Film className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Your content</span>
              <span className="text-subtle block text-xs">
                Manage clips, captions &amp; insights.
              </span>
            </span>
            <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
          </Link>

          <Link
            href="/analytics"
            className="border-line bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3 active:scale-[0.99]"
          >
            <span className="bg-brand/15 text-brand grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <BarChart3 className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Studio</span>
              <span className="text-subtle block text-xs">Views, watch time &amp; audience.</span>
            </span>
            <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
          </Link>

          <Link
            href="/notifications"
            className="border-line bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3 active:scale-[0.99]"
          >
            <span className="bg-live/15 text-live grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <Bell className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Activity</span>
              <span className="text-subtle block text-xs">
                Follows, tips, comments &amp; results.
              </span>
            </span>
            <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
          </Link>

          <Link
            href="/id"
            className="border-line bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3 active:scale-[0.99]"
          >
            <span className="bg-gold/15 text-gold grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <Fingerprint className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Your DEMO ID</span>
              <span className="text-subtle block text-xs">
                Credentials, badges &amp; passes you own.
              </span>
            </span>
            <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </>
      )}

      {/* Marketplace entry (feature-flagged) */}
      {marketplaceOn && (
        <Link
          href="/market"
          className="border-line bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3 active:scale-[0.99]"
        >
          <span className="bg-brand/15 text-brand grid h-9 w-9 shrink-0 place-items-center rounded-full">
            <Store className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Marketplace</span>
            <span className="text-subtle block text-xs">Beats, tickets, merch &amp; more.</span>
          </span>
          <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
        </Link>
      )}

      {/* Fan Club entry (feature-flagged) */}
      {premiumOn && (
        <Link
          href={`/fanclub/${creator.handle}`}
          className="border-gold/30 bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3 active:scale-[0.99]"
        >
          <span className="bg-gold/15 text-gold grid h-9 w-9 shrink-0 place-items-center rounded-full">
            <Crown className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Join the Fan Club</span>
            <span className="text-subtle block text-xs">Members-only drops &amp; perks.</span>
          </span>
          <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
        </Link>
      )}

      {/* Ambassador entry */}
      <Link
        href="/ambassador"
        className="border-line bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3 active:scale-[0.99]"
      >
        <span className="bg-brand/15 text-brand grid h-9 w-9 shrink-0 place-items-center rounded-full">
          <Megaphone className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Become a campus ambassador</span>
          <span className="text-subtle block text-xs">Invite your campus, earn Credits.</span>
        </span>
        <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
      </Link>

      {/* Clip grid */}
      <h2 className="text-muted mt-6 mb-2 text-sm font-medium">Clips</h2>
      <ul className="grid grid-cols-3 gap-1">
        {clips.map((clip) => (
          <li
            key={clip.id}
            className="bg-surface relative aspect-[9/12] overflow-hidden rounded-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={clip.posterUrl} alt="" className="h-full w-full object-cover" />
            <span className="text-2xs absolute bottom-1 left-1 flex items-center gap-0.5 font-semibold text-white drop-shadow">
              <Play className="h-3 w-3 fill-white" aria-hidden /> {compact.format(clip.plays)}
            </span>
            {clip.battleId && (
              <span className="bg-live absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full">
                <Swords className="h-3 w-3 text-white" aria-hidden />
              </span>
            )}
          </li>
        ))}
      </ul>

      {!editable && (
        <ProfileActionsSheet
          open={actionsOpen}
          onClose={() => setActionsOpen(false)}
          handle={creator.handle}
          displayName={creator.displayName}
          verified={creator.verified}
        />
      )}
    </div>
  );
}
