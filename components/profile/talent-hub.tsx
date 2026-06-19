"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Megaphone, Play, Settings, Swords } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold tabular-nums">{compact.format(value)}</div>
      <div className="text-subtle text-xs">{label}</div>
    </div>
  );
}

export function TalentHub({ handle }: { handle: string }) {
  const { data, status } = useQuery({
    queryKey: ["profile", handle],
    queryFn: ({ signal }) => api.profiles.get(handle, signal),
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
        <Link
          href="/settings"
          aria-label="Settings"
          className="text-muted hover:text-fg grid h-11 w-11 place-items-center rounded-full"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <div className="border-line mt-5 flex items-center justify-around rounded-lg border py-3">
        <Stat label="Followers" value={followerCount} />
        <Stat label="Following" value={followingCount} />
        <Stat label="Likes" value={totalLikes} />
      </div>

      <p className="mt-4 text-sm leading-relaxed">{bio}</p>

      <div className="mt-4 flex gap-2">
        <Button block>Follow</Button>
        <Link
          href="/dms"
          className="border-line text-fg rounded-pill flex h-11 flex-1 items-center justify-center border font-medium active:scale-[0.98]"
        >
          Message
        </Link>
      </div>

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
    </div>
  );
}
