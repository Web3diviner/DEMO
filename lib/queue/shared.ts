"use client";

import { EngagementQueue, bindQueueToLifecycle } from "./engagement-queue";
import { api } from "@/lib/api/client";

/**
 * One process-wide optimistic engagement queue. A singleton (not per-component) so the feed and the
 * comment sheet share the same persisted queue and a single drainer — no competing drain passes,
 * no double-sends.
 */
let queue: EngagementQueue | null = null;

export function getEngagementQueue(): EngagementQueue {
  if (!queue) {
    queue = new EngagementQueue(async (action) => {
      await api.engagement.commit(action);
    });
    bindQueueToLifecycle(queue);
  }
  return queue;
}
