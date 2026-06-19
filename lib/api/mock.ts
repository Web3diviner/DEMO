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

// ── Battles (PRD §6.5) ───────────────────────────────────────────────────────
const VOTE_COST = 10; // Credits per vote
// The mock viewer is a verified fan, so their votes carry extra weight (§8.4/8.5).
const VIEWER_VOTE_WEIGHT = 3;

function contestant(seed: number) {
  const c = CREATORS[seed % CREATORS.length];
  return {
    id: `ct_${seed}`,
    creator: { ...c, avatarUrl: null },
    posterUrl: poster(seed),
    votes: 0,
  };
}

type MockBattle = ReturnType<typeof makeBattle>;
function makeBattle(
  id: string,
  format: string,
  title: string,
  state: string,
  endsInMin: number | null,
  seedA: number,
  seedB: number,
  votesA: number,
  votesB: number,
) {
  const a = { ...contestant(seedA), votes: votesA };
  const b = { ...contestant(seedB), votes: votesB };
  const winner = state === "settled" ? (votesA >= votesB ? a.id : b.id) : null;
  return {
    id,
    format,
    title,
    state,
    endsAt: endsInMin != null ? new Date(Date.now() + endsInMin * 60_000).toISOString() : null,
    voteCost: { currency: "CREDITS" as const, minor: VOTE_COST },
    prizePool: { currency: "CREDITS" as const, minor: (votesA + votesB) * VOTE_COST },
    contestants: [a, b],
    winnerContestantId: winner,
    viewer: { votedContestantId: null as string | null, voteWeight: VIEWER_VOTE_WEIGHT },
  };
}

const battles = new Map<string, MockBattle>([
  [
    "battle_live",
    makeBattle("battle_live", "rap", "Freshers' Rap Clash", "voting", 180, 0, 1, 312, 287),
  ],
  [
    "battle_soon",
    makeBattle("battle_soon", "gospel", "Sunday Praise-Off", "open", null, 2, 0, 0, 0),
  ],
  [
    "battle_done",
    makeBattle("battle_done", "beat", "Beat Makers Final", "settled", null, 1, 2, 540, 498),
  ],
]);

function chartFor(board: string) {
  const rising = board === "rising";
  const entries = Array.from({ length: 8 }, (_, k) => {
    const c = CREATORS[k % CREATORS.length];
    return {
      rank: k + 1,
      delta: [3, 0, -1, 2, 0, 1, -2, 4][k],
      creator: { ...c, handle: `${c.handle}${k}`, avatarUrl: null },
      score: rising ? 0 : Math.round(9800 - k * 720 + Math.random() * 50),
      risingPct: rising ? Math.round((180 - k * 18) * 10) / 10 : null,
    };
  });
  // Rising sorts by growth velocity, not totals (PRD §6.4).
  if (rising)
    entries
      .sort((x, y) => (y.risingPct ?? 0) - (x.risingPct ?? 0))
      .forEach((e, i) => (e.rank = i + 1));
  return { board, scope: board === "campus" ? "UNILAG" : null, periodLabel: "This week", entries };
}

// ── Direct messages (PRD §11) ────────────────────────────────────────────────
type MockDm = { id: string; fromMe: boolean; body: string; createdAt: string };
const dmThreads = new Map<
  string,
  {
    id: string;
    participant: { handle: string; displayName: string; verified: boolean; avatarUrl: null };
    messages: MockDm[];
  }
>([
  [
    "dm_ada",
    {
      id: "dm_ada",
      participant: { handle: "ada.beats", displayName: "Ada", verified: true, avatarUrl: null },
      messages: [
        { id: "m1", fromMe: false, body: "Yo! Loved your last clip 🔥", createdAt: iso(-3600 * 5) },
        { id: "m2", fromMe: true, body: "Thank you! Means a lot 🙏", createdAt: iso(-3600 * 4) },
        {
          id: "m3",
          fromMe: false,
          body: "Wanna collab for the next battle?",
          createdAt: iso(-3600 * 2),
        },
      ],
    },
  ],
  [
    "dm_tunde",
    {
      id: "dm_tunde",
      participant: { handle: "tunde.flow", displayName: "Tunde", verified: false, avatarUrl: null },
      messages: [
        { id: "m1", fromMe: false, body: "Sent you the beat, lmk", createdAt: iso(-3600 * 26) },
      ],
    },
  ],
]);

