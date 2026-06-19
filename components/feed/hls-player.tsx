"use client";

import * as React from "react";
import type { DataPolicy } from "@/lib/connection";

/**
 * Adaptive-bitrate HLS player tuned for expensive mobile data.
 *
 * - `hls.js` is dynamically imported so it never enters the initial bundle.
 * - The engine is only constructed when `active` (the on-screen / next clip) — we never spin up a
 *   player for every feed item. The parent passes `active` for at most the visible + next item.
 * - Rendition is capped to the data policy (≤480p cellular / ≤720p Wi-Fi) by filtering levels.
 * - Poster shows until the first frame so there's no blank box and LCP stays fast.
 * - `playsInline muted` for silent autoplay loops (iOS requires both).
 * - Safari plays HLS natively (no hls.js) — handled.
 */

type Props = {
  src: string;
  poster: string;
  active: boolean;
  policy: DataPolicy;
  onFirstFrame?: () => void;
  onComplete?: () => void;
  className?: string;
  label: string;
};

export function HlsPlayer({
  src,
  poster,
  active,
  policy,
  onFirstFrame,
  onComplete,
  className,
  label,
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [ready, setReady] = React.useState(false);
  // hls instance kept in a ref so cleanup is reliable across re-renders.
  const hlsRef = React.useRef<{ destroy: () => void } | null>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;

    let cancelled = false;

    const onLoaded = () => {
      if (cancelled) return;
      setReady(true);
      onFirstFrame?.();
    };
    video.addEventListener("loadeddata", onLoaded);
    const onEnded = () => onComplete?.();
    video.addEventListener("ended", onEnded);

    // Safari / iOS: native HLS. No JS engine needed — the lightest possible path.
    const canNative = video.canPlayType("application/vnd.apple.mpegurl");

    if (canNative) {
      video.src = src;
    } else {
      // Lazy-load hls.js only when we actually need a JS engine.
      void import("hls.js").then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) {
          if (!cancelled) video.src = src; // last-resort progressive fallback
          return;
        }
        const hls = new Hls({
          // Cap the starting and max level to the data policy; keep buffers small to save data.
          capLevelToPlayerSize: true,
          maxBufferLength: policy.dataSaver ? 6 : 12,
          maxMaxBufferLength: policy.dataSaver ? 12 : 30,
          startLevel: -1,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          // Restrict to renditions within the height ceiling for this connection.
          const allowed = data.levels
            .map((lvl, i) => ({ i, h: lvl.height }))
            .filter((l) => l.h <= policy.maxHeight);
          if (allowed.length > 0) {
            hls.autoLevelCapping = allowed[allowed.length - 1].i;
          }
        });
        hls.loadSource(src);
        hls.attachMedia(video);
      });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("ended", onEnded);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
      setReady(false);
    };
  }, [active, src, policy.dataSaver, policy.maxHeight, onComplete, onFirstFrame]);

  // Play/pause strictly follows `active` so only the on-screen clip consumes CPU/data.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      void video.play().catch(() => {
        /* Autoplay can be rejected; the muted loop will retry on interaction. */
      });
    } else {
      video.pause();
    }
  }, [active, ready]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      muted
      loop
      playsInline
      preload={active ? "auto" : "none"}
      aria-label={label}
      className={className}
      style={{ opacity: ready ? 1 : 0, transition: "opacity var(--dur-2) var(--ease-out)" }}
    />
  );
}
