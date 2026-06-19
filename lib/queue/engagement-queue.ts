import type { EngagementAction } from "@/lib/api/types";

/**
 * Optimistic engagement queue.
 *
 * Core promise: engagement (likes/follows/comments) NEVER blocks on a network round-trip. The UI
 * updates instantly; the action is persisted locally and drained in the background — surviving page
 * reloads and connectivity loss. When the device comes back online, the service worker's Background
 * Sync fires and asks us to drain.
 *
 * Persistence uses localStorage for the foundation (synchronous, universally available, tiny
 * payloads). The interface is storage-agnostic so it can move to IndexedDB if volume grows.
 *
 * De-duplication: a like toggled on then off collapses to the latest intent per target, so we never
 * ship a flapping sequence over precious mobile data.
 */

const STORAGE_KEY = "demo.engagement.queue.v1";
const SYNC_TAG = "demo-engagement-sync";

type QueuedItem = {
  id: string;
  action: EngagementAction;
  attempts: number;
  createdAt: number;
};

type Drainer = (action: EngagementAction) => Promise<void>;

function dedupeKey(a: EngagementAction): string {
  switch (a.kind) {
    case "like":
      return `like:${a.clipId}`;
    case "follow":
      return `follow:${a.creatorId}`;
    case "comment":
      return `comment:${a.localId}`; // comments are distinct events, never collapsed
  }
}

export class EngagementQueue {
  private draining = false;

  constructor(private drainer: Drainer) {}

  private read(): QueuedItem[] {
    if (typeof localStorage === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  private write(items: QueuedItem[]): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  get size(): number {
    return this.read().length;
  }

  /** Enqueue an action, collapsing any prior pending action for the same target. */
  enqueue(action: EngagementAction): void {
    const items = this.read();
    const key = dedupeKey(action);
    const filtered = items.filter((it) => dedupeKey(it.action) !== key);
    filtered.push({
      id: `${key}:${Date.now()}`,
      action,
      attempts: 0,
      createdAt: Date.now(),
    });
    this.write(filtered);
    this.requestSync();
    void this.drain();
  }

  /** Register for Background Sync so the OS wakes us to drain when connectivity returns. */
  private async requestSync(): Promise<void> {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    try {
      const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      await reg.sync?.register(SYNC_TAG);
    } catch {
      /* Background Sync unsupported (iOS); we still drain opportunistically below. */
    }
  }

  /** Attempt to flush the queue. Safe to call repeatedly; self-guards against concurrency. */
  async drain(): Promise<void> {
    if (this.draining) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    this.draining = true;
    try {
      let items = this.read();
      while (items.length > 0) {
        const item = items[0];
        try {
          await this.drainer(item.action);
          items = this.read().filter((it) => it.id !== item.id);
          this.write(items);
        } catch {
          // Leave it queued with a bumped attempt count; back off and stop this pass.
          item.attempts += 1;
          this.write(items.map((it) => (it.id === item.id ? item : it)));
          break;
        }
      }
    } finally {
      this.draining = false;
    }
  }
}

/** Wire the SW "drain" message and online events to a queue instance. Returns a cleanup fn. */
export function bindQueueToLifecycle(queue: EngagementQueue): () => void {
  if (typeof window === "undefined") return () => {};
  const onOnline = () => void queue.drain();
  const onMessage = (e: MessageEvent) => {
    if (e.data?.type === "DRAIN_ENGAGEMENT_QUEUE") void queue.drain();
  };
  window.addEventListener("online", onOnline);
  navigator.serviceWorker?.addEventListener("message", onMessage);
  void queue.drain();
  return () => {
    window.removeEventListener("online", onOnline);
    navigator.serviceWorker?.removeEventListener("message", onMessage);
  };
}
