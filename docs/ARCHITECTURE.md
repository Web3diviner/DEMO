# DEMO — Frontend Architecture

> Mobile-web-first PWA for Nigerian students on expensive mobile data.
> Audience constraint drives **every** decision: mid-range Android phones, slow/intermittent 4G, data is money.

This document covers the **client** architecture (the deliverable for this repo). Backend is
**contract-first**: the frontend is built against [`contracts/openapi.yaml`](../contracts/openapi.yaml),
which is the single source of truth. A Go or TS backend can be implemented against it later without
touching the client.

---

## 1. Principles (in priority order)

1. **Data is the user's money.** Never waste a byte. Data-saver is the default, not a setting.
2. **Never block the UI on the network.** Optimistic by default; reconcile in the background.
3. **The backend is the source of truth for money and entitlements.** The client never computes
   balances, never reads the chain, never grants a feature optimistically for anything irreversible.
4. **Ship small JS.** Mid-range phones have weak CPUs. Code-split aggressively; lazy-load the player.
5. **Accessible and fast are the same goal.** Both come from less, simpler, well-structured DOM.

## 2. System context

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (mobile-web PWA)  — THIS REPO                               │
│                                                                     │
│  Next.js App Router (RSC + client islands)                          │
│   ├─ (marketing)  landing                                           │
│   ├─ (app)        feed · profile · upload · battles · charts ·      │
│   │               credits · creator · dms        [consumer auth]    │
│   ├─ (admin)      moderation · ledger/fraud       [staff SSO+RBAC]  │
│   └─ (enterprise) Talent Intelligence             [enterprise auth] │
│                                                                     │
│  Service Worker  — offline shell · engagement sync queue · push     │
└───────────┬───────────────────────┬─────────────────┬──────────────┘
            │ typed API client      │ tus (resumable) │ HLS (.m3u8)
            ▼                       ▼                 ▼
     ┌────────────┐         ┌──────────────┐   ┌──────────────┐
     │  DEMO API  │         │ Object store │   │  CDN / HLS   │
     │ (contract) │         │  (R2/S3)     │   │  edge        │
     └─────┬──────┘         └──────────────┘   └──────────────┘
           │ webhooks
     ┌─────▼──────┐   ┌────────────┐   ┌─────────────────────┐
     │  Paystack  │   │ Embedded   │   │ Recommendation /    │
     │  payments  │   │ wallet svc │   │ feature store       │
     └────────────┘   └────────────┘   └─────────────────────┘
