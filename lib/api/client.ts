import { z } from "zod";
import {
  feedPageSchema,
  engagementResultSchema,
  uploadTicketSchema,
  publishResultSchema,
  profileSchema,
  walletSchema,
  creditPackSchema,
  topUpIntentSchema,
  topUpStatusSchema,
  commentPageSchema,
  battleSchema,
  voteResultSchema,
  chartSchema,
  tipResultSchema,
  dmThreadSchema,
  dmThreadDetailSchema,
  dmMessageSchema,
  moderationItemSchema,
  moderationActionResultSchema,
  searchResultSchema,
  hashtagSchema,
  ambassadorSchema,
  scoutTalentSchema,
  scoutTalentDetailSchema,
  marketListingSchema,
  marketListingDetailSchema,
  marketOrderSchema,
  type EngagementAction,
  type FeedKind,
  type TipResult,
  type DmThread,
  type DmThreadDetail,
  type DmMessage,
  type ModerationItem,
  type ModerationAction,
  type ModerationActionResult,
  type SearchResult,
  type Hashtag,
  type Ambassador,
  type ScoutTalent,
  type ScoutTalentDetail,
  type MarketListing,
  type MarketListingDetail,
  type MarketOrder,
  type MarketCategory,
  type FeedPage,
  type EngagementResult,
  type UploadTicket,
  type PublishResult,
  type Profile,
  type Wallet,
  type CreditPack,
  type TopUpIntent,
  type TopUpStatus,
  type CommentPage,
  type Battle,
  type BattleState,
  type VoteResult,
  type Chart,
  type ChartBoard,
} from "./types";

/**
 * Typed API client — a thin, validated wrapper over fetch.
 *
 * Responsibilities:
 *   - inject auth + tracing headers,
 *   - normalize errors into a single ApiError shape,
 *   - validate every response with Zod before it reaches the app (trust nothing on the wire),
 *   - stay backend-agnostic (contract-first).
 *
 * In this foundation, requests are routed to a local mock (see `mock.ts`) via NEXT_PUBLIC_USE_MOCK,
 * so the whole feed slice runs end-to-end without a backend. Flip the env to hit a real API.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_ORIGIN ?? "";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false"; // default on until backend exists

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Idempotency key for money-sensitive POSTs (server de-dupes retries). */
  idempotencyKey?: string;
};

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  opts: RequestOptions = {},
): Promise<T> {
  if (USE_MOCK) {
    const { handleMock } = await import("./mock");
    const data = await handleMock(path, opts);
    return schema.parse(data);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.idempotencyKey ? { "idempotency-key": opts.idempotencyKey } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include", // httpOnly session cookie
    signal: opts.signal,
  });

  if (!res.ok) {
    let code: string | undefined;
    let message = res.statusText;
    try {
      const err = await res.json();
      code = err.code;
      message = err.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message, code);
  }

  const json = res.status === 204 ? undefined : await res.json();
  return schema.parse(json);
}

