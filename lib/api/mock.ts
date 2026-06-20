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

// Public-profile follow state (per session). Demo follower base shared across creators.
const FOLLOWER_BASE = 12_400;
const followedHandles = new Set<string>();

// Account privacy controls (mutable per session).
const privacy = {
  privateAccount: false,
  messagesFrom: "everyone" as "everyone" | "following",
  commentsFrom: "everyone" as "everyone" | "following" | "off",
  activityStatus: true,
  allowDownloads: true,
};

// Blocked accounts (mutable per session).
type MockBlocked = { handle: string; displayName: string; verified: boolean };
const blockedUsers: MockBlocked[] = [
  { handle: "spam.bot01", displayName: "DealsDailyNG", verified: false },
  { handle: "rude.guy", displayName: "K. O.", verified: false },
];

// The signed-in user's own editable profile (mutable so edits persist within a session).
// Overrides are merged into the public profile for the same handle.
const me = {
  handle: "ada.beats",
  displayName: "Ada",
  bio: "Campus performer. Booking via DMs. 🎤",
  campus: "UNILAG" as string | null,
  avatarUrl: null as string | null,
  verified: true,
};

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

// Payout banks (subset of the NIBSS list) for the account-linking flow.
const BANKS = [
  { code: "058", name: "GTBank" },
  { code: "044", name: "Access Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "033", name: "UBA" },
  { code: "011", name: "First Bank" },
  { code: "050", name: "Ecobank" },
  { code: "232", name: "Sterling Bank" },
  { code: "innov", name: "Kuda" },
  { code: "opay", name: "OPay" },
  { code: "palm", name: "PalmPay" },
];

// Deterministic stand-in for a bank account-name lookup (the real backend calls the bank/NIBSS).
const RESOLVE_NAMES = [
  "ADAEZE OKAFOR",
  "TUNDE ADEYEMI",
  "ZAINAB BELLO",
  "CHIDI NWOSU",
  "IFEOMA ELE",
  "MUSA IBRAHIM",
];
function resolveAccountName(accountNumber: string): string {
  const sum = [...accountNumber].reduce((a, c) => a + c.charCodeAt(0), 0);
  return RESOLVE_NAMES[sum % RESOLVE_NAMES.length];
}

// Creator earnings ledger. `wallet.earnings` is the withdrawable balance; these are the
// supporting figures + recent line items. Negative amounts are withdrawal debits.
const ngn = (minor: number) => ({ currency: "NGN" as const, minor });
type MockEarningEntry = {
  id: string;
  source: "tip" | "battle" | "fanclub" | "market" | "bonus" | "withdrawal";
  label: string;
  amount: { currency: "NGN"; minor: number };
  createdAt: string;
  status: "settled" | "pending";
};
const earnings = {
  pending: ngn(124_000), // ₦1,240 still clearing
  lifetime: ngn(4_350_000), // ₦43,500 gross all-time
  payoutMethod: { bank: "GTBank", accountMask: "••••1234" } as {
    bank: string;
    accountMask: string;
  } | null,
  entries: [
    {
      id: "ee_pend",
      source: "tip",
      label: "Tip from @zainab.sings",
      amount: ngn(30_000),
      createdAt: iso(-3600 * 2),
      status: "pending",
    },
    {
      id: "ee_tip",
      source: "tip",
      label: "Tip from @ada.beats",
      amount: ngn(45_000),
      createdAt: iso(-3600 * 4),
      status: "settled",
    },
    {
      id: "ee_battle",
      source: "battle",
      label: "Battle prize — Freestyle Friday",
      amount: ngn(200_000),
      createdAt: iso(-3600 * 20),
      status: "settled",
    },
    {
      id: "ee_fan",
      source: "fanclub",
      label: "Fan Club — 12 members",
      amount: ngn(360_000),
      createdAt: iso(-3600 * 48),
      status: "settled",
    },
    {
      id: "ee_market",
      source: "market",
      label: "Beat sale — “Lagos Nights”",
      amount: ngn(150_000),
      createdAt: iso(-3600 * 72),
      status: "settled",
    },
    {
      id: "ee_bonus",
      source: "bonus",
      label: "Creator launch bonus",
      amount: ngn(100_000),
      createdAt: iso(-3600 * 120),
      status: "settled",
    },
  ] as MockEarningEntry[],
};

// Creator analytics. Deterministic so the dashboard is stable across reloads; series is a gently
// rising trend with a weekly wobble. A real backend computes these from the event pipeline.
const ANALYTICS_TOP_CLIPS = [
  { id: "c1", caption: "Freestyle Friday 🎤", views: 48_200, likes: 6_100 },
  { id: "c4", caption: "Lagos Nights (snippet)", views: 31_400, likes: 4_200 },
  { id: "c7", caption: "Battle vs @tunde.flow", views: 27_800, likes: 5_300 },
  { id: "c2", caption: "Dorm session 🎹", views: 19_600, likes: 2_100 },
];
const ANALYTICS_CAMPUSES = [
  { name: "UNILAG", share: 0.34 },
  { name: "UI Ibadan", share: 0.22 },
  { name: "OAU", share: 0.17 },
  { name: "ABU Zaria", share: 0.14 },
  { name: "Others", share: 0.13 },
];

function buildAnalytics(range: "7d" | "28d" | "90d") {
  const days = range === "7d" ? 7 : range === "28d" ? 28 : 90;
  const series = Array.from({ length: days }, (_, i) => {
    const t = i / days;
    const base = 800 + t * 1400; // upward trend
    const wobble = Math.sin(i * 1.1) * 180 + Math.cos(i * 0.5) * 90;
    return { date: iso(-(days - 1 - i) * 86_400), views: Math.max(120, Math.round(base + wobble)) };
  });
  const totalViews = series.reduce((sum, p) => sum + p.views, 0);
  return {
    range,
    metrics: {
      views: { value: totalViews, delta: 12.4 },
      watchTimeHours: { value: Math.round(totalViews * 0.045), delta: -3.2 },
      followers: { value: Math.round(180 * (days / 7)), delta: 15.2 },
      earnings: { value: ngn(totalViews * 12), delta: 9.7 },
    },
    series,
    topClips: ANALYTICS_TOP_CLIPS,
    topCampuses: ANALYTICS_CAMPUSES,
  };
}

// Creator content library (the "Your content" surface). Mutable so edit/delete persist within a
// session. Ids align with the analytics top-clips so "View insights" resolves.
type MockMyClip = {
  id: string;
  caption: string;
  status: "published" | "processing";
  views: number;
  likes: number;
  createdAt: string;
};
const myClips: MockMyClip[] = [
  {
    id: "up_new",
    caption: "New drop — processing…",
    status: "processing",
    views: 0,
    likes: 0,
    createdAt: iso(-60 * 12),
  },
  {
    id: "c1",
    caption: "Freestyle Friday 🎤",
    status: "published",
    views: 48_200,
    likes: 6_100,
    createdAt: iso(-3600 * 30),
  },
  {
    id: "c4",
    caption: "Lagos Nights (snippet)",
    status: "published",
    views: 31_400,
    likes: 4_200,
    createdAt: iso(-3600 * 76),
  },
  {
    id: "c7",
    caption: "Battle vs @tunde.flow",
    status: "published",
    views: 27_800,
    likes: 5_300,
    createdAt: iso(-3600 * 120),
  },
  {
    id: "c2",
    caption: "Dorm session 🎹",
    status: "published",
    views: 19_600,
    likes: 2_100,
    createdAt: iso(-3600 * 200),
  },
];

function buildClipAnalytics(clipId: string) {
  const top = ANALYTICS_TOP_CLIPS.find((c) => c.id === clipId);
  const caption = top?.caption ?? "Your clip";
  const views = top?.views ?? 14_200;
  const likes = top?.likes ?? 1_800;
  // Retention: starts at 100%, dips fast in the first 20%, then decays gently with a small re-watch
  // bump near the hook. Deterministic so the curve is stable across reloads.
  const retention = Array.from({ length: 21 }, (_, i) => {
    const pct = i * 5;
    const t = pct / 100;
    const base = 1 - 0.55 * t; // gentle linear decay
    const earlyDrop = 0.18 * Math.exp(-pct / 6); // sharp initial fall, inverted below
    const hookBump = pct > 45 && pct < 60 ? 0.06 : 0;
    const value = Math.max(0.12, Math.min(1, base - earlyDrop + hookBump));
    return { pct, value: Math.round(value * 100) / 100 };
  });
  const avgWatchPct = retention.reduce((s, p) => s + p.value, 0) / retention.length;
  return {
    clip: { id: clipId, caption },
    views,
    likes,
    comments: Math.round(likes * 0.18),
    shares: Math.round(likes * 0.12),
    avgWatchPct: Math.round(avgWatchPct * 100) / 100,
    completionRate: retention[retention.length - 1].value,
    retention,
    sources: [
      { source: "fyp" as const, share: 0.62 },
      { source: "following" as const, share: 0.18 },
      { source: "profile" as const, share: 0.09 },
      { source: "search" as const, share: 0.06 },
      { source: "share" as const, share: 0.05 },
    ],
  };
}

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
// Creator verification intents: payment-confirm then gas-sponsored mint timing.
const verifyIntents = new Map<string, { paidAt: number; mintedAt: number }>();

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

// ── Notifications / Activity inbox ───────────────────────────────────────────
type MockNotification = {
  id: string;
  kind: "follow" | "like" | "comment" | "tip" | "battle" | "earning" | "system";
  text: string;
  createdAt: string;
  read: boolean;
  actor: { handle: string; displayName: string; verified: boolean; avatarUrl: null } | null;
  href: string | null;
};

const actor = (handle: string, displayName: string, verified = false) => ({
  handle,
  displayName,
  verified,
  avatarUrl: null,
});

// Per-category push preferences (mutable so toggles persist within a session).
const notificationPrefs: Record<"tips" | "battles" | "follows" | "comments" | "messages", boolean> =
  {
    tips: true,
    battles: true,
    follows: true,
    comments: false,
    messages: true,
  };

const notifications: MockNotification[] = [
  {
    id: "n1",
    kind: "tip",
    text: "Ada sent you 50 Credits on “Freestyle Friday”",
    createdAt: iso(-60 * 8),
    read: false,
    actor: actor("ada.beats", "Ada", true),
    href: "/credits",
  },
  {
    id: "n2",
    kind: "battle",
    text: "You won your battle against @tunde.flow 🏆",
    createdAt: iso(-3600 * 2),
    read: false,
    actor: actor("tunde.flow", "Tunde"),
    href: "/battles",
  },
  {
    id: "n3",
    kind: "follow",
    text: "Zainab started following you",
    createdAt: iso(-3600 * 5),
    read: false,
    actor: actor("zainab.sings", "Zainab", true),
    href: "/u/zainab.sings",
  },
  {
    id: "n4",
    kind: "comment",
    text: "Emeka commented: “This is fire 🔥🔥”",
    createdAt: iso(-3600 * 9),
    read: true,
    actor: actor("emeka.raw", "Emeka"),
    href: "/feed",
  },
  {
    id: "n5",
    kind: "earning",
    text: "Your weekly earnings of ₦12,400 are ready to withdraw",
    createdAt: iso(-3600 * 26),
    read: true,
    actor: null,
    href: "/earnings",
  },
  {
    id: "n6",
    kind: "like",
    text: "Bola and 23 others liked your clip",
    createdAt: iso(-3600 * 30),
    read: true,
    actor: actor("bola.x", "Bola"),
    href: "/feed",
  },
  {
    id: "n7",
    kind: "system",
    text: "Your creator verification is confirmed — your badge is live.",
    createdAt: iso(-3600 * 50),
    read: true,
    actor: null,
    href: "/profile",
  },
];

// ── Talent Intelligence / scout (PRD §6.9) ───────────────────────────────────
const CAMPUSES = ["UNILAG", "UI Ibadan", "ABU Zaria", "OAU", "UNN"];
const GENRES = ["Afrobeats", "Rap", "Gospel", "R&B", "Amapiano"];
const NAMES = [
  "Ada",
  "Tunde",
  "Zainab",
  "Bola",
  "Ife",
  "Musa",
  "Chidi",
  "Ngozi",
  "Femi",
  "Halima",
  "Emeka",
  "Sade",
];

function scoutTalent(i: number) {
  // Deterministic pseudo-scores so results are stable across calls.
  const s = (base: number) => Math.max(20, Math.min(99, Math.round(base + ((i * 17) % 23) - 11)));
  const scores = {
    growth: s(78 - i * 2),
    virality: s(72 + i),
    loyalty: s(65 + ((i * 3) % 25)),
    campusInfluence: s(80 - ((i * 5) % 30)),
    readiness: s(60 + ((i * 7) % 30)),
  };
  const overall = Math.round(
    scores.growth * 0.25 +
      scores.virality * 0.25 +
      scores.loyalty * 0.2 +
      scores.campusInfluence * 0.15 +
      scores.readiness * 0.15,
  );
  const name = NAMES[i % NAMES.length];
  return {
    id: `t_${i}`,
    handle: `${name.toLowerCase()}.${["beats", "flow", "moves", "live", "music"][i % 5]}`,
    displayName: name,
    campus: CAMPUSES[i % CAMPUSES.length],
    genre: GENRES[i % GENRES.length],
    verified: i % 3 !== 0,
    followers: 2000 + i * 1840,
    scores,
    overall,
  };
}

const SCOUT_TALENTS = Array.from({ length: 12 }, (_, i) => scoutTalent(i)).sort(
  (a, b) => b.overall - a.overall,
);

function scoutDetail(handle: string) {
  const t = SCOUT_TALENTS.find((x) => x.handle === handle) ?? SCOUT_TALENTS[0];
  return {
    ...t,
    factors: [
      { label: "Talent Growth", detail: `Followers up ${30 + (t.followers % 40)}% in 30 days.` },
      {
        label: "Virality",
        detail: `Median completion ${55 + (t.overall % 30)}%; high reshare rate.`,
      },
      {
        label: "Fan Loyalty",
        detail: `${20 + (t.overall % 25)}% of viewers are repeat supporters.`,
      },
      { label: "Campus Influence", detail: `Top-${1 + (t.overall % 5)} creator at ${t.campus}.` },
      {
        label: "Label/Sponsor Readiness",
        detail: "Consistent posting cadence; clean moderation history.",
      },
    ],
    trend: Array.from({ length: 8 }, (_, k) => Math.max(20, Math.min(99, t.overall - 18 + k * 2))),
  };
}

// ── Events (PRD §6.8) ────────────────────────────────────────────────────────
type MockTicket = {
  id: string;
  eventId: string;
  title: string;
  startsAt: string;
  venue: string;
  code: string;
  status: "valid" | "used";
};
const tickets: MockTicket[] = [];

const EVENTS = [
  {
    id: "ev1",
    title: "Freshers' Night Live",
    type: "show",
    venue: "Main Auditorium",
    campus: "UNILAG",
    inDays: 3,
    attendees: 420,
    price: 250,
    ci: 0,
  },
  {
    id: "ev2",
    title: "Campus Rap Cypher Finals",
    type: "competition",
    venue: "Student Union Hall",
    campus: "UI Ibadan",
    inDays: 7,
    attendees: 310,
    price: 150,
    ci: 1,
  },
  {
    id: "ev3",
    title: "Sunday Praise Concert",
    type: "concert",
    venue: "Chapel of Resurrection",
    campus: "OAU",
    inDays: 10,
    attendees: 540,
    price: 0,
    ci: 2,
  },
  {
    id: "ev4",
    title: "DEMO Talent Awards 2026",
    type: "awards",
    venue: "Eko Hotel",
    campus: "Lagos",
    inDays: 21,
    attendees: 900,
    price: 1200,
    ci: 0,
  },
  {
    id: "ev5",
    title: "Afrobeats Campus Festival",
    type: "festival",
    venue: "Sports Complex",
    campus: "ABU Zaria",
    inDays: 28,
    attendees: 1500,
    price: 600,
    ci: 1,
  },
];

function eventItem(e: (typeof EVENTS)[number]) {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    coverUrl: poster(e.ci + 2),
    startsAt: iso(e.inDays * 86400),
    venue: e.venue,
    campus: e.campus,
    attendees: e.attendees,
    price: { currency: "CREDITS" as const, minor: e.price },
    viewer: { hasTicket: tickets.some((t) => t.eventId === e.id) },
  };
}

