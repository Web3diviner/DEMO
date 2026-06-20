import { z } from "zod";

/**
 * API types — authored to mirror `contracts/openapi.yaml`, which is the single source of truth.
 * Once the backend publishes the spec, these are generated in CI instead of hand-written; the
 * shapes are kept 1:1 so the swap is mechanical.
 *
 * Zod schemas double as runtime validators at the network trust boundary (never trust the wire).
 */

export const moneySchema = z.object({
  currency: z.enum(["CREDITS", "NGN", "USD"]),
  minor: z.number().int(),
});

/** A single adaptive-bitrate rendition advertised by the backend. */
export const renditionSchema = z.object({
  height: z.number().int(),
  /** Signed, expiring HLS playlist URL. */
  url: z.string().url(),
});

export const creatorSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  /** Server-truth entitlement: is this a verified creator (badge)? */
  verified: z.boolean(),
  campus: z.string().nullable(),
});

export const clipSchema = z.object({
  id: z.string(),
  creator: creatorSchema,
  caption: z.string(),
  /** Master HLS playlist (.m3u8); player picks a rendition within the data policy. */
  hlsUrl: z.string().url(),
  /** Low-cost poster shown before first frame (keeps LCP fast, avoids blank box). */
  posterUrl: z.string().url(),
  durationSec: z.number(),
  width: z.number().int(),
  height: z.number().int(),
  /** Aggregate counts (display only; never used for money decisions). */
  stats: z.object({
    likes: z.number().int(),
    comments: z.number().int(),
    shares: z.number().int(),
    plays: z.number().int(),
  }),
  /** The viewer's own engagement state, server-confirmed. */
  viewer: z.object({
    liked: z.boolean(),
    following: z.boolean(),
  }),
  /** Optional: clip is part of an active battle. */
  battleId: z.string().nullable(),
});

export const feedPageSchema = z.object({
  items: z.array(clipSchema),
  /** Opaque cursor for the next page; null when exhausted. */
  nextCursor: z.string().nullable(),
});

export const engagementResultSchema = z.object({
  clipId: z.string(),
  liked: z.boolean(),
  likeCount: z.number().int(),
});

/**
 * A short-lived signed ticket to upload video DIRECTLY to object storage via tus. Video never
 * transits our API. The endpoint + headers are issued per-upload and expire quickly.
 */
export const uploadTicketSchema = z.object({
  /** tus creation endpoint at the storage provider. */
  endpoint: z.string().url(),
  /** Opaque id we use to claim/publish the asset once the upload completes. */
  assetId: z.string(),
  /** Extra headers the provider requires (e.g. a signed auth token). */
  headers: z.record(z.string(), z.string()),
  expiresAt: z.string(),
});

/** Result of publishing clip metadata after the bytes finished uploading. */
export const publishResultSchema = z.object({
  clipId: z.string(),
  status: z.enum(["processing", "published"]),
});

/** Creator profile / Talent Hub. */
export const profileSchema = z.object({
  creator: creatorSchema,
  bio: z.string(),
  followerCount: z.number().int(),
  followingCount: z.number().int(),
  totalLikes: z.number().int(),
  /** The signed-in viewer's relationship to this creator. */
  viewer: z.object({ following: z.boolean() }),
  clips: z.array(
    z.object({
      id: z.string(),
      posterUrl: z.string().url(),
      plays: z.number().int(),
      battleId: z.string().nullable(),
    }),
  ),
});

/** Result of a follow/unfollow toggle (server-truth following state + count). */
export const followResultSchema = z.object({
  following: z.boolean(),
  followerCount: z.number().int(),
});

/** The signed-in user's own editable profile (the subset they can change). */
export const meSchema = z.object({
  handle: z.string(),
  displayName: z.string(),
  bio: z.string(),
  campus: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  verified: z.boolean(),
});

/** Wallet — fan Credits (spendable, non-cashable) kept DISTINCT from creator earnings. */
export const walletSchema = z.object({
  credits: moneySchema, // CREDITS
  earnings: moneySchema, // NGN/USD, withdrawable
});

