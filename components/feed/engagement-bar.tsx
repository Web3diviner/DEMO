"use client";

import * as React from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Vertical engagement rail (right side of a clip). Optimistic by contract: the parent updates state
 * instantly and queues the network call; this component only renders state + reports intent.
 * Counts use compact notation to stay legible and narrow on small screens.
 */

const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

type Props = {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
};

function Action({
  label,
  count,
  active,
  activeClass,
  onClick,
  children,
}: {
  label: string;
  count: number;
  active?: boolean;
  activeClass?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label} (${count})`}
      className={cn(
        "flex flex-col items-center gap-1 text-white",
        "transition-transform duration-[var(--dur-1)] ease-[var(--ease-spring)] active:scale-90",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full bg-black/30 backdrop-blur-sm",
          active && activeClass,
        )}
      >
        {children}
      </span>
      <span className="text-xs font-semibold tabular-nums drop-shadow">
        {compact.format(count)}
      </span>
    </button>
  );
}

export function EngagementBar({
  liked,
  likeCount,
  commentCount,
  shareCount,
  onLike,
  onComment,
  onShare,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-5">
      <Action
        label={liked ? "Unlike" : "Like"}
        count={likeCount}
        active={liked}
        activeClass="bg-live/20"
        onClick={onLike}
      >
        <Heart className={cn("h-6 w-6", liked && "fill-live text-live")} strokeWidth={2} />
      </Action>
      <Action label="Comment" count={commentCount} onClick={onComment}>
        <MessageCircle className="h-6 w-6" />
      </Action>
      <Action label="Share" count={shareCount} onClick={onShare}>
        <Share2 className="h-6 w-6" />
      </Action>
    </div>
  );
}
