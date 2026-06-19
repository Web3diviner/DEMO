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

// ── Wallet + top-up simulation ──────────────────────────────────────────────
// Server-truth balances live here. Fan Credits and creator earnings stay distinct.
const wallet = {
  credits: { currency: "CREDITS" as const, minor: 1240 },
  earnings: { currency: "NGN" as const, minor: 875_000 },
};

const CREDIT_PACKS = [
  { id: "pack_100", credits: 100, price: { currency: "NGN" as const, minor: 50_000 }, badge: null },
  {
    id: "pack_550",
    credits: 550,
    price: { currency: "NGN" as const, minor: 250_000 },
    badge: "Most popular",
  },
  {
    id: "pack_1200",
    credits: 1200,
    price: { currency: "NGN" as const, minor: 500_000 },
    badge: "Best value",
  },
];

// Pending top-ups, keyed by reference. The "webhook" confirms after a short delay — the client must
// poll and only sees the balance move once status flips to success (never optimistically).
const topUps = new Map<string, { credits: number; price: number; confirmAt: number }>();

function commentsFor(clipId: string) {
  const authors = [
    { handle: "kemi.vibes", displayName: "Kemi", verified: false },
    { handle: "demola", displayName: "Demola", verified: true },
    { handle: "amaka.j", displayName: "Amaka", verified: false },
  ];
  const bodies = [
    "This is fire 🔥🔥",
    "How are you this talented??",
    "On repeat ngl",
    "Campus star 🌟",
  ];
  return Array.from({ length: 4 }, (_, k) => ({
    id: `${clipId}_cm_${k}`,
    author: authors[k % authors.length],
    body: bodies[k % bodies.length],
    createdAt: new Date(Date.now() - k * 3_600_000).toISOString(),
    likeCount: 30 - k * 7,
  }));
}

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

  if (route === "/v1/uploads/ticket" && opts.method === "POST") {
    const assetId = `asset_${Date.now().toString(36)}`;
    // In production this is a signed tus endpoint at the storage provider. The mock returns a
    // tus.io public demo endpoint so the resumable flow can be exercised end-to-end.
    return {
      endpoint: "https://tusd.tusdemo.net/files/",
      assetId,
      headers: {},
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
  }

  if (route === "/v1/clips" && opts.method === "POST") {
    const body = opts.body as { assetId: string };
    return { clipId: `clip_pub_${body.assetId}`, status: "processing" };
  }

  if (route.startsWith("/v1/profiles/") && (opts.method ?? "GET") === "GET") {
    const handle = decodeURIComponent(route.replace("/v1/profiles/", ""));
    const creator = CREATORS.find((c) => c.handle === handle) ?? CREATORS[0];
    const clips = Array.from({ length: 9 }, (_, k) => {
      const idx = k * 2;
      return {
        id: `clip_${idx}`,
        posterUrl: poster(idx),
        plays: 8000 + idx * 211,
        battleId: idx % 5 === 0 ? `battle_${idx}` : null,
      };
    });
    return {
      creator: { ...creator, avatarUrl: null },
      bio: "Campus performer. Booking via DMs. 🎤",
      followerCount: 12_400,
      followingCount: 312,
      totalLikes: 248_900,
      clips,
    };
  }

  if (route === "/v1/wallet" && (opts.method ?? "GET") === "GET") {
    return wallet;
  }

  if (route === "/v1/credits/packs" && (opts.method ?? "GET") === "GET") {
    return CREDIT_PACKS;
  }

  if (route === "/v1/credits/topup" && opts.method === "POST") {
    const { packId } = opts.body as { packId: string };
    const pack = CREDIT_PACKS.find((p) => p.id === packId) ?? CREDIT_PACKS[0];
    const reference = `ref_${Date.now().toString(36)}`;
    // Simulate the Paystack webhook landing ~2.5s after checkout.
    topUps.set(reference, {
      credits: pack.credits,
      price: pack.price.minor,
      confirmAt: Date.now() + 2500,
    });
    return { reference, accessCode: `ac_mock_${reference}`, price: pack.price };
  }

  if (route.startsWith("/v1/credits/topup/") && (opts.method ?? "GET") === "GET") {
    const reference = decodeURIComponent(route.replace("/v1/credits/topup/", ""));
    const intent = topUps.get(reference);
    if (!intent) return { reference, status: "failed", wallet: null };
    if (Date.now() < intent.confirmAt) {
      return { reference, status: "pending", wallet: null };
    }
    // Webhook "confirmed": credit the wallet (server truth) and report success once.
    if (topUps.has(reference)) {
      wallet.credits = { ...wallet.credits, minor: wallet.credits.minor + intent.credits };
      topUps.delete(reference);
    }
    return { reference, status: "success", wallet };
  }

  if (/^\/v1\/clips\/[^/]+\/comments$/.test(route) && (opts.method ?? "GET") === "GET") {
    const clipId = route.split("/")[3];
    return { items: commentsFor(clipId), nextCursor: null, total: 42 };
  }

  throw new Error(`Mock: unhandled route ${path}`);
}