/* ── Creator earnings & withdrawals (the cash-out side of the creator economy) ──
   Earnings are real money (NGN), kept strictly separate from fan Credits. Balances
   and every transition are SERVER-TRUTH — the client never computes a balance, and
   a withdrawal is never shown as complete until the backend confirms it. */
export const earningSourceSchema = z.enum([
  "tip",
  "battle",
  "fanclub",
  "market",
  "bonus",
  "withdrawal",
]);

export const earningEntrySchema = z.object({
  id: z.string(),
  source: earningSourceSchema,
  /** Human-readable line, e.g. "Tip from @ada.beats". */
  label: z.string(),
  amount: moneySchema, // NGN; negative for a withdrawal debit
  createdAt: z.string(),
  status: z.enum(["settled", "pending"]),
});

export const payoutMethodSchema = z.object({
  bank: z.string(),
  /** Masked account, e.g. "••••1234". Full number never leaves the backend. */
  accountMask: z.string(),
});

export const earningsSummarySchema = z.object({
  available: moneySchema, // NGN, withdrawable now
  pending: moneySchema, // NGN, clearing
  lifetime: moneySchema, // NGN, gross all-time
  payoutMethod: payoutMethodSchema.nullable(),
  entries: z.array(earningEntrySchema),
});

/** A bank the user can link for payouts. */
export const bankSchema = z.object({
  code: z.string(),
  name: z.string(),
});

/** Result of an account-name lookup (the "is this really your account?" confirmation step). */
export const resolvedAccountSchema = z.object({
  accountName: z.string(),
});

/* ── Creator analytics (the "studio" — how a creator's content is performing) ──
   Each headline metric carries a `delta`: the percentage change vs the previous
   period of the same length (positive = up). `series` is the daily view count for
   the selected range, for the trend chart. All server-computed; the client only renders. */
export const analyticsRangeSchema = z.enum(["7d", "28d", "90d"]);

const countMetricSchema = z.object({ value: z.number(), delta: z.number() });

export const analyticsMetricsSchema = z.object({
  views: countMetricSchema,
  watchTimeHours: countMetricSchema,
  followers: countMetricSchema,
  earnings: z.object({ value: moneySchema, delta: z.number() }), // NGN
});

export const analyticsPointSchema = z.object({
  date: z.string(),
  views: z.number().int(),
});

export const analyticsClipSchema = z.object({
  id: z.string(),
  caption: z.string(),
  views: z.number().int(),
  likes: z.number().int(),
});

export const audienceCampusSchema = z.object({
  name: z.string(),
  /** Share of the audience, 0..1. */
  share: z.number(),
});

export const creatorAnalyticsSchema = z.object({
  range: analyticsRangeSchema,
  metrics: analyticsMetricsSchema,
  series: z.array(analyticsPointSchema),
  topClips: z.array(analyticsClipSchema),
  topCampuses: z.array(audienceCampusSchema),
});

/* ── Per-clip analytics (drill-down from the Studio's top clips) ───────────────
   `retention` is the audience-retention curve: at each position `pct` (0–100 of
   the clip's duration), `value` is the share still watching (0..1). Traffic
   `sources` show where the views came from. */
export const trafficSourceSchema = z.enum(["fyp", "following", "profile", "search", "share"]);

export const retentionPointSchema = z.object({
  pct: z.number(), // 0..100 position through the clip
  value: z.number(), // 0..1 share still watching
});

export const clipTrafficSchema = z.object({
  source: trafficSourceSchema,
  share: z.number(), // 0..1
});

export const clipAnalyticsSchema = z.object({
  clip: z.object({ id: z.string(), caption: z.string() }),
  views: z.number().int(),
  likes: z.number().int(),
  comments: z.number().int(),
  shares: z.number().int(),
  avgWatchPct: z.number(), // 0..1
  completionRate: z.number(), // 0..1
  retention: z.array(retentionPointSchema),
  sources: z.array(clipTrafficSchema),
});

/* ── Creator content management (the creator's own uploads) ────────────────────
   The list backing "Your content": edit the caption, delete, or jump to a clip's
   insights. `status` is "processing" until the asset finishes transcoding. */