function eventDetail(e: (typeof EVENTS)[number]) {
  return {
    ...eventItem(e),
    description:
      "A DEMO-powered campus event. Reserve your spot now — your ticket lives in your pass wallet with a scannable code at the door.",
    lineup: CREATORS.map((c) => ({
      handle: c.handle,
      displayName: c.displayName,
      verified: c.verified,
    })),
  };
}

// ── Fan Clubs / premium (PRD §6.6) ───────────────────────────────────────────
type MockMembership = {
  id: string;
  creatorHandle: string;
  displayName: string;
  tierId: string;
  tierName: string;
  status: "active" | "expired" | "cancelled";
  renewsAt: string | null;
  expiresAt: string;
};
const memberships: MockMembership[] = [];
const pendingSubs = new Map<string, { creatorHandle: string; tierId: string; confirmAt: number }>();

function fanClubTiers() {
  return [
    {
      id: "supporter",
      name: "Supporter",
      price: { currency: "NGN" as const, minor: 50_000 }, // ₦500/mo
      perks: ["Members-only badge", "Early access to new clips", "Community chat"],
      badge: "Supporter",
    },
    {
      id: "inner",
      name: "Inner Circle",
      price: { currency: "NGN" as const, minor: 150_000 }, // ₦1,500/mo
      perks: ["Everything in Supporter", "Monthly livestream", "Exclusive drops", "Direct Q&A"],
      badge: "Inner Circle",
    },
  ];
}

