import { z } from "zod";
import {
  feedPageSchema,
  engagementResultSchema,
  type EngagementAction,
  type FeedPage,
  type EngagementResult,
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
    page(cursor: string | null, signal?: AbortSignal): Promise<FeedPage> {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      return request(`/v1/feed${qs}`, feedPageSchema, { signal });
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
};