export const myClipSchema = z.object({
  id: z.string(),
  caption: z.string(),
  status: z.enum(["published", "processing"]),
  views: z.number().int(),
  likes: z.number().int(),
  createdAt: z.string(),
});

export const withdrawalResultSchema = z.object({
  reference: z.string(),
  status: z.enum(["processing", "failed"]),
  summary: earningsSummarySchema,
});

/** A purchasable Credit pack. Prices are server-quoted (NGN), never computed client-side. */
export const creditPackSchema = z.object({
  id: z.string(),
  credits: z.number().int(),
  price: moneySchema, // NGN
  /** Optional marketing tag e.g. "Most popular". */
  badge: z.string().nullable(),
});

/** A top-up intent created server-side; the client hands `reference` to Paystack Inline. */
export const topUpIntentSchema = z.object({
  reference: z.string(),
  /** Paystack access code for the inline popup. */
  accessCode: z.string(),
  /** Amount to charge, echoed back for display. */
  price: moneySchema,
});

/**
 * Top-up status. The balance only moves once this reports `success` — which the backend sets from
 * the Paystack WEBHOOK, never from the client. `pending` is the honest in-between state.
 */
export const topUpStatusSchema = z.object({
  reference: z.string(),
  status: z.enum(["pending", "success", "failed"]),
  /** Present once confirmed, so the UI can show the new balance from server truth. */
  wallet: walletSchema.nullable(),
});

export const commentSchema = z.object({
  id: z.string(),
  author: z.object({
    handle: z.string(),
    displayName: z.string(),
    verified: z.boolean(),
  }),
  body: z.string(),
  createdAt: z.string(),
  likeCount: z.number().int(),
});

