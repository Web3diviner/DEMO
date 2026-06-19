"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Gauge, Wifi } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Clip } from "@/lib/api/types";
import { useDataPolicy } from "@/lib/hooks/use-data-policy";
import { getEngagementQueue } from "@/lib/queue/shared";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";
import { FeedItem } from "./feed-item";

/**
 * The vertical swipe feed.
 *
 * - `useInfiniteQuery` paginates by cursor; new pages load as the user nears the end.
 * - A single IntersectionObserver determines the active index (the most-visible item). Only the
 *   active item plays; the immediate next item preloads ONLY when the data policy allows (Wi-Fi).
 * - Likes are optimistic: UI flips instantly, the action is queued and drained in the background.
 * - A visible Data-Saver toggle puts the user in control of their data.
 */

export function FeedScroller() {
  const { policy, manualDataSaver, setManualDataSaver, connection } = useDataPolicy();
  const [activeIndex, setActiveIndex] = React.useState(0);
  // Optimistic overrides keyed by clipId, layered over server data.
  const [likeOverrides, setLikeOverrides] = React.useState<
    Record<string, { liked: boolean; likes: number }>
  >({});

  // Process-wide singleton — shared with the comment sheet (one persisted queue, one drainer).
  const queue = getEngagementQueue();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam, signal }) => api.feed.page(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
  });

  const clips: Clip[] = React.useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Track which item is on screen.
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
          }
        }
      },
      { root, threshold: [0.6] },
    );
    const items = root.querySelectorAll("[data-index]");
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [clips.length]);

  // Load more as the user approaches the end.
  React.useEffect(() => {
    if (activeIndex >= clips.length - 2 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [activeIndex, clips.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleLike = React.useCallback(
    (clip: Clip) => {
      const current = likeOverrides[clip.id] ?? {
        liked: clip.viewer.liked,
        likes: clip.stats.likes,
      };
      const nextLiked = !current.liked;
      setLikeOverrides((prev) => ({
        ...prev,
        [clip.id]: { liked: nextLiked, likes: current.likes + (nextLiked ? 1 : -1) },
      }));
      track({ type: "engagement", action: nextLiked ? "like" : "unlike", clipId: clip.id });
      queue.enqueue({ kind: "like", clipId: clip.id, value: nextLiked });
    },
    [likeOverrides, queue],
  );

  if (status === "pending") return <FeedSkeleton />;
  if (status === "error")
    return (
      <div className="h-dscreen text-muted grid place-items-center px-8 text-center">
        Couldn&apos;t load the feed. Pull to retry.
      </div>
    );

  return (
    <div className="relative">
      {/* Data-saver control — always visible, honest about the user's data. */}
      <div
        className="absolute top-3 right-3 z-30 flex items-center"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <button
          type="button"
          onClick={() => {
            const next = !manualDataSaver;
            setManualDataSaver(next);
            track({ type: "data_saver_toggle", on: next });
          }}
          aria-pressed={policy.dataSaver}
          className={cn(
            "rounded-pill text-2xs flex items-center gap-1.5 px-3 py-1.5 font-semibold backdrop-blur-md",
            policy.dataSaver ? "bg-gold/90 text-black" : "bg-black/40 text-white",
          )}
        >
          {policy.dataSaver ? <Gauge className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
          {policy.dataSaver ? `Data Saver · ${policy.maxHeight}p` : `${policy.maxHeight}p`}
          {connection.saveData && <span className="sr-only">(browser Save-Data on)</span>}
        </button>
      </div>

      <div
        ref={containerRef}
        className="snap-feed h-dscreen overflow-y-scroll"
        role="feed"
        aria-busy={isFetchingNextPage}
        aria-label="Talent feed"
      >
        {clips.map((clip, i) => {
          const o = likeOverrides[clip.id];
          const merged: Clip = o
            ? {
                ...clip,
                viewer: { ...clip.viewer, liked: o.liked },
                stats: { ...clip.stats, likes: o.likes },
              }
            : clip;
          return (
            <div key={clip.id} data-index={i}>
              <FeedItem
                clip={merged}
                active={i === activeIndex}
                // Preload the immediate next clip only when the policy permits (Wi-Fi).
                preload={policy.prefetch && i === activeIndex + 1}
                policy={policy}
                position={i}
                onLike={handleLike}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="h-dscreen grid place-items-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <span className="sr-only">Loading feed</span>
    </div>
  );
}
