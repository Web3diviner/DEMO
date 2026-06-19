/**
 * Web push subscription (client side). The service worker already handles `push` and
 * `notificationclick` (see public/sw.js); this manages the *subscription* lifecycle:
 * request permission → subscribe via PushManager with the VAPID key → hand the subscription to the
 * backend, which sends the actual notifications.
 *
 * Everything degrades gracefully where Push isn't supported (notably iOS outside installed PWAs).
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState = "unsupported" | "default" | "denied" | "subscribed";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Convert a base64url VAPID key to the BufferSource PushManager expects. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  return existing ? "subscribed" : "default";
}

/**
 * Request permission + subscribe, then register the subscription with the backend.
 * Returns the resulting state. Throws only on unexpected failures the UI should surface.
 */
export async function enablePush(): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "default";

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY) : undefined,
    });
  }

  const { api } = await import("@/lib/api/client");
  await api.push.subscribe(sub.toJSON());
  return "subscribed";
}

export async function disablePush(): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const { api } = await import("@/lib/api/client");
    await api.push.unsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return "default";
}