export const commentPageSchema = z.object({
  items: z.array(commentSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int(),
});

/** Which feed to retrieve (PRD §6.1: algorithmic For You + Following/Support). */
export const feedKindSchema = z.enum(["fyp", "following"]);

/**
 * Result of a one-tap tip (PRD §6.1/§7.2). The Credits are consumed and split into platform fee +
 * creator earnings server-side; the client only ever sees the confirmed wallet back.
 */
export const tipResultSchema = z.object({
  clipId: z.string(),
  creditsSpent: moneySchema, // CREDITS
  wallet: walletSchema, // server-truth balance after the spend
});

/* ── Search & trends (PRD §6.1 — hashtags/search) ──────────────────────────── */
export const hashtagSchema = z.object({
  tag: z.string(),
  posts: z.number().int(),
});

export const searchClipSchema = z.object({
  id: z.string(),
  posterUrl: z.string().url(),
  plays: z.number().int(),
});

export const searchResultSchema = z.object({
  creators: z.array(creatorSchema),
  hashtags: z.array(hashtagSchema),
  clips: z.array(searchClipSchema),
});

/* ── Ambassadors (PRD §6.10 — growth) ──────────────────────────────────────────
   Campus reps with referral tools + gamified rewards. Reward is earned on
   *verified activity*, not raw sign-ups; referrals are de-duplicated. */
export const ambassadorSchema = z.object({
  /** Shareable referral code + link. */
  code: z.string(),
  referralUrl: z.string().url(),
  stats: z.object({
    invited: z.number().int(), // links sent / opened
    joined: z.number().int(), // accounts created (deduped)
    activated: z.number().int(), // verified + active — what actually pays out
    rewards: moneySchema, // CREDITS earned
  }),
  /** Gamified tier progress, measured in activations. */
  tier: z.object({
    name: z.string(),
    activated: z.number().int(),
    nextAt: z.number().int(),
    nextReward: moneySchema, // CREDITS at next tier
  }),
  leaderboard: z.array(
    z.object({
      rank: z.number().int(),
      handle: z.string(),
      displayName: z.string(),
      activations: z.number().int(),
      you: z.boolean(),
    }),
  ),
});

/* ── Direct messages (PRD §11 — basic DMs) ─────────────────────────────────── */
export const dmParticipantSchema = z.object({
  handle: z.string(),
  displayName: z.string(),
  verified: z.boolean(),
  avatarUrl: z.string().url().nullable(),
});

export const dmMessageSchema = z.object({
  id: z.string(),
  /** True when the signed-in user sent it. */
  fromMe: z.boolean(),
  body: z.string(),
  createdAt: z.string(),
});

export const dmThreadSchema = z.object({
  id: z.string(),
  participant: dmParticipantSchema,
  lastMessage: z.string(),
  lastAt: z.string(),
  /** Unread count for the signed-in user. */
  unread: z.number().int(),
});

export const dmThreadDetailSchema = z.object({
  id: z.string(),
  participant: dmParticipantSchema,
  messages: z.array(dmMessageSchema),
});

/* ── Notifications / Activity (the push system's in-app surface) ───────────────
   The companion to web-push: a durable inbox for the events we also notify on —
   follows, likes, comments, tips received, battle results, and payout/earnings
   updates. `actor` is the user who caused it (absent for system/earnings events),
   and `href` is the in-app destination so a tap lands on the right surface. */
export const notificationKindSchema = z.enum([
  "follow",
  "like",
  "comment",
  "tip",
  "battle",
  "earning",
  "system",
]);

export const notificationSchema = z.object({
  id: z.string(),
  kind: notificationKindSchema,
  /** Human-readable summary, e.g. "Ada started following you". */
  text: z.string(),
  createdAt: z.string(),
  read: z.boolean(),
  /** The user who triggered it; null for system/earning events. */
  actor: dmParticipantSchema.nullable(),
  /** In-app destination for a tap; null when there's nothing to open. */
  href: z.string().nullable(),
});

export const notificationsPageSchema = z.object({
  items: z.array(notificationSchema),
  unread: z.number().int(),
});

/** Per-category push preferences. The backend respects these when deciding what to send. */
export const notificationPrefKeySchema = z.enum([
  "tips",
  "battles",
  "follows",
  "comments",
  "messages",
]);

export const notificationPrefsSchema = z.object({
  tips: z.boolean(),
  battles: z.boolean(),
  follows: z.boolean(),
  comments: z.boolean(),
  messages: z.boolean(),
});

/* ── Events (PRD §6.8 — real-world ↔ platform bridge) ──────────────────────────
   Campus shows, concerts, competitions, awards, festivals. Ticketing now;
   NFT tickets (provenance / anti-fraud / resale-royalty) are a later phase. */
export const eventTypeSchema = z.enum(["show", "concert", "competition", "awards", "festival"]);

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: eventTypeSchema,
  coverUrl: z.string().url(),
  startsAt: z.string(),
  venue: z.string(),
  campus: z.string(),
  attendees: z.number().int(),
  /** Ticket price in Credits; minor 0 = free RSVP. */
  price: moneySchema,
  viewer: z.object({ hasTicket: z.boolean() }),
});

export const eventDetailSchema = eventSchema.extend({
  description: z.string(),
  lineup: z.array(z.object({ handle: z.string(), displayName: z.string(), verified: z.boolean() })),
});

export const ticketSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  title: z.string(),
  startsAt: z.string(),
  venue: z.string(),
  /** Opaque code encoded into the QR (signed/rotating in production). */
  code: z.string(),
  status: z.enum(["valid", "used"]),
});

export const ticketResultSchema = z.object({
  ticket: ticketSchema,
  /** Server-truth wallet after any Credit spend (free events leave it unchanged). */
  wallet: walletSchema,
});

/* ── Fan Clubs / premium subscriptions (PRD §6.6, §7.3, §8.3) ──────────────────
   Tiered recurring memberships (Paystack billing). Access is gated on the
   OFF-CHAIN entitlement; membership is mirrored as an expiring ERC-5643 badge.
   Billing truth stays off-chain — never gate on an on-chain read. */
export const fanClubTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: moneySchema, // NGN / month
  perks: z.array(z.string()),
  /** Badge label shown once active. */
  badge: z.string(),
});

