# DEMO — Frontend Build Report

> A complete record of what was designed and built for the DEMO client.
> Audience: product, engineering (incl. the backend team taking this forward), and stakeholders.
> Companion docs: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) ·
> [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) · contract: [`../contracts/openapi.yaml`](../contracts/openapi.yaml).

---

## 1. Executive summary

DEMO is a mobile-web-first PWA talent network for Nigerian campuses (TikTok-style discovery feed +
creator economy + a thin, invisible on-chain ownership layer). This repository contains the **entire
frontend**, built **contract-first**: every screen runs end-to-end against an in-memory mock and a
single OpenAPI contract that the Go backend implements against. Flip one env var
(`NEXT_PUBLIC_USE_MOCK=false`) and the same UI talks to the real API.

**Status: the frontend product is feature-complete against the PRD** — the MVP (§11) plus the
Phase-2/3 surfaces (Marketplace, Fan Clubs/premium, Events, Talent Intelligence), behind feature
flags. What remains is backend/contracts/infra/ML (not frontend) and a short list of frontend
follow-ups (KYC flows, earnings withdrawal, seller listing creation, livestreams).

At a glance:

| | |
|---|---|
| Commits (feature branch) | 16 |
| App routes | ~27 |
| Unit/component tests | 18 (Vitest) |
| E2E specs | 13 (Playwright, Pixel-7 profile) |
| Stack | Next.js 16 · React 19 · TypeScript · Tailwind v4 |
| Quality gates | typecheck · lint · prettier · tests · production build — all green |

---

## 2. What was built — by surface

Every surface is mobile-web-first, accessible, token-themed, and wired to the typed contract.

### Consumer (the product)
- **Feed** (`/feed`) — vertical `scroll-snap` swipe feed; `hls.js` adaptive-bitrate player,
  lazy-initialized for the active + next clip only; `playsinline muted` autoplay; **For You ↔
  Following** toggle; data-saver discipline (≤480p cellular / ≤720p Wi-Fi, prefetch only on Wi-Fi,
  Save-Data aware, visible toggle); impression/dwell/completion instrumentation.
- **Engagement** — like (optimistic queue), **comment** sheet (optimistic), **share**, **one-tap
  tip/support** (Credit spend → creator-earnings split, server-truth).
- **Upload** (`/upload`) — resumable/chunked `tus` direct-to-storage via signed ticket; data-aware
  chunk sizing; pause/resume; resume-after-reload; Wi-Fi-only pre-compression hook.
- **Talent Hub** (`/profile`, `/u/[handle]`) — stats, verified badge, bio, clip grid; entry points
  to Fan Club, Marketplace, Ambassador, Messages, Settings.
- **Creator verification** (`/creator/register`) — $1 onboarding; badge after backend-confirmed mint;
  invisible wallet; gates on server entitlement.
- **Credits & wallet** (`/credits`) — fan Credits vs creator earnings kept distinct; **Paystack
  top-up** (pending → webhook-confirmed, never optimistic).
- **Battles** (`/battles`, `/battles/[id]`) — Draft→Open→Voting→Settled state machine; live
  countdown; **Credit-funded weighted votes** (server-truth spend); escrow prize pool; settled
  results; verified-vote weighting surfaced.
- **Charts** (`/charts`) — campus + **Rising Stars** (growth-velocity ranked), rank deltas, verified
  weighting.
- **Events** (`/events`, `/events/[id]`, `/tickets`) — browse by type; lineup; **Credit-funded
  ticketing** (free RSVP or priced); scannable QR pass wallet.
- **Marketplace** (`/market`, `/market/[id]`) — listings by category; **Credit checkout** (digital
  delivers on confirm, physical collects fulfilment); commission as a ledger entry.
- **Fan Clubs / premium** (`/fanclub/[handle]`, `/memberships`) — tiered recurring memberships
  (pending → active); **entitlement-gated members-only content**; expiring-badge model; manage/cancel.
- **DMs** (`/dms`, `/dms/[id]`) — conversation list + thread with optimistic send.
- **Search** (`/search`) — debounced, data-frugal; trending hashtags; creator/hashtag/clip results.
- **Ambassador** (`/ambassador`) — referral code/share, verified-activity reward framing, tier
  progress, campus leaderboard.
- **Settings** (`/settings`) — Web-Push subscription (VAPID) + data-saver toggles; account rows;
  memberships link.

### Staff & enterprise (same app, RBAC route groups)
- **Moderation console** (`/moderation`, staff) — review queue from AI flags + user reports;
  severity triage; content/user actions (approve/remove/ban/escalate); optimistic resolve.
