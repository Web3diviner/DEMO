import { z } from "zod";
import {
  feedPageSchema,
  engagementResultSchema,
  uploadTicketSchema,
  publishResultSchema,
  myClipSchema,
  profileSchema,
  meSchema,
  walletSchema,
  earningsSummarySchema,
  withdrawalResultSchema,
  bankSchema,
  resolvedAccountSchema,
  creditPackSchema,
  topUpIntentSchema,
  topUpStatusSchema,
  commentPageSchema,
  battleSchema,
  voteResultSchema,
  chartSchema,
  creatorAnalyticsSchema,
  clipAnalyticsSchema,
  tipResultSchema,
  dmThreadSchema,
  dmThreadDetailSchema,
  dmMessageSchema,
  notificationsPageSchema,
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
  fanClubSchema,
  membershipSchema,
  subscribeIntentSchema,
  subscriptionStatusSchema,
  eventSchema,
  eventDetailSchema,
  ticketSchema,
  ticketResultSchema,
  type EngagementAction,
  type FeedKind,
  type TipResult,
  type DmThread,
  type DmThreadDetail,
  type DmMessage,
  type NotificationsPage,
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
  type FanClub,
  type Membership,
  type SubscribeIntent,
  type SubscriptionStatus,
  type EventItem,
  type EventDetail,
  type EventType,
  type Ticket,
  type TicketResult,
  type FeedPage,
  type EngagementResult,
  type UploadTicket,
  type PublishResult,
  type MyClip,
  type Profile,
  type Me,
  type Wallet,
  type EarningsSummary,
  type WithdrawalResult,
  type Bank,
  type ResolvedAccount,
  type CreditPack,
  type TopUpIntent,
  type TopUpStatus,
  type CommentPage,
  type Battle,
  type BattleState,
  type VoteResult,
  type Chart,
  type ChartBoard,
  type AnalyticsRange,
  type CreatorAnalytics,
  type ClipAnalytics,
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
  content: {
    /** The signed-in creator's own clips, for management. */
    mine(signal?: AbortSignal): Promise<MyClip[]> {
      return request(`/v1/clips/mine`, z.array(myClipSchema), { signal });
    },
    /** Edit a clip's caption. Returns the updated clip. */
    updateCaption(id: string, caption: string): Promise<MyClip> {
      return request(`/v1/clips/${encodeURIComponent(id)}`, myClipSchema, {
        method: "PATCH",
        body: { caption },
      });
    },
    /** Delete a clip. Idempotent. */
    remove(id: string): Promise<{ ok: boolean }> {
      return request(`/v1/clips/${encodeURIComponent(id)}`, z.object({ ok: z.boolean() }), {
        method: "DELETE",
        idempotencyKey: `delete-clip:${id}`,
      });
    },
  },
  profiles: {
    get(handle: string, signal?: AbortSignal): Promise<Profile> {
      return request(`/v1/profiles/${encodeURIComponent(handle)}`, profileSchema, { signal });
    },
  },
  me: {
    /** The signed-in user's own editable profile. */
    get(signal?: AbortSignal): Promise<Me> {
      return request(`/v1/me`, meSchema, { signal });
    },
    /** Update editable profile fields. Returns the saved profile. */
    update(input: { displayName: string; bio: string; campus: string | null }): Promise<Me> {
      return request(`/v1/me`, meSchema, { method: "PATCH", body: input });
    },
  },
  wallet: {
    get(signal?: AbortSignal): Promise<Wallet> {
      return request(`/v1/wallet`, walletSchema, { signal });
    },
  },
  earnings: {
    /** Creator earnings: withdrawable/pending/lifetime balances, payout method, recent entries. */
    summary(signal?: AbortSignal): Promise<EarningsSummary> {
      return request(`/v1/earnings`, earningsSummarySchema, { signal });
    },
    /** Request a withdrawal of `amountMinor` (NGN kobo). Server-truth; never optimistic. */
    withdraw(amountMinor: number): Promise<WithdrawalResult> {
      return request(`/v1/earnings/withdraw`, withdrawalResultSchema, {
        method: "POST",
        body: { amountMinor },
        idempotencyKey: `withdraw:${amountMinor}:${Date.now()}`,
      });
    },
    /** Banks available for payout. */
    banks(signal?: AbortSignal): Promise<Bank[]> {
      return request(`/v1/banks`, z.array(bankSchema), { signal });
    },
    /** Resolve the account holder's name for a bank + account number (confirmation step). */
    resolveAccount(
      bankCode: string,
      accountNumber: string,
      signal?: AbortSignal,
    ): Promise<ResolvedAccount> {
      const qs = new URLSearchParams({ bankCode, accountNumber });
      return request(`/v1/earnings/payout-method/resolve?${qs.toString()}`, resolvedAccountSchema, {
        signal,
      });
    },
    /** Link a bank account as the payout method. Returns the updated summary (account masked). */
    setPayoutMethod(bankCode: string, accountNumber: string): Promise<EarningsSummary> {
      return request(`/v1/earnings/payout-method`, earningsSummarySchema, {
        method: "POST",
        body: { bankCode, accountNumber },
        idempotencyKey: `payout:${bankCode}:${accountNumber}`,
      });
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
  analytics: {
    /** A creator's performance dashboard for the selected range (server-computed). */
    get(range: AnalyticsRange, signal?: AbortSignal): Promise<CreatorAnalytics> {
      return request(`/v1/analytics?range=${range}`, creatorAnalyticsSchema, { signal });
    },
    /** Per-clip breakdown: retention curve, engagement, and traffic sources. */
    clip(clipId: string, signal?: AbortSignal): Promise<ClipAnalytics> {
      return request(`/v1/analytics/clips/${encodeURIComponent(clipId)}`, clipAnalyticsSchema, {
        signal,
      });
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
  events: {
    /** Upcoming events (PRD §6.8), optionally by type. */
    list(type: EventType | "all", signal?: AbortSignal): Promise<EventItem[]> {
      const qs = type === "all" ? "" : `?type=${type}`;
      return request(`/v1/events${qs}`, z.array(eventSchema), { signal });
    },
    get(id: string, signal?: AbortSignal): Promise<EventDetail> {
      return request(`/v1/events/${encodeURIComponent(id)}`, eventDetailSchema, { signal });
    },
    /** Reserve a ticket. Spends Credits if priced (server-truth); free events just RSVP. */
    getTicket(id: string): Promise<TicketResult> {
      return request(`/v1/events/${encodeURIComponent(id)}/tickets`, ticketResultSchema, {
        method: "POST",
        idempotencyKey: `ticket:${id}`,
      });
    },
    /** The signed-in user's ticket wallet (passes). */
    tickets(signal?: AbortSignal): Promise<Ticket[]> {
      return request(`/v1/tickets`, z.array(ticketSchema), { signal });
    },
  },
  premium: {
    /** A creator's Fan Club: tiers, the viewer's membership, and locked-content preview. */
    fanclub(handle: string, signal?: AbortSignal): Promise<FanClub> {
      return request(`/v1/creators/${encodeURIComponent(handle)}/fanclub`, fanClubSchema, {
        signal,
      });
    },
    /** Start a recurring subscription; returns the Paystack reference for the popup. */
    subscribe(creatorHandle: string, tierId: string): Promise<SubscribeIntent> {
      return request(`/v1/fanclub/subscribe`, subscribeIntentSchema, {
        method: "POST",
        body: { creatorHandle, tierId },
        idempotencyKey: `sub:${creatorHandle}:${tierId}:${Date.now()}`,
      });
    },
    /** Poll until the first charge is webhook-confirmed; entitlement flips `active`. */
    subscriptionStatus(reference: string, signal?: AbortSignal): Promise<SubscriptionStatus> {
      return request(
        `/v1/fanclub/subscribe/${encodeURIComponent(reference)}`,
        subscriptionStatusSchema,
        {
          signal,
        },
      );
    },
    memberships(signal?: AbortSignal): Promise<Membership[]> {
      return request(`/v1/memberships`, z.array(membershipSchema), { signal });
    },
    cancel(membershipId: string): Promise<Membership> {
      return request(
        `/v1/memberships/${encodeURIComponent(membershipId)}/cancel`,
        membershipSchema,
        {
          method: "POST",
        },
      );
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
  notifications: {
    /** The activity inbox (PRD §11) — the durable companion to web-push. */
    list(signal?: AbortSignal): Promise<NotificationsPage> {
      return request(`/v1/notifications`, notificationsPageSchema, { signal });
    },
    /** Mark a single notification read (idempotent) — e.g. when its row is opened. */
    read(id: string): Promise<NotificationsPage> {
      return request(`/v1/notifications/${encodeURIComponent(id)}/read`, notificationsPageSchema, {
        method: "POST",
        idempotencyKey: `notifications:read:${id}`,
      });
    },
    /** Mark everything read. Idempotent; returns the cleared page. */
    markAllRead(): Promise<NotificationsPage> {
      return request(`/v1/notifications/read`, notificationsPageSchema, {
        method: "POST",
        idempotencyKey: "notifications:read-all",
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