function fanClubFor(handle: string) {
  const creator = CREATORS.find((c) => c.handle === handle) ?? CREATORS[0];
  const m = memberships.find((x) => x.creatorHandle === creator.handle && x.status === "active");
  return {
    creator: {
      handle: creator.handle,
      displayName: creator.displayName,
      verified: creator.verified,
    },
    tiers: fanClubTiers(),
    viewer: m
      ? { tierId: m.tierId, status: "active" as const, expiresAt: m.expiresAt }
      : { tierId: null, status: "none" as const, expiresAt: null },
    lockedPreview: [
      { id: "p1", title: "Studio session — unreleased" },
      { id: "p2", title: "Behind the scenes: campus tour" },
      { id: "p3", title: "Acoustic version (members only)" },
    ],
  };
}

// ── Marketplace (PRD §6.7) ───────────────────────────────────────────────────
const MARKET = [
  {
    id: "m1",
    title: "Amapiano Type Beat — 'Lagos Nights'",
    category: "beat",
    kind: "digital",
    price: 120,
    ci: 0,
    blurb: "112 BPM · log drum heavy",
    sold: 38,
  },
  {
    id: "m2",
    title: "Original Single — 'Campus Anthem'",
    category: "song",
    kind: "digital",
    price: 80,
    ci: 1,
    blurb: "Afrobeats · 2:54",
    sold: 204,
  },
  {
    id: "m3",
    title: "Freshers' Show — Front Row Ticket",
    category: "ticket",
    kind: "physical",
    price: 250,
    ci: 2,
    blurb: "UNILAG main aud · Sat 8pm",
    sold: 76,
  },
  {
    id: "m4",
    title: "DEMO Campus Hoodie",
    category: "merch",
    kind: "physical",
    price: 400,
    ci: 3,
    blurb: "Heavyweight · S–XXL",
    sold: 51,
  },
  {
    id: "m5",
    title: "Mix & Master (1 track)",
    category: "service",
    kind: "digital",
    price: 300,
    ci: 4,
    blurb: "48h turnaround",
    sold: 12,
  },
  {
    id: "m6",
    title: "Gospel Choir Stems Pack",
    category: "beat",
    kind: "digital",
    price: 150,
    ci: 5,
    blurb: "WAV stems · royalty-free",
    sold: 29,
  },
];

