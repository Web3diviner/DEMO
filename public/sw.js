/**
 * Skylora service worker — hand-rolled for full control on slow/intermittent networks.
 *
 * Strategy, by request type:
 *   - App shell / navigations  → network-first, fall back to cached offline shell.
 *   - Static build assets       → stale-while-revalidate (instant, refresh in background).
 *   - Media (video/HLS/images)  → NEVER cached. Data is the user's money; the CDN handles media.
 *
 * Plus: a Background Sync hook that drains the optimistic engagement queue when connectivity
 * returns, and a web-push handler. Media bypass is the single most important rule here.
 */

const VERSION = "v1";
const SHELL_CACHE = `demo-shell-${VERSION}`;
const ASSET_CACHE = `demo-assets-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE = ["/", "/feed", OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isMedia(request) {
  const url = new URL(request.url);
  return (
    request.destination === "video" ||
    request.destination === "audio" ||
    /\.(m3u8|ts|mp4|webm|m4s)(\?|$)/i.test(url.pathname) ||
    /\/media\//i.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Media is never intercepted or cached — let it stream straight from the CDN.
  if (isMedia(request)) return;

  // Navigations: network-first with offline shell fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  const url = new URL(request.url);
  if (url.origin === self.location.origin && /\/_next\/static\//.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

// Background Sync: drain the optimistic engagement queue when back online.
self.addEventListener("sync", (event) => {
  if (event.tag === "demo-engagement-sync") {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "DRAIN_ENGAGEMENT_QUEUE" }));
      }),
    );
  }
});

// Web push (creator earnings, battle results, DMs).
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Skylora", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Skylora", {
      body: payload.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { url: payload.url ?? "/feed" },
      tag: payload.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/feed";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(target));
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    }),
  );
});