export const fanClubSchema = z.object({
  creator: z.object({
    handle: z.string(),
    displayName: z.string(),
    verified: z.boolean(),
  }),
  tiers: z.array(fanClubTierSchema),
  /** The viewer's current membership state for this club. */
  viewer: z.object({
    tierId: z.string().nullable(),
    status: z.enum(["none", "active", "expired"]),
    expiresAt: z.string().nullable(),
  }),
  /** A peek at members-only content (locked unless subscribed). */
  lockedPreview: z.array(z.object({ id: z.string(), title: z.string() })),
});

export const membershipSchema = z.object({
  id: z.string(),
  creatorHandle: z.string(),
  displayName: z.string(),
  tierName: z.string(),
  status: z.enum(["active", "expired", "cancelled"]),
  /** Next billing date while active; null once cancelled/expired. */
  renewsAt: z.string().nullable(),
  expiresAt: z.string(),
});

/** Intent to start a recurring subscription; client hands `reference` to Paystack. */
export const subscribeIntentSchema = z.object({
  reference: z.string(),
  accessCode: z.string(),
  price: moneySchema,
});

/** Subscription status — `active` is set from the Paystack webhook (off-chain truth). */
export const subscriptionStatusSchema = z.object({
  reference: z.string(),
  status: z.enum(["pending", "active", "failed"]),
  membership: membershipSchema.nullable(),
});

/* ── Marketplace (PRD §6.7 — creator economy) ──────────────────────────────────
   Beats, songs, tickets, merch, services. Listings/orders/escrow against the
   ledger; platform commission is a fee entry. Digital goods deliver on
   payment-confirm; physical merch carries fulfilment metadata. Purchases spend
   Credits (server-truth), like every other money action. */
export const marketCategorySchema = z.enum(["beat", "song", "ticket", "merch", "service"]);

export const marketListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: marketCategorySchema,
  /** Digital goods auto-deliver; physical needs shipping. */
  kind: z.enum(["digital", "physical"]),
  price: moneySchema, // CREDITS
  creator: z.object({
    handle: z.string(),
    displayName: z.string(),
    verified: z.boolean(),
  }),
  coverUrl: z.string().url(),
  blurb: z.string(),
  soldCount: z.number().int(),
});

export const marketListingDetailSchema = marketListingSchema.extend({
  description: z.string(),
  /** What the buyer receives (download, unlock, ticket, shipped item). */
  deliverableNote: z.string(),
});

export const marketOrderSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  title: z.string(),
  status: z.enum(["delivered", "processing"]),
  kind: z.enum(["digital", "physical"]),
  /** Present for delivered digital goods (a signed, expiring link or unlock token). */
  deliverable: z
    .object({ type: z.enum(["download", "unlock", "ticket"]), note: z.string() })
    .nullable(),
  /** Server-truth wallet after the Credit spend. */
  wallet: walletSchema,
});

/* ── Talent Intelligence (PRD §6.9 — the scout data product) ────────────────────
   Explainable composite scores (NOT one opaque number): each 0–100. Powers the
   enterprise search/filter/export surface. */
export const talentScoresSchema = z.object({
  growth: z.number(), // Talent Growth
  virality: z.number(), // Virality
  loyalty: z.number(), // Fan Loyalty
  campusInfluence: z.number(), // Campus Influence
  readiness: z.number(), // Label/Sponsor Readiness
});

export const scoutTalentSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  campus: z.string(),
  genre: z.string(),
  verified: z.boolean(),
  followers: z.number().int(),
  scores: talentScoresSchema,
  /** Headline composite, derived from the components above. */
  overall: z.number(),
});

export const scoutTalentDetailSchema = scoutTalentSchema.extend({
  /** Plain-language factors behind the scores (explainability). */
  factors: z.array(z.object({ label: z.string(), detail: z.string() })),
  /** Recent overall-score trend (oldest → newest) for a sparkline. */
  trend: z.array(z.number()),
});