- **Talent Intelligence / scout** (`/scout`, enterprise) — search + filters; **explainable composite
  scores** (Talent Growth, Virality, Fan Loyalty, Campus Influence, Label/Sponsor Readiness — never
  one opaque number); per-talent breakdown + trend sparkline; **CSV export**.

### Cross-cutting
- **PWA** — installable manifest + hand-rolled service worker (offline shell, engagement Background
  Sync, web-push handler); **media never cached** (data discipline).
- **Feature flags** — `FlagsProvider` + type-safe `useFlag`; marketplace/premium gated.
- **Analytics** — typed event contract (impressions, completion, dwell, engagement) behind a consent
  gate, feeding the recommendation feature store.

---

## 3. Architecture & key decisions

- **Contract-first, backend-agnostic.** The client is built against `contracts/openapi.yaml`. Types
  in `lib/api/types.ts` mirror it 1:1 and double as **Zod validators** at the network boundary (trust
  nothing on the wire). An in-memory mock (`lib/api/mock.ts`) implements the whole contract so the app
  runs with no backend. **Decision validated by the PRD** (§10.1): backend is Go, web consumes a
  generated typed client over the Go↔TS boundary.
- **Rendering.** Next.js App Router; static/RSC for marketing and read-heavy pages; client islands
  for the feed and money flows; the feed (and `hls.js`) is dynamically imported so it never enters the
  initial bundle.
- **Data layer.** TanStack Query owns server state (cache, dedupe, retry/backoff tuned for flaky
  mobile networks). Mutations that touch money are **server-truth** — the UI updates only on confirmed
  responses.
- **Never block the UI on the network.** Engagement (likes/follows/comments) uses an **optimistic
  queue** (`lib/queue`) persisted to storage and drained via Background Sync; a single shared queue
  singleton avoids double-sends.
- **Money is never optimistic.** Top-ups, votes, tips, purchases, subscriptions, tickets all spend
  server-side and return the confirmed wallet; the client shows honest *pending* states.

## 4. Money model

All amounts are **integer minor units** with an explicit currency — never floats (`lib/money.ts`,
arithmetic refuses cross-currency mixing). Matches PRD §7:
- **Credits** — fan, prepaid, closed-loop, **spend-only**, non-cashable.
- **NGN** (kobo) — Paystack settlement; **creator earnings** are a revenue-share payable (cash out
  via Transfers *or* convert to Credits), shown distinctly from Credits.
- **USD** (cents) — the $1 verification price point.
- Platform fee (10–25% per type) and the fee/earnings split happen server-side in the double-entry
  ledger; the client only ever displays server-returned balances.

## 5. Design system & brand

Token-driven (`app/globals.css`), authored in **OKLCH**; mapped into Tailwind v4 via `@theme inline`
so every utility resolves to a live CSS variable (runtime theming, one source of truth).
- **Brand: green (primary) + orange (accent)**, with gold for verified/earnings; refined,
  professional tones (not neon). Because everything is token-driven, the rebrand was a single change
  at the source that cascaded to all screens.
- Dark-first (the product is a full-bleed feed); opt-in light theme for admin/enterprise dashboards.
- **Accessibility baked into the base layer:** visible `:focus-visible`, `prefers-reduced-motion`
  override, safe-area insets, skip link, ≥44px targets, accessible sheets (focus trap + restore,
  Escape/backdrop close), semantic roles. Targets WCAG 2.2 AA.

## 6. Security & data discipline

- No secrets client-side (only publishable Paystack key, VAPID public key). Signing is server-side.
- **Default-deny CSP** + HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `X-Frame-Options`, COOP (`next.config.ts`); media/upload/API origins allow-listed via env.
- Signed, expiring URLs for upload (tus ticket) and playback (HLS); **video never transits the API**.
- Separate identity realms (consumer / staff SSO / enterprise) via route groups + an RBAC mirror
  (`lib/auth/rbac.ts`) — presentation only; the server is the security boundary.
- Idempotency keys on money-sensitive POSTs; client-side rate-limit/dedupe as courtesy.

## 7. Performance & PWA

- Aggressive code-splitting; lazy player + heavy routes; small initial JS for mid-range phones.
- Data-saver is a pillar, not a setting (caps, Wi-Fi-only prefetch, Save-Data).
- PWA: installable, offline shell, Background-Sync engagement queue, web push; **media never cached**.

## 8. Testing & CI

- **Unit/component (Vitest):** money math (currency safety, formatting), engagement bar (a11y,
  optimistic intent), upload chunk-sizing + pre-compression policy — **18 tests**.
