"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";
import type { Clip } from "@/lib/api/types";
import type { DataPolicy } from "@/lib/connection";
import { HlsPlayer } from "./hls-player";
import { EngagementBar } from "./engagement-bar";
import { CommentSheet } from "./comment-sheet";
import { TipSheet } from "./tip-sheet";
import { ReportClipSheet } from "./report-clip-sheet";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";

/**
 * A single full-bleed feed clip. Snaps to the viewport, layers a readable gradient over the video,
 * and shows creator + caption + engagement rail. The player only initializes when `active` (the
 * on-screen item) or `preload` (the immediate next item) — never for the whole list.
 */

type Props = {
  clip: Clip;
  active: boolean;
  preload: boolean;
  policy: DataPolicy;
  position: number;
  onLike: (clip: Clip) => void;
};

export function FeedItem({ clip, active, preload, policy, position, onLike }: Props) {
  const dwellStart = React.useRef<number | null>(null);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [tipOpen, setTipOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);

  // Impression + dwell instrumentation feeds the recommendation store.
  React.useEffect(() => {
    if (active) {
      track({ type: "clip_impression", clipId: clip.id, position });
      track({ type: "clip_play", clipId: clip.id });
      dwellStart.current = performance.now();
      return () => {
        if (dwellStart.current != null) {
          const ms = performance.now() - dwellStart.current;
          const completionPct = Math.min(100, (ms / 1000 / clip.durationSec) * 100);
          track({ type: "clip_dwell", clipId: clip.id, ms: Math.round(ms), completionPct });
        }
      };
    }
  }, [active, clip.id, clip.durationSec, position]);

  return (
    <article
      className="snap-item h-dscreen relative w-full overflow-hidden bg-black"
      aria-roledescription="video clip"
      aria-label={`${clip.creator.displayName}: ${clip.caption}`}
    >
      {active || preload ? (
        <HlsPlayer
          src={clip.hlsUrl}
          poster={clip.posterUrl}
          active={active}
          policy={policy}
          label={`${clip.creator.displayName}'s clip`}
          onComplete={() => track({ type: "clip_complete", clipId: clip.id })}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // Off-screen, not-yet-preloaded items render only the cheap poster (no player, no data).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clip.posterUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Legibility scrim — keeps text/contrast readable over any video (WCAG). */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      {/* Engagement rail */}
      <div className="absolute right-3 bottom-28 z-10">
        <EngagementBar
          liked={clip.viewer.liked}
          likeCount={clip.stats.likes}
          commentCount={clip.stats.comments}
          shareCount={clip.stats.shares}
          onLike={() => onLike(clip)}
          onComment={() => setCommentsOpen(true)}
          onSupport={() => setTipOpen(true)}
          onShare={() => {
            track({ type: "engagement", action: "share", clipId: clip.id });
            void navigator.share?.({ text: clip.caption }).catch(() => {});
          }}
          onReport={() => setReportOpen(true)}
        />
      </div>

      {/* Creator + caption */}
      <div className="absolute right-20 bottom-24 left-4 z-10 text-white">
        <div className="flex items-center gap-2">
          <div className="bg-brand text-brand-fg grid h-9 w-9 place-items-center rounded-full text-sm font-bold">
            {clip.creator.displayName.charAt(0)}
          </div>
          <span className="font-semibold">@{clip.creator.handle}</span>
          {clip.creator.verified && (
            <BadgeCheck className="text-gold h-4 w-4" aria-label="Verified creator" />
          )}
          {clip.battleId && (
            <span className="rounded-pill bg-live/90 text-2xs px-2 py-0.5 font-bold tracking-wide uppercase">
              Battle
            </span>
          )}
        </div>
        <p className={cn("mt-2 line-clamp-2 text-sm leading-snug drop-shadow")}>{clip.caption}</p>
      </div>

      <CommentSheet clipId={clip.id} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
      <TipSheet
        clipId={clip.id}
        creatorHandle={clip.creator.handle}
        open={tipOpen}
        onClose={() => setTipOpen(false)}
      />
      <ReportClipSheet clipId={clip.id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </article>
  );
}