function iso(secondsFromNow: number) {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

// ── Moderation queue (PRD §10.3) ─────────────────────────────────────────────
type MockModItem = {
  id: string;
  kind: "clip" | "comment" | "user";
  source: "ai" | "report";
  reason: string;
  severity: "low" | "medium" | "high";
  confidence: number | null;
  subject: { handle: string; displayName: string };
  preview: { posterUrl: string | null; text: string | null };
  reportCount: number;
  createdAt: string;
};

const modQueue: MockModItem[] = [
  {
    id: "mod_1",
    kind: "clip",
    source: "ai",
    reason: "Possible nudity",
    severity: "high",
    confidence: 0.82,
    subject: { handle: "tunde.flow", displayName: "Tunde" },
    preview: { posterUrl: poster(3), text: null },
    reportCount: 0,
    createdAt: iso(-1800),
  },
  {
    id: "mod_2",
    kind: "comment",
    source: "report",
    reason: "Harassment",
    severity: "medium",
    confidence: null,
    subject: { handle: "anon_user", displayName: "Anon" },
    preview: { posterUrl: null, text: "You have no talent, just give up already." },
    reportCount: 4,
    createdAt: iso(-5400),
  },
  {
    id: "mod_3",
    kind: "clip",
    source: "ai",
    reason: "Copyright audio match",
    severity: "low",
    confidence: 0.64,
    subject: { handle: "zainab.moves", displayName: "Zainab" },
    preview: { posterUrl: poster(6), text: null },
    reportCount: 1,
    createdAt: iso(-9000),
  },
  {
    id: "mod_4",
    kind: "user",
    source: "report",
    reason: "Spam / fake engagement",
    severity: "medium",
    confidence: null,
    subject: { handle: "promo_bot22", displayName: "Promo" },
    preview: { posterUrl: null, text: "Account reported for mass-following and spam DMs." },
    reportCount: 7,
    createdAt: iso(-12000),
  },
];

// ── Search & trends (PRD §6.1) ───────────────────────────────────────────────
const TRENDS = [
  { tag: "freshersweek", posts: 4820 },
  { tag: "unilagtalent", posts: 3110 },
  { tag: "afrobeats", posts: 9870 },
  { tag: "rapbattle", posts: 2640 },
  { tag: "gospelvibes", posts: 1880 },
  { tag: "campusgottalent", posts: 1450 },
];

function searchFor(q: string) {
  const needle = q.replace(/^#/, "").toLowerCase();
  const creators = CREATORS.filter(
    (c) => c.handle.toLowerCase().includes(needle) || c.displayName.toLowerCase().includes(needle),
  ).map((c) => ({ ...c, avatarUrl: null }));
  const hashtags = TRENDS.filter((t) => t.tag.includes(needle)).slice(0, 5);
  const clips = Array.from({ length: 6 }, (_, k) => ({
    id: `clip_${k * 3}`,
    posterUrl: poster(k * 3),
    plays: 8000 + k * 640,
  }));
  return { creators, hashtags, clips };
}

export async function handleMock(
  path: string,
  opts: { method?: string; body?: unknown },
): Promise<unknown> {
  // Simulate realistic mobile latency so optimistic UI is actually exercised.
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220));

  const [route, query] = path.split("?");

  if (route === "/v1/trends" && (opts.method ?? "GET") === "GET") {
    return TRENDS;
  }

  if (route === "/v1/search" && (opts.method ?? "GET") === "GET") {
    const q = new URLSearchParams(query).get("q") ?? "";
    return searchFor(q);
  }

  if (route === "/v1/feed" && (opts.method ?? "GET") === "GET") {
    const params = new URLSearchParams(query);
    const cursor = params.get("cursor");
    const page = buildPage(cursor);
    // Following feed = only creators the viewer follows; mock approximates with verified creators.
    if (params.get("feed") === "following") {
      page.items = page.items.filter((c) => c.creator.verified);
    }
    return page;
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

  if (route === "/v1/battles" && (opts.method ?? "GET") === "GET") {
    const state = new URLSearchParams(query).get("state");
    const all = [...battles.values()];
    return state ? all.filter((b) => b.state === state) : all;
  }

  if (/^\/v1\/battles\/[^/]+$/.test(route) && (opts.method ?? "GET") === "GET") {
    const id = route.split("/")[3];
    const battle = battles.get(id);
    if (!battle) throw new Error("Battle not found");
    return battle;
  }

  if (/^\/v1\/battles\/[^/]+\/vote$/.test(route) && opts.method === "POST") {
    const id = route.split("/")[3];
    const battle = battles.get(id);
    if (!battle) throw new Error("Battle not found");
    if (battle.state !== "voting") throw new Error("Voting is closed for this battle");
    if (battle.viewer.votedContestantId) throw new Error("You have already voted in this battle");
    if (wallet.credits.minor < VOTE_COST) throw new Error("Not enough Credits");
    const { contestantId } = opts.body as { contestantId: string };
    const target = battle.contestants.find((c) => c.id === contestantId);
    if (!target) throw new Error("Contestant not found");
    // Spend Credits (server truth), add weighted vote, grow the escrowed prize pool.
    wallet.credits = { ...wallet.credits, minor: wallet.credits.minor - VOTE_COST };
    target.votes += battle.viewer.voteWeight;
    battle.prizePool = { ...battle.prizePool, minor: battle.prizePool.minor + VOTE_COST };
    battle.viewer = { ...battle.viewer, votedContestantId: contestantId };
    return { battle, wallet };
  }

  if (/^\/v1\/charts\/[^/]+$/.test(route) && (opts.method ?? "GET") === "GET") {
    const board = route.split("/")[3];
    return chartFor(board);
  }

  if (route === "/v1/moderation/queue" && (opts.method ?? "GET") === "GET") {
    return modQueue;
  }

  if (/^\/v1\/moderation\/[^/]+\/action$/.test(route) && opts.method === "POST") {
    const id = route.split("/")[3];
    const { action } = opts.body as { action: string };
    const idx = modQueue.findIndex((m) => m.id === id);
    if (idx >= 0) modQueue.splice(idx, 1); // resolved → leaves the queue
    const statusMap: Record<string, string> = {
      approve: "approved",
      remove: "removed",
      ban: "banned",
      escalate: "escalated",
    };
    return { id, status: statusMap[action] ?? "approved" };
  }

  if (route === "/v1/dms" && (opts.method ?? "GET") === "GET") {
    return [...dmThreads.values()].map((t) => {
      const last = t.messages[t.messages.length - 1];
      return {
        id: t.id,
        participant: t.participant,
        lastMessage: last?.body ?? "",
        lastAt: last?.createdAt ?? iso(0),
        unread: t.id === "dm_ada" ? 1 : 0,
      };
    });
  }

  if (/^\/v1\/dms\/[^/]+$/.test(route) && (opts.method ?? "GET") === "GET") {
    const id = route.split("/")[3];
    const t = dmThreads.get(id);
    if (!t) throw new Error("Thread not found");
    return { id: t.id, participant: t.participant, messages: t.messages };
  }

  if (/^\/v1\/dms\/[^/]+\/messages$/.test(route) && opts.method === "POST") {
    const id = route.split("/")[3];
    const t = dmThreads.get(id);
    if (!t) throw new Error("Thread not found");
    const { body } = opts.body as { body: string };
    const msg: MockDm = { id: `m_${Date.now()}`, fromMe: true, body, createdAt: iso(0) };
    t.messages.push(msg);
    return msg;
  }

  if (/^\/v1\/clips\/[^/]+\/tip$/.test(route) && opts.method === "POST") {
    const clipId = route.split("/")[3];
    const { credits } = opts.body as { credits: number };
    if (wallet.credits.minor < credits) throw new Error("Not enough Credits");
    // Spend Credits server-side; the split into platform fee + creator earnings happens in the
    // ledger (not surfaced here). Return the confirmed wallet only.
    wallet.credits = { ...wallet.credits, minor: wallet.credits.minor - credits };
    return { clipId, creditsSpent: { currency: "CREDITS" as const, minor: credits }, wallet };
  }

  throw new Error(`Mock: unhandled route ${path}`);
}