export const api = {
  feed: {
    page(cursor: string | null, kind: FeedKind = "fyp", signal?: AbortSignal): Promise<FeedPage> {
      const params = new URLSearchParams({ feed: kind });
      if (cursor) params.set("cursor", cursor);
      return request(`/v1/feed?${params.toString()}`, feedPageSchema, { signal });
    },
  },
  tips: {
    /** Send a one-tap tip (Credits → platform fee + creator earnings). Spend is server-truth. */
    send(clipId: string, credits: number): Promise<TipResult> {
      return request(`/v1/clips/${encodeURIComponent(clipId)}/tip`, tipResultSchema, {
        method: "POST",
        body: { credits },
        idempotencyKey: `tip:${clipId}:${credits}:${Date.now()}`,
      });
    },
  },
  engagement: {
    /** Confirm a single optimistic engagement action with the server. */
    commit(action: EngagementAction): Promise<EngagementResult> {
      return request(`/v1/engagement`, engagementResultSchema, {
        method: "POST",
        body: action,
        idempotencyKey:
          action.kind === "comment"
            ? action.localId
            : `${action.kind}:${"clipId" in action ? action.clipId : action.creatorId}:${action.value}`,
      });
    },
  },
  uploads: {
    /** Request a signed, short-lived ticket to upload a clip directly to storage (tus). */
    createTicket(input: { sizeBytes: number; mimeType: string }): Promise<UploadTicket> {
      return request(`/v1/uploads/ticket`, uploadTicketSchema, { method: "POST", body: input });
    },
    /** Attach metadata + claim the uploaded asset once the bytes are in. */
    publish(input: { assetId: string; caption: string }): Promise<PublishResult> {
      return request(`/v1/clips`, publishResultSchema, {
        method: "POST",
        body: input,
        idempotencyKey: `publish:${input.assetId}`,
      });
    },
  },
  profiles: {
    get(handle: string, signal?: AbortSignal): Promise<Profile> {
      return request(`/v1/profiles/${encodeURIComponent(handle)}`, profileSchema, { signal });
    },
  },
  wallet: {
    get(signal?: AbortSignal): Promise<Wallet> {
      return request(`/v1/wallet`, walletSchema, { signal });
    },
  },
  credits: {
    packs(signal?: AbortSignal): Promise<CreditPack[]> {
      return request(`/v1/credits/packs`, z.array(creditPackSchema), { signal });
    },
    /** Create a server-side top-up intent; returns the Paystack reference to hand to the popup. */
    createTopUp(packId: string): Promise<TopUpIntent> {
      return request(`/v1/credits/topup`, topUpIntentSchema, {
        method: "POST",
        body: { packId },
        idempotencyKey: `topup:${packId}:${Date.now()}`,
      });
    },
    /** Poll until the backend confirms the Paystack webhook. Balance moves only on `success`. */
    topUpStatus(reference: string, signal?: AbortSignal): Promise<TopUpStatus> {
      return request(`/v1/credits/topup/${encodeURIComponent(reference)}`, topUpStatusSchema, {
        signal,
      });
    },
  },
  comments: {
    list(clipId: string, cursor: string | null, signal?: AbortSignal): Promise<CommentPage> {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      return request(`/v1/clips/${encodeURIComponent(clipId)}/comments${qs}`, commentPageSchema, {
        signal,
      });
    },
  },
  battles: {
    list(state: BattleState | "all", signal?: AbortSignal): Promise<Battle[]> {
      const qs = state === "all" ? "" : `?state=${state}`;
      return request(`/v1/battles${qs}`, z.array(battleSchema), { signal });
    },
    get(id: string, signal?: AbortSignal): Promise<Battle> {
      return request(`/v1/battles/${encodeURIComponent(id)}`, battleSchema, { signal });
    },
    /** Cast one Credit-funded, weight-adjusted vote. Spend is server-truth; never optimistic. */
    vote(id: string, contestantId: string): Promise<VoteResult> {
      return request(`/v1/battles/${encodeURIComponent(id)}/vote`, voteResultSchema, {
        method: "POST",
        body: { contestantId },
        idempotencyKey: `vote:${id}:${contestantId}`,
      });
    },
  },
  charts: {
    get(board: ChartBoard, scope: string | null, signal?: AbortSignal): Promise<Chart> {
      const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
      return request(`/v1/charts/${board}${qs}`, chartSchema, { signal });
    },
  },
  search: {
    query(q: string, signal?: AbortSignal): Promise<SearchResult> {
      return request(`/v1/search?q=${encodeURIComponent(q)}`, searchResultSchema, { signal });
    },
    trends(signal?: AbortSignal): Promise<Hashtag[]> {
      return request(`/v1/trends`, z.array(hashtagSchema), { signal });
    },
  },
  ambassador: {
    get(signal?: AbortSignal): Promise<Ambassador> {
      return request(`/v1/ambassador`, ambassadorSchema, { signal });
    },
  },
  scout: {
    /** Talent Intelligence search/filter (PRD §6.9). Enterprise RBAC enforced server-side. */
    search(
      params: { q?: string; campus?: string; genre?: string; minOverall?: number },
      signal?: AbortSignal,
    ): Promise<ScoutTalent[]> {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.campus) qs.set("campus", params.campus);
      if (params.genre) qs.set("genre", params.genre);
      if (params.minOverall) qs.set("minOverall", String(params.minOverall));
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request(`/v1/scout/talents${suffix}`, z.array(scoutTalentSchema), { signal });
    },
    talent(handle: string, signal?: AbortSignal): Promise<ScoutTalentDetail> {
      return request(`/v1/scout/talents/${encodeURIComponent(handle)}`, scoutTalentDetailSchema, {
        signal,
      });
    },
  },
  market: {
    /** Browse listings (PRD §6.7), optionally by category. */
    listings(category: MarketCategory | "all", signal?: AbortSignal): Promise<MarketListing[]> {
      const qs = category === "all" ? "" : `?category=${category}`;
      return request(`/v1/market/listings${qs}`, z.array(marketListingSchema), { signal });
    },
    listing(id: string, signal?: AbortSignal): Promise<MarketListingDetail> {
      return request(`/v1/market/listings/${encodeURIComponent(id)}`, marketListingDetailSchema, {
        signal,
      });
    },
    /** Buy a listing. Credits spend is server-truth; digital delivers on confirm. */
    createOrder(input: {
      listingId: string;
      shipping?: { name: string; address: string; phone: string };
    }): Promise<MarketOrder> {
      return request(`/v1/market/orders`, marketOrderSchema, {
        method: "POST",
        body: input,
        idempotencyKey: `order:${input.listingId}:${Date.now()}`,
      });
    },
  },
  push: {
    /** Register a Web Push subscription so the backend can deliver notifications. */
    subscribe(subscription: PushSubscriptionJSON): Promise<{ ok: boolean }> {
      return request(`/v1/push/subscribe`, z.object({ ok: z.boolean() }), {
        method: "POST",
        body: { subscription },
      });
    },
    unsubscribe(endpoint: string): Promise<{ ok: boolean }> {
      return request(`/v1/push/unsubscribe`, z.object({ ok: z.boolean() }), {
        method: "POST",
        body: { endpoint },
      });
    },
  },
  dms: {
    threads(signal?: AbortSignal): Promise<DmThread[]> {
      return request(`/v1/dms`, z.array(dmThreadSchema), { signal });
    },
    thread(id: string, signal?: AbortSignal): Promise<DmThreadDetail> {
      return request(`/v1/dms/${encodeURIComponent(id)}`, dmThreadDetailSchema, { signal });
    },
    send(id: string, body: string, localId: string): Promise<DmMessage> {
      return request(`/v1/dms/${encodeURIComponent(id)}/messages`, dmMessageSchema, {
        method: "POST",
        body: { body, localId },
        idempotencyKey: localId,
      });
    },
  },
  moderation: {
    /** Staff-only review queue (server enforces staff RBAC; this is the console UI). */
    queue(signal?: AbortSignal): Promise<ModerationItem[]> {
      return request(`/v1/moderation/queue`, z.array(moderationItemSchema), { signal });
    },
    act(id: string, action: ModerationAction): Promise<ModerationActionResult> {
      return request(
        `/v1/moderation/${encodeURIComponent(id)}/action`,
        moderationActionResultSchema,
        {
          method: "POST",
          body: { action },
          idempotencyKey: `mod:${id}:${action}`,
        },
      );
    },
  },
};