function marketListing(m: (typeof MARKET)[number]) {
  const creator = CREATORS[m.ci % CREATORS.length];
  return {
    id: m.id,
    title: m.title,
    category: m.category,
    kind: m.kind,
    price: { currency: "CREDITS" as const, minor: m.price },
    creator: {
      handle: creator.handle,
      displayName: creator.displayName,
      verified: creator.verified,
    },
    coverUrl: poster(m.ci + 1),
    blurb: m.blurb,
    soldCount: m.sold,
  };
}

const DELIVER_NOTE: Record<string, string> = {
  beat: "Instant download — WAV + MP3, with a license PDF.",
  song: "Instant unlock — stream + download in your library.",
  ticket: "Digital ticket with QR; also added to your wallet passes.",
  merch: "Ships in 3–5 days. We'll ask for your delivery details at checkout.",
  service: "The creator is notified and will deliver within the stated turnaround.",
};

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

  if (route === "/v1/auth/otp" && opts.method === "POST") {
    const { phone } = opts.body as { phone: string };
    if (!/^\+?\d[\d\s-]{8,}$/.test(phone)) throw new Error("Enter a valid phone number");
    return { challengeId: `ch_${Date.now().toString(36)}` };
  }

  if (route === "/v1/auth/verify" && opts.method === "POST") {
    const { code } = opts.body as { challengeId: string; code: string };
    // Demo code is 123456. The real backend checks the SMS OTP.
    if (code !== "123456") throw new Error("That code isn't right. Try 123456.");
    return {
      // New users land on the profile step; phone verification lifts them to Tier 1.
      user: { handle: "", displayName: "", campus: null, kycTier: 1, verifiedCreator: false },
      isNew: true,
    };
  }

  if (route === "/v1/auth/profile" && opts.method === "POST") {
    const { handle, displayName, campus } = opts.body as {
      handle: string;
      displayName: string;
      campus: string | null;
    };
    if (!/^[a-z0-9._]{3,20}$/.test(handle)) throw new Error("Pick a handle (3–20 letters/numbers)");
    if (!displayName.trim()) throw new Error("Add a display name");
    return {
      user: { handle, displayName: displayName.trim(), campus, kycTier: 1, verifiedCreator: false },
    };
  }

  if (route === "/v1/auth/kyc" && opts.method === "POST") {
    const { bvn } = opts.body as { bvn: string };
    if (!/^\d{11}$/.test(bvn)) throw new Error("Enter your 11-digit BVN");
    return { kycTier: 2 };
  }

  if (route === "/v1/trends" && (opts.method ?? "GET") === "GET") {
    return TRENDS;
  }

  if (
    (route === "/v1/push/subscribe" || route === "/v1/push/unsubscribe") &&
    opts.method === "POST"
  ) {
    return { ok: true };
  }

  if (route === "/v1/ambassador" && (opts.method ?? "GET") === "GET") {
    return {
      code: "ADA-UNILAG",
      referralUrl: "https://demo.example/join?ref=ADA-UNILAG",
      stats: {
        invited: 86,
        joined: 41,
        activated: 23,
        rewards: { currency: "CREDITS" as const, minor: 1150 },
      },
      tier: {
        name: "Rising Rep",
        activated: 23,
        nextAt: 30,
        nextReward: { currency: "CREDITS" as const, minor: 500 },
      },
      leaderboard: [
        { rank: 1, handle: "bola.reps", displayName: "Bola", activations: 38, you: false },
        { rank: 2, handle: "you", displayName: "You", activations: 23, you: true },
        { rank: 3, handle: "ife.campus", displayName: "Ife", activations: 19, you: false },
        { rank: 4, handle: "musa.g", displayName: "Musa", activations: 12, you: false },
      ],
    };
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

  if (route === "/v1/clips/mine" && (opts.method ?? "GET") === "GET") {
    return myClips;
  }

  if (/^\/v1\/clips\/[^/]+$/.test(route) && opts.method === "PATCH") {
    const id = route.split("/")[3];
    const clip = myClips.find((c) => c.id === id);
    if (!clip) throw new Error("Clip not found");
    const { caption } = opts.body as { caption: string };
    const trimmed = caption.trim();
    if (!trimmed) throw new Error("Caption can't be empty");
    clip.caption = trimmed;
    return clip;
  }

  if (/^\/v1\/clips\/[^/]+$/.test(route) && opts.method === "DELETE") {
    const id = route.split("/")[3];
    const idx = myClips.findIndex((c) => c.id === id);
    if (idx !== -1) myClips.splice(idx, 1);
    return { ok: true };
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
    // Merge the signed-in user's edits into their own public profile.
    const mine = handle === me.handle;
    const following = followedHandles.has(handle);
    return {
      creator: {
        ...creator,
        displayName: mine ? me.displayName : creator.displayName,
        campus: mine ? me.campus : creator.campus,
        avatarUrl: null,
      },
      bio: mine ? me.bio : "Campus performer. Booking via DMs. 🎤",
      followerCount: FOLLOWER_BASE + (following ? 1 : 0),
      followingCount: 312,
      totalLikes: 248_900,
      viewer: { following },
      clips,
    };
  }

  if (/^\/v1\/creators\/[^/]+\/follow$/.test(route) && opts.method === "POST") {
    const handle = decodeURIComponent(route.split("/")[3]);
    const { value } = opts.body as { value: boolean };
    if (value) followedHandles.add(handle);
    else followedHandles.delete(handle);
    return { following: value, followerCount: FOLLOWER_BASE + (value ? 1 : 0) };
  }

  if (/^\/v1\/creators\/[^/]+\/report$/.test(route) && opts.method === "POST") {
    // In production this opens a moderation case for the reported creator.
    return { ok: true };
  }

  if (route === "/v1/me" && (opts.method ?? "GET") === "GET") {
    return me;
  }

  if (route === "/v1/me" && opts.method === "PATCH") {
    const { displayName, bio, campus } = opts.body as {
      displayName: string;
      bio: string;
      campus: string | null;
    };
    if (!displayName.trim()) throw new Error("Display name can't be empty");
    if (bio.length > 160) throw new Error("Bio is too long");
    me.displayName = displayName.trim();
    me.bio = bio.trim();
    me.campus = campus;
    return me;
  }

  if (route === "/v1/privacy" && (opts.method ?? "GET") === "GET") {
    return privacy;
  }

  if (route === "/v1/privacy" && opts.method === "PATCH") {
    Object.assign(privacy, opts.body as Partial<typeof privacy>);
    return privacy;
  }

  if (route === "/v1/privacy/blocked" && (opts.method ?? "GET") === "GET") {
    return blockedUsers;
  }

  if (route === "/v1/privacy/blocked" && opts.method === "POST") {
    const { handle } = opts.body as { handle: string };
    if (handle && !blockedUsers.some((b) => b.handle === handle)) {
      blockedUsers.unshift({ handle, displayName: handle, verified: false });
    }
    return blockedUsers;
  }

  if (/^\/v1\/privacy\/blocked\/[^/]+$/.test(route) && opts.method === "DELETE") {
    const handle = decodeURIComponent(route.split("/")[4]);
    const idx = blockedUsers.findIndex((b) => b.handle === handle);
    if (idx !== -1) blockedUsers.splice(idx, 1);
    return blockedUsers;
  }

  if (route === "/v1/wallet" && (opts.method ?? "GET") === "GET") {
    return wallet;
  }

  if (route === "/v1/earnings" && (opts.method ?? "GET") === "GET") {
    return {
      available: wallet.earnings,
      pending: earnings.pending,
      lifetime: earnings.lifetime,
      payoutMethod: earnings.payoutMethod,
      entries: earnings.entries,
    };
  }

  if (route === "/v1/banks" && (opts.method ?? "GET") === "GET") {
    return BANKS;
  }

  if (route === "/v1/earnings/payout-method/resolve" && (opts.method ?? "GET") === "GET") {
    const params = new URLSearchParams(query ?? "");
    const bankCode = params.get("bankCode") ?? "";
    const accountNumber = params.get("accountNumber") ?? "";
    if (!BANKS.some((b) => b.code === bankCode)) throw new Error("Choose a bank");
    if (!/^\d{10}$/.test(accountNumber)) throw new Error("Enter a valid 10-digit account number");
    return { accountName: resolveAccountName(accountNumber) };
  }

  if (route === "/v1/earnings/payout-method" && opts.method === "POST") {
    const { bankCode, accountNumber } = opts.body as { bankCode: string; accountNumber: string };
    const bank = BANKS.find((b) => b.code === bankCode);
    if (!bank) throw new Error("Choose a bank");
    if (!/^\d{10}$/.test(accountNumber)) throw new Error("Enter a valid 10-digit account number");
    earnings.payoutMethod = { bank: bank.name, accountMask: `••••${accountNumber.slice(-4)}` };
    return {
      available: wallet.earnings,
      pending: earnings.pending,
      lifetime: earnings.lifetime,
      payoutMethod: earnings.payoutMethod,
      entries: earnings.entries,
    };
  }

  if (route === "/v1/earnings/withdraw" && opts.method === "POST") {
    const { amountMinor } = opts.body as { amountMinor: number };
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      throw new Error("Enter a valid amount to withdraw");
    }
    if (amountMinor > wallet.earnings.minor) {
      throw new Error("That's more than your available balance");
    }
    if (!earnings.payoutMethod) {
      throw new Error("Add a payout method first");
    }
    // Server-truth move: debit the withdrawable balance and record a pending withdrawal entry.
    wallet.earnings = { ...wallet.earnings, minor: wallet.earnings.minor - amountMinor };
    const entry: MockEarningEntry = {
      id: `ee_wd_${Date.now()}`,
      source: "withdrawal",
      label: `Withdrawal to ${earnings.payoutMethod.bank} ${earnings.payoutMethod.accountMask}`,
      amount: ngn(-amountMinor),
      createdAt: iso(0),
      status: "pending",
    };
    earnings.entries.unshift(entry);
    return {
      reference: `wd_${Date.now()}`,
      status: "processing" as const,
      summary: {
        available: wallet.earnings,
        pending: earnings.pending,
        lifetime: earnings.lifetime,
        payoutMethod: earnings.payoutMethod,
        entries: earnings.entries,
      },
    };
  }

  if (route === "/v1/credits/packs" && (opts.method ?? "GET") === "GET") {
    return CREDIT_PACKS;
  }

  if (route === "/v1/creators/register/intent" && opts.method === "POST") {
    const reference = `vr_${Date.now().toString(36)}`;
    // Webhook lands ~1.5s after checkout; the gas-sponsored mint completes ~1.5s after that.
    verifyIntents.set(reference, { paidAt: Date.now() + 1500, mintedAt: Date.now() + 3000 });
    return {
      reference,
      accessCode: `ac_mock_${reference}`,
      price: { currency: "NGN" as const, minor: 160_000 }, // ~$1
    };
  }

  if (/^\/v1\/creators\/register\/[^/]+\/status$/.test(route) && (opts.method ?? "GET") === "GET") {
    const reference = route.split("/")[4];
    const intent = verifyIntents.get(reference);
    if (!intent) return { reference, status: "failed" as const };
    const now = Date.now();
    if (now < intent.paidAt) return { reference, status: "pending" as const };
    if (now < intent.mintedAt) return { reference, status: "minting" as const };
    verifyIntents.delete(reference);
    return { reference, status: "verified" as const };
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

  if (route === "/v1/analytics" && (opts.method ?? "GET") === "GET") {
    const range = new URLSearchParams(query).get("range");
    return buildAnalytics(range === "28d" || range === "90d" ? range : "7d");
  }

  if (/^\/v1\/analytics\/clips\/[^/]+$/.test(route) && (opts.method ?? "GET") === "GET") {
    return buildClipAnalytics(route.split("/")[4]);
  }

  if (route === "/v1/events" && (opts.method ?? "GET") === "GET") {
    const type = new URLSearchParams(query).get("type");
    return EVENTS.filter((e) => !type || e.type === type).map(eventItem);
  }

  if (/^\/v1\/events\/[^/]+$/.test(route) && (opts.method ?? "GET") === "GET") {
    const id = route.split("/")[3];
    const e = EVENTS.find((x) => x.id === id) ?? EVENTS[0];
    return eventDetail(e);
  }

  if (/^\/v1\/events\/[^/]+\/tickets$/.test(route) && opts.method === "POST") {
    const id = route.split("/")[3];
    const e = EVENTS.find((x) => x.id === id);
    if (!e) throw new Error("Event not found");
    const existing = tickets.find((t) => t.eventId === id);
    if (existing) return { ticket: existing, wallet };
    if (e.price > 0) {
      if (wallet.credits.minor < e.price) throw new Error("Not enough Credits");
      wallet.credits = { ...wallet.credits, minor: wallet.credits.minor - e.price };
    }
    const ticket: MockTicket = {
      id: `tk_${Date.now().toString(36)}`,
      eventId: id,
      title: e.title,
      startsAt: iso(e.inDays * 86400),
      venue: e.venue,
      code: `DEMO-${id.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: "valid",
    };
    tickets.unshift(ticket);
    return { ticket, wallet };
  }

  if (route === "/v1/tickets" && (opts.method ?? "GET") === "GET") {
    return tickets;
  }

  if (/^\/v1\/creators\/[^/]+\/fanclub$/.test(route) && (opts.method ?? "GET") === "GET") {
    return fanClubFor(decodeURIComponent(route.split("/")[3]));
  }

  if (route === "/v1/fanclub/subscribe" && opts.method === "POST") {
    const { creatorHandle, tierId } = opts.body as { creatorHandle: string; tierId: string };
    const tier = fanClubTiers().find((t) => t.id === tierId) ?? fanClubTiers()[0];
    const reference = `sub_${Date.now().toString(36)}`;
    pendingSubs.set(reference, { creatorHandle, tierId, confirmAt: Date.now() + 2500 });
    return { reference, accessCode: `ac_${reference}`, price: tier.price };
  }

  if (/^\/v1\/fanclub\/subscribe\/[^/]+$/.test(route) && (opts.method ?? "GET") === "GET") {
    const reference = decodeURIComponent(route.split("/")[4]);
    const sub = pendingSubs.get(reference);
    if (!sub) return { reference, status: "failed", membership: null };
    if (Date.now() < sub.confirmAt) return { reference, status: "pending", membership: null };
    // First charge "webhook-confirmed": grant the off-chain entitlement (mirror badge mints later).
    pendingSubs.delete(reference);
    const creator = CREATORS.find((c) => c.handle === sub.creatorHandle) ?? CREATORS[0];
    const tier = fanClubTiers().find((t) => t.id === sub.tierId) ?? fanClubTiers()[0];
    const membership: MockMembership = {
      id: `mem_${reference}`,
      creatorHandle: creator.handle,
      displayName: creator.displayName,
      tierId: tier.id,
      tierName: tier.name,
      status: "active",
      renewsAt: iso(30 * 86400),
      expiresAt: iso(30 * 86400),
    };
    memberships.unshift(membership);
    return { reference, status: "active", membership };
  }

  if (route === "/v1/memberships" && (opts.method ?? "GET") === "GET") {
    return memberships;
  }

  if (/^\/v1\/memberships\/[^/]+\/cancel$/.test(route) && opts.method === "POST") {
    const id = route.split("/")[3];
    const m = memberships.find((x) => x.id === id);
    if (!m) throw new Error("Membership not found");
    m.status = "cancelled";
    m.renewsAt = null; // stays active until expiry, then lapses
    return m;
  }

  if (route === "/v1/market/listings" && (opts.method ?? "GET") === "GET") {
    const category = new URLSearchParams(query).get("category");
    return MARKET.filter((m) => !category || m.category === category).map(marketListing);
  }

  if (/^\/v1\/market\/listings\/[^/]+$/.test(route) && (opts.method ?? "GET") === "GET") {
    const id = route.split("/")[4];
    const m = MARKET.find((x) => x.id === id) ?? MARKET[0];
    return {
      ...marketListing(m),
      description:
        "Made on campus, sold on DEMO. Every purchase supports the creator directly — the platform takes a small commission recorded in the ledger.",
      deliverableNote: DELIVER_NOTE[m.category] ?? "Delivered after payment is confirmed.",
    };
  }

  if (route === "/v1/market/orders" && opts.method === "POST") {
    const { listingId } = opts.body as { listingId: string };
    const m = MARKET.find((x) => x.id === listingId);
    if (!m) throw new Error("Listing not found");
    if (wallet.credits.minor < m.price) throw new Error("Not enough Credits");
    // Spend Credits server-side (platform fee + creator earnings split happens in the ledger).
    wallet.credits = { ...wallet.credits, minor: wallet.credits.minor - m.price };
    const digital = m.kind === "digital";
    return {
      id: `ord_${Date.now().toString(36)}`,
      listingId,
      title: m.title,
      status: digital ? "delivered" : "processing",
      kind: m.kind,
      deliverable: digital
        ? {
            type:
              m.category === "ticket" ? "ticket" : m.category === "song" ? "unlock" : "download",
            note: DELIVER_NOTE[m.category] ?? "Ready in your library.",
          }
        : null,
      wallet,
    };
  }

  if (route === "/v1/scout/talents" && (opts.method ?? "GET") === "GET") {
    const p = new URLSearchParams(query);
    const q = (p.get("q") ?? "").toLowerCase();
    const campus = p.get("campus");
    const genre = p.get("genre");
    const minOverall = Number(p.get("minOverall") ?? 0);
    return SCOUT_TALENTS.filter(
      (t) =>
        (!q || t.handle.toLowerCase().includes(q) || t.displayName.toLowerCase().includes(q)) &&
        (!campus || t.campus === campus) &&
        (!genre || t.genre === genre) &&
        t.overall >= minOverall,
    );
  }

  if (/^\/v1\/scout\/talents\/[^/]+$/.test(route) && (opts.method ?? "GET") === "GET") {
    const handle = decodeURIComponent(route.split("/")[4]);
    return scoutDetail(handle);
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

  if (route === "/v1/notifications/preferences" && (opts.method ?? "GET") === "GET") {
    return notificationPrefs;
  }

  if (route === "/v1/notifications/preferences" && opts.method === "PATCH") {
    const { key, value } = opts.body as { key: keyof typeof notificationPrefs; value: boolean };
    if (key in notificationPrefs) notificationPrefs[key] = Boolean(value);
    return notificationPrefs;
  }

  if (route === "/v1/notifications" && (opts.method ?? "GET") === "GET") {
    return { items: notifications, unread: notifications.filter((n) => !n.read).length };
  }

  if (route === "/v1/notifications/read" && opts.method === "POST") {
    for (const n of notifications) n.read = true;
    return { items: notifications, unread: 0 };
  }

  if (/^\/v1\/notifications\/[^/]+\/read$/.test(route) && opts.method === "POST") {
    const id = route.split("/")[3];
    const n = notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return { items: notifications, unread: notifications.filter((x) => !x.read).length };
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