/* ── Moderation (PRD §10.3 — launch-blocking review queue) ──────────────────── */
export const moderationItemSchema = z.object({
  id: z.string(),
  /** What is under review. */
  kind: z.enum(["clip", "comment", "user"]),
  /** How it reached the queue: automated first pass or a user report. */
  source: z.enum(["ai", "report"]),
  /** Human-readable reason, e.g. "Nudity (0.82)" or "Harassment". */
  reason: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  /** AI confidence 0..1 when source = ai. */
  confidence: z.number().nullable(),
  subject: z.object({ handle: z.string(), displayName: z.string() }),
  /** Preview payload: a poster for media, text for comments. */
  preview: z.object({
    posterUrl: z.string().url().nullable(),
    text: z.string().nullable(),
  }),
  reportCount: z.number().int(),
  createdAt: z.string(),
});

export const moderationActionResultSchema = z.object({
  id: z.string(),
  status: z.enum(["approved", "removed", "banned", "escalated"]),
});

/* ── Battles (PRD §6.5) ───────────────────────────────────────────────────
   Time-boxed contests; fans vote with Credits (vote cost → escrow + platform
   fee). State machine Draft→Open→Voting→Settled→Archived. Verified users carry
   more voting weight (§8.4/8.5). */
export const battleFormatSchema = z.enum(["rap", "gospel", "beat", "choir", "songwriting"]);
export const battleStateSchema = z.enum(["draft", "open", "voting", "settled", "archived"]);

export const battleContestantSchema = z.object({
  id: z.string(),
  creator: creatorSchema,
  posterUrl: z.string().url(),
  /** Weighted vote tally (verified votes count for more). */
  votes: z.number().int(),
});

export const battleSchema = z.object({
  id: z.string(),
  format: battleFormatSchema,
  title: z.string(),
  state: battleStateSchema,
  /** When the Voting window closes (ISO). Null outside Voting. */
  endsAt: z.string().nullable(),
  /** Cost of one vote, in Credits. */
  voteCost: moneySchema,
  /** Escrowed prize pool, in Credits. */
  prizePool: moneySchema,
  contestants: z.array(battleContestantSchema),
  /** The winning contestant once settled. */
  winnerContestantId: z.string().nullable(),
  viewer: z.object({
    /** Which contestant the viewer has backed (one vote per battle in MVP). */
    votedContestantId: z.string().nullable(),
    /** The viewer's vote weight (1 free, higher when verified). */
    voteWeight: z.number().int(),
  }),
});

export const voteResultSchema = z.object({
  battle: battleSchema,
  /** Server-truth wallet after the Credit spend (never optimistic). */
  wallet: walletSchema,
});

/* ── Charts (PRD §6.4) ────────────────────────────────────────────────────
   Time-decay leaderboards. Rising Stars ranks velocity (growth), not totals. */
export const chartBoardSchema = z.enum(["campus", "state", "national", "genre", "rising"]);

export const chartEntrySchema = z.object({
  rank: z.number().int(),
  /** Rank change since the last rollup (+up / -down / 0 new-or-flat). */
  delta: z.number().int(),
  creator: creatorSchema,
  /** Composite score for this board. */
  score: z.number(),
  /** For Rising Stars: growth rate as a percentage. */
  risingPct: z.number().nullable(),
});

export const chartSchema = z.object({
  board: chartBoardSchema,
  scope: z.string().nullable(),
  /** Human label for the rollup window, e.g. "This week". */
  periodLabel: z.string(),
  entries: z.array(chartEntrySchema),
});

