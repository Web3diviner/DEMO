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

export type Money = z.infer<typeof moneySchema>;
export type Rendition = z.infer<typeof renditionSchema>;
export type Creator = z.infer<typeof creatorSchema>;
export type Clip = z.infer<typeof clipSchema>;
export type FeedPage = z.infer<typeof feedPageSchema>;
export type EngagementResult = z.infer<typeof engagementResultSchema>;

/** Engagement actions that flow through the optimistic queue. */
export type EngagementAction =
  | { kind: "like"; clipId: string; value: boolean }
  | { kind: "follow"; creatorId: string; value: boolean }
  | { kind: "comment"; clipId: string; body: string; localId: string };