- **E2E (Playwright, Pixel-7):** 13 specs covering the money-critical path (top-up → spend → battle
  vote), tipping, comments, DMs, search, battles/charts, marketplace, premium subscribe→unlock,
  events ticketing, moderation, ambassador, settings.
- **CI** (`.github/workflows/ci.yml`): typecheck · lint · format · unit/component · production build,
  then a separate Playwright job. Branch protection-ready.

## 9. Repository map

```
app/
  (marketing)/    landing
  (app)/          feed, credits, battles[/id], charts, profile, u/[handle], upload,
                  creator/register, search, dms[/id], ambassador, settings, market[/id],
                  fanclub/[handle], memberships, events[/id], tickets
  (admin)/        moderation              (staff SSO + RBAC, light theme)
  (enterprise)/   scout                   (enterprise auth, light theme)
  offline/        offline shell
components/        ui/ (design system) · feed · battles · charts · events · market · premium ·
                  dms · search · scout · moderation · ambassador · settings · profile
lib/              api/ (client + types + mock) · money · connection · queue · analytics ·
                  flags(+provider) · auth/rbac · payments/paystack · push/web-push · uploads · hooks
contracts/        openapi.yaml            (single source of truth)
docs/             ARCHITECTURE · DESIGN_SYSTEM · ASSUMPTIONS · BUILD_REPORT
public/           manifest.webmanifest · sw.js · icons
```

## 10. Commit history (feature branch `claude/new-session-i4vtfy`)

1. Foundation, design system, HLS feed slice
2. Resumable upload, Talent Hub, creator verification
3. Credit top-up, comments, accessible bottom sheet
4. Battles + Charts (resolves blocked domain items after the PRD arrived)
5. One-tap tipping + For You/Following feed switch
6. Basic direct messages
7. Moderation review console
8. Search, hashtags, public profiles
9. Campus ambassador dashboard
10. Web-push subscription flow + Settings
11. Talent Intelligence / scout dashboard
12. Marketplace (flag-gated) + feature-flag plumbing
13. Rebrand to green + orange
14. Fan Clubs / premium subscriptions (flag-gated)
15. Events + ticketing
16. This build report

## 11. Done vs. not done

**Done — all PRD frontend surfaces** (§6, §11 MVP, and the frontend parts of §12), the design system
+ rebrand, the contract, tests, and CI.

**Not done (mostly not frontend):**
- Backend (Go modular monolith, Postgres + double-entry ledger, Redis, Kafka→ClickHouse), smart
  contracts on Base (SBT badges, ERC-5643, NFT tickets), real integrations (live Paystack,
  embedded-wallet SDK, Cloudflare Stream transcoding, web-push delivery, moderation/CSAM vendor),
  recommendation ML (heuristic → two-tower).
- **Frontend follow-ups:** KYC tier flows (§9.3), creator earnings **withdrawal** flow, seller-side
  **listing creation**, **livestreams**, NFT-specific UIs (deferred per §12).

See [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) for the confirmed-vs-TBD log (e.g. exact verified-fan fee,
vote cost, vote-weight multiplier).

## 12. Running & deploying

```bash
pnpm install
cp .env.example .env.local
pnpm dev            # http://localhost:3000  (mock backend on by default)
# real video locally (CSP allows only the configured origin):
NEXT_PUBLIC_MEDIA_ORIGIN=https://test-streams.mux.dev pnpm dev
```

Scripts: `pnpm build|start|typecheck|lint|format|test|e2e`.

**Go-live checklist (backend/devops):**
1. Implement the Go API against `contracts/openapi.yaml`.
2. Set `NEXT_PUBLIC_USE_MOCK=false` and `NEXT_PUBLIC_API_ORIGIN`.
3. Configure `NEXT_PUBLIC_MEDIA_ORIGIN` (CDN), `NEXT_PUBLIC_UPLOAD_ORIGIN` (tus),
   `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
4. Deploy to an edge platform (Vercel or equivalent) with Africa/Lagos edge presence; PR previews +
   the CI gate.

## 13. Handoff notes for the backend team

- The contract is the source of truth; the mock (`lib/api/mock.ts`) is a precise, behaviour-level
  reference implementation (latency, pending→confirmed money flows, idempotency, entitlement gating).
- Honor the **money rules**: integer minor units; balances move only on webhook-confirmed events;
  platform fee + earnings split in the ledger; idempotency keys are sent on sensitive POSTs.
- Honor the **entitlement rule**: gate features on the off-chain entitlement, never an on-chain read;
  the on-chain badge is a synced mirror.
- Feature flags drive staged rollout; `marketplace`/`premium` are enabled in this build for review and
  should be backend-controlled in production.