```

**Key boundary rules**

- **Video never transits our API.** Uploads go straight to object storage via a backend-issued,
  short-lived signed `tus` ticket. Playback is signed, expiring `.m3u8` URLs from the CDN.
- **Money is webhook-confirmed.** Top-ups show a _pending_ state until the backend confirms the
  Paystack webhook. No optimistic credit, ever.
- **Entitlements are server-truth.** Verification badges/features gate on a backend entitlement
  flag, never on an on-chain read. The wallet is invisible (no seed phrase, no gas).

## 3. Rendering strategy

| Surface               | Strategy                                        | Why                                                       |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| Landing `(marketing)` | Static / RSC                                    | SEO, instant first paint, zero client JS baseline         |
| Feed `(app)/feed`     | Client island over RSC shell                    | Real-time interaction, player lifecycle, gesture handling |
| Profile / charts      | RSC + streamed data, client islands for actions | Mostly read; small interactive bits                       |
| Money flows           | Client, server-confirmed                        | Needs Paystack popup + live pending state                 |
| Admin / enterprise    | Client, behind RBAC, lazy route group           | Heavy tables; never in consumer bundle                    |

The consumer feed is the only heavy client surface and is **lazy** — `hls.js` and player code are
dynamically imported so they never enter the initial bundle.

## 4. Data layer

- **TanStack Query** owns all server state: caching, dedupe, background refetch, retry/backoff.
- **Typed API client** (`lib/api`) wraps `fetch` with auth, tracing headers, error normalization,
  and Zod-validated responses. Types are authored to mirror `contracts/openapi.yaml` (and will be
  _generated_ from it in CI once the backend publishes the spec).
- **Optimistic engagement queue** (`lib/queue`) persists likes/follows/comments to IndexedDB-backed
  storage and drains via the service worker Background Sync API; the UI updates instantly and
  reconciles on confirmation. This is the core "never block on the network" mechanism.
- **Money is never optimistic.** Balance mutations are read-only on the client until the server
  confirms; `lib/money` models all amounts in **integer minor units** (see §6).

## 5. Performance budget

| Metric                   | Target        | Mechanism                                             |
| ------------------------ | ------------- | ----------------------------------------------------- |
| Initial JS (consumer)    | < 130 KB gzip | RSC, code-split, lazy player, no heavy date/icon libs |
| LCP (Wi-Fi)              | < 1.0 s       | Static shell, priority hints, first-frame poster      |
| First clip frame (Wi-Fi) | < 1.0 s       | Preload next-1 only, low-bitrate start, poster image  |
| CLS                      | < 0.05        | Fixed media aspect boxes, reserved space              |
| INP                      | < 200 ms      | Off-main-thread sync, no layout thrash on scroll      |
| Feed scroll              | 60 fps        | CSS `scroll-snap`, GPU transforms, max 2 live players |

Data discipline (cellular): ≤480p ceiling, prefetch **only** on Wi-Fi, honor `Save-Data`.

## 6. Money model

All monetary values are **integer minor units** with an explicit currency tag — never floats.

- **Credits** — fan, spendable, _non-cashable_. Internal unit. Surfaced as "Credits".
- **NGN** — kobo (1 NGN = 100 kobo). Paystack settlement currency.
- **USD** — cents. Used for the $1 creator / <$1 fan verification price points.
- **Creator earnings** — withdrawable/convertible, shown **distinctly** from Credits.

`lib/money.ts` provides typed constructors, arithmetic that refuses cross-currency mixing, and
locale-aware formatting. The UI must never imply Credits cash out.

## 7. Security architecture (client)

- **No secrets client-side.** Only publishable keys (Paystack public key). All signing is server-side.
- **Signed, expiring URLs** for every upload (tus ticket) and playback (`.m3u8`).
- **CSP** + standard headers set in `next.config.ts` (see §8). No inline scripts except hashed/nonce.
- **AuthN/Z**: consumer session (httpOnly cookie) vs staff SSO vs enterprise auth are **separate**.
  RBAC is enforced server-side; the client mirrors it (`lib/auth/rbac.ts`) for routing/affordances
  only — never as the security boundary.
- **Input validation** with Zod at every trust boundary (API responses, URL params, form input).
- **Abuse/fraud**: the engagement queue is rate-limited and de-duplicated client-side as a courtesy;
  the server is the authority. Money flows are webhook-gated to prevent client-forged credit.

## 8. Headers / hardening

Set in `next.config.ts`: `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`,
`Cross-Origin-Opener-Policy`. CSP allows the CDN media origin and Paystack; everything else default-deny.

## 9. Offline / PWA

- **Installable**: `manifest.webmanifest` + maskable icons, standalone display, theme color.
- **Offline shell**: hand-rolled service worker (`public/sw.js`) precaches the app shell and serves
  it when offline; media is never precached (data discipline).
- **Background sync**: engagement queue drains when connectivity returns.
- **Web push**: FCM-web/`web-push` for notifications (creator earnings, battle results, DMs).
  Hand-rolled SW chosen over `next-pwa` for Next 16 / Turbopack compatibility and full control.

## 10. Deployment (target)

- Edge-rendered static + RSC on a global CDN (Vercel or equivalent). Lagos/Africa edge presence is
  the priority for latency to the audience.
- Media on object storage (R2/S3) + CDN with signed URLs; HLS rungs transcoded server-side.
- Preview deploys per PR; Lighthouse CI budget gate in the pipeline (see `.github/workflows/ci.yml`).

## 11. Testing strategy

- **Unit** (Vitest): money math, queue reconciliation, data-saver decisions.
- **Component** (Vitest + Testing Library): feed item, engagement bar, money displays.
- **E2E** (Playwright): the money-critical path `top-up → spend → battle vote`, and feed scroll.
- **Budget gate**: Lighthouse PWA + performance in CI.

## 12. Open risks / PRD gaps

Tracked in [`ASSUMPTIONS.md`](./ASSUMPTIONS.md). The economics, battle scoring, charts math, and
fraud rules come from `DEMO_PRD.md`, which is not yet available to this repo. The feed slice,
design system, and foundation do not depend on those internals; they are flagged for confirmation.
