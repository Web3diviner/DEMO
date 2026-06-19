/**
 * Analytics / event logging.
 *
 * From day one we instrument impressions, completion, dwell, and all engagement — this stream feeds
 * the recommendation feature store (per the build instructions). Privacy-respecting: events are
 * gated behind consent, carry no PII by default, and batch to minimize data usage.
 *
 * This is a typed event contract + a pluggable sink. The sink is swapped for the real transport
 * (e.g. a batched beacon to the events endpoint) without touching call sites.
 */

export type AnalyticsEvent =
  | { type: "clip_impression"; clipId: string; position: number }
  | { type: "clip_play"; clipId: string }
  | { type: "clip_dwell"; clipId: string; ms: number; completionPct: number }
  | { type: "clip_complete"; clipId: string }
  | {
      type: "engagement";
      action: "like" | "unlike" | "follow" | "comment" | "share" | "support";
      clipId: string;
    }
  | { type: "feed_switch"; kind: "fyp" | "following" }
  | { type: "data_saver_toggle"; on: boolean }
  | { type: "route_view"; path: string };

export interface AnalyticsSink {
  track(event: AnalyticsEvent, ctx: { ts: number }): void;
  flush?(): void;
}

/** Dev sink: structured console logging. Replace with a batched beacon sink in production. */
class ConsoleSink implements AnalyticsSink {
  track(event: AnalyticsEvent, ctx: { ts: number }): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics]", event.type, { ...event, ts: ctx.ts });
    }
  }
}

let sink: AnalyticsSink = new ConsoleSink();
let consented = false; // flips true once the user accepts (NDPR-aware).

export function configureAnalytics(opts: { sink?: AnalyticsSink; consented?: boolean }): void {
  if (opts.sink) sink = opts.sink;
  if (typeof opts.consented === "boolean") consented = opts.consented;
}

export function track(event: AnalyticsEvent): void {
  if (!consented) return; // no events without consent
  sink.track(event, { ts: Date.now() });
}

export function flushAnalytics(): void {
  sink.flush?.();
}
