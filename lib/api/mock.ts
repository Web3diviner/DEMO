import type { Clip, FeedPage, EngagementResult } from "./types";

/**
 * In-memory mock backend for the foundation. Lets the entire feed slice run end-to-end with no
 * server. Replaced by the real API when NEXT_PUBLIC_USE_MOCK=false.
 *
 * HLS sources are public test streams. To see real playback in local dev (CSP allows only the
 * configured media origin), run with:
 *   NEXT_PUBLIC_MEDIA_ORIGIN=https://test-streams.mux.dev pnpm dev
 * Without it, the poster renders and the UI/interactions still work.
 */

const HLS_SAMPLES = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://test-streams.mux.dev/pts_shift/master.m3u8",
  "https://test-streams.mux.dev/tos_ismc/main.m3u8",
];

/** Self-contained gradient poster (data URI) — always renders, costs nothing, CSP-clean. */
function poster(seed: number): string {
  const hues = [
    [280, 320],
    [12, 340],
    [85, 45],
    [200, 280],
  ][seed % 4];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='720' height='1280'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='hsl(${hues[0]} 60% 22%)'/>
      <stop offset='1' stop-color='hsl(${hues[1]} 55% 12%)'/>
    </linearGradient></defs>
    <rect width='720' height='1280' fill='url(#g)'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const CREATORS = [
  { id: "c1", handle: "ada.beats", displayName: "Ada", campus: "UNILAG", verified: true },
  { id: "c2", handle: "tunde.flow", displayName: "Tunde", campus: "UI Ibadan", verified: false },
  { id: "c3", handle: "zainab.moves", displayName: "Zainab", campus: "ABU Zaria", verified: true },
];

const CAPTIONS = [
  "Freestyle in the hostel common room 🔥",
  "Choreo I've been working on all week",
  "Original sound — tell me what you think",
  "Campus got talent fr",
  "Battle me if you can 👀",
];

function makeClip(i: number): Clip {
  const creator = CREATORS[i % CREATORS.length];
  return {
    id: `clip_${i}`,
    creator: {
      ...creator,
      avatarUrl: null,
    },
    caption: CAPTIONS[i % CAPTIONS.length],
    hlsUrl: HLS_SAMPLES[i % HLS_SAMPLES.length],
    posterUrl: poster(i),
    durationSec: 15 + (i % 30),
    width: 720,
    height: 1280,
    stats: {
      likes: 1200 + i * 37,
      comments: 40 + i * 3,
      shares: 12 + i,
      plays: 8000 + i * 211,
    },
    viewer: { liked: false, following: false },
    battleId: i % 5 === 0 ? `battle_${i}` : null,
  };
}

const PAGE_SIZE = 6;

function buildPage(cursor: string | null): FeedPage {
  const start = cursor ? parseInt(cursor, 10) : 0;
  const items = Array.from({ length: PAGE_SIZE }, (_, k) => makeClip(start + k));
  const next = start + PAGE_SIZE;
  return { items, nextCursor: next < 60 ? String(next) : null };
}

// Track liked state in-memory so optimistic commits reconcile believably.
const likeState = new Map<string, boolean>();

export async function handleMock(
  path: string,
  opts: { method?: string; body?: unknown },
): Promise<unknown> {
  // Simulate realistic mobile latency so optimistic UI is actually exercised.
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220));

  const [route, query] = path.split("?");

  if (route === "/v1/feed" && (opts.method ?? "GET") === "GET") {
    const cursor = new URLSearchParams(query).get("cursor");
    return buildPage(cursor);
  }

  if (route === "/v1/engagement" && opts.method === "POST") {
    const action = opts.body as { kind: string; clipId?: string; value?: boolean };
    if (action.kind === "like" && action.clipId) {
      likeState.set(action.clipId, Boolean(action.value));
      const idx = parseInt(action.clipId.replace("clip_", ""), 10) || 0;
      const base = 1200 + idx * 37;
      const result: EngagementResult = {
        clipId: action.clipId,
        liked: Boolean(action.value),
        likeCount: base + (action.value ? 1 : 0),
      };
      return result;
    }
    return { clipId: action.clipId ?? "", liked: false, likeCount: 0 };
  }

  throw new Error(`Mock: unhandled route ${path}`);
}