export type Money = z.infer<typeof moneySchema>;
export type Rendition = z.infer<typeof renditionSchema>;
export type Creator = z.infer<typeof creatorSchema>;
export type Clip = z.infer<typeof clipSchema>;
export type FeedPage = z.infer<typeof feedPageSchema>;
export type EngagementResult = z.infer<typeof engagementResultSchema>;
export type UploadTicket = z.infer<typeof uploadTicketSchema>;
export type PublishResult = z.infer<typeof publishResultSchema>;
export type BattleFormat = z.infer<typeof battleFormatSchema>;
export type BattleState = z.infer<typeof battleStateSchema>;
export type BattleContestant = z.infer<typeof battleContestantSchema>;
export type Battle = z.infer<typeof battleSchema>;
export type VoteResult = z.infer<typeof voteResultSchema>;
export type ChartBoard = z.infer<typeof chartBoardSchema>;
export type ChartEntry = z.infer<typeof chartEntrySchema>;
export type Chart = z.infer<typeof chartSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type FollowResult = z.infer<typeof followResultSchema>;
export type Me = z.infer<typeof meSchema>;
export type Wallet = z.infer<typeof walletSchema>;
export type EarningSource = z.infer<typeof earningSourceSchema>;
export type EarningEntry = z.infer<typeof earningEntrySchema>;
export type PayoutMethod = z.infer<typeof payoutMethodSchema>;
export type EarningsSummary = z.infer<typeof earningsSummarySchema>;
export type WithdrawalResult = z.infer<typeof withdrawalResultSchema>;
export type Bank = z.infer<typeof bankSchema>;
export type ResolvedAccount = z.infer<typeof resolvedAccountSchema>;
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
export type AnalyticsPoint = z.infer<typeof analyticsPointSchema>;
export type AnalyticsClip = z.infer<typeof analyticsClipSchema>;
export type AudienceCampus = z.infer<typeof audienceCampusSchema>;
export type CreatorAnalytics = z.infer<typeof creatorAnalyticsSchema>;
export type TrafficSource = z.infer<typeof trafficSourceSchema>;
export type ClipTraffic = z.infer<typeof clipTrafficSchema>;
export type RetentionPoint = z.infer<typeof retentionPointSchema>;
export type ClipAnalytics = z.infer<typeof clipAnalyticsSchema>;
export type MyClip = z.infer<typeof myClipSchema>;
export type CreditPack = z.infer<typeof creditPackSchema>;
export type TopUpIntent = z.infer<typeof topUpIntentSchema>;
export type TopUpStatus = z.infer<typeof topUpStatusSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type CommentPage = z.infer<typeof commentPageSchema>;
export type FeedKind = z.infer<typeof feedKindSchema>;
export type TipResult = z.infer<typeof tipResultSchema>;
export type Hashtag = z.infer<typeof hashtagSchema>;
export type SearchClip = z.infer<typeof searchClipSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type Ambassador = z.infer<typeof ambassadorSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type EventItem = z.infer<typeof eventSchema>;
export type EventDetail = z.infer<typeof eventDetailSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type TicketResult = z.infer<typeof ticketResultSchema>;
export type FanClubTier = z.infer<typeof fanClubTierSchema>;
export type FanClub = z.infer<typeof fanClubSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type SubscribeIntent = z.infer<typeof subscribeIntentSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type MarketCategory = z.infer<typeof marketCategorySchema>;
export type MarketListing = z.infer<typeof marketListingSchema>;
export type MarketListingDetail = z.infer<typeof marketListingDetailSchema>;
export type MarketOrder = z.infer<typeof marketOrderSchema>;
export type TalentScores = z.infer<typeof talentScoresSchema>;
export type ScoutTalent = z.infer<typeof scoutTalentSchema>;
export type ScoutTalentDetail = z.infer<typeof scoutTalentDetailSchema>;
export type DmParticipant = z.infer<typeof dmParticipantSchema>;
export type DmMessage = z.infer<typeof dmMessageSchema>;
export type DmThread = z.infer<typeof dmThreadSchema>;
export type DmThreadDetail = z.infer<typeof dmThreadDetailSchema>;
export type NotificationKind = z.infer<typeof notificationKindSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationsPage = z.infer<typeof notificationsPageSchema>;
export type NotificationPrefKey = z.infer<typeof notificationPrefKeySchema>;
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
export type ModerationItem = z.infer<typeof moderationItemSchema>;
export type ModerationAction = "approve" | "remove" | "ban" | "escalate";
export type ModerationActionResult = z.infer<typeof moderationActionResultSchema>;

/** Engagement actions that flow through the optimistic queue. */
export type EngagementAction =
  | { kind: "like"; clipId: string; value: boolean }
  | { kind: "follow"; creatorId: string; value: boolean }
  | { kind: "comment"; clipId: string; body: string; localId: string };
