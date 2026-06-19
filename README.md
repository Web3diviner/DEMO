# DEMO

> Where campus talent gets discovered — a mobile-web-first PWA for Nigerian students.

A vertical talent-video feed with fan **Credits**, creator **earnings**, **battles**, and an
enterprise **Talent Intelligence** surface. Built phone-first and data-frugal: the audience is on
mid-range Android over expensive, intermittent mobile data, and every decision respects that.

## Status

This repo is the **frontend foundation** (contract-first; no backend required to run). Built to
`DEMO_PRD.md` v1.0 — backend is **Go (decided)**; this client consumes a typed API contract.

- ✅ Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
- ✅ Design system (tokens, primitives, a11y/motion baked in) — see [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- ✅ PWA shell: manifest + hand-rolled service worker (offline shell, engagement sync, push)
- ✅ Money model in integer minor units (Credits / NGN / USD) — never floats, never client balances
- ✅ Vertical **HLS feed** slice, end-to-end against a mock: adaptive bitrate, lazy players,
  data-saver discipline, optimistic engagement queue
- ✅ **Resumable upload** (tus): direct-to-storage signed ticket, data-aware chunking, pause/resume,
  resume-after-reload, Wi-Fi-only pre-compression hook
- ✅ **Talent Hub** profile (stats + clip grid) and **creator verification** onboarding ($1)
- ✅ **Top-up flow** (Paystack Inline): server-quoted packs, pending→webhook-confirmed, no
  optimistic credit; live wallet with Credits/earnings kept distinct
- ✅ **Comments** sheet (accessible bottom-sheet primitive) with optimistic posting via the queue
- ✅ **Battles** (PRD §6.5): state machine, live countdown, Credit-funded **weighted votes**
  (server-truth spend), escrow prize pool, settled results — `/battles` + `/battles/[id]`
- ✅ **Charts** (PRD §6.4): campus + **Rising Stars** (growth-velocity ranked), rank deltas,
  verified weighting
- ✅ **One-tap tipping/support** (§6.1/§7.2): Credit spend → creator-earnings split, server-truth
  balance; **For You ↔ Following** feed switch
- ✅ **Direct messages** (§11): conversation list + thread view with optimistic send
- ✅ **Moderation console** (§10.3, launch blocker): staff review queue — AI flags + reports,
  severity triage, content/user actions (approve/remove/ban/escalate), optimistic resolve
- ✅ **Search & hashtags** (§6.1): debounced, data-frugal; trending tags, creator/hashtag/clip
  results; public `/u/[handle]` Talent Hub
- ✅ **Ambassador** (§6.10): referral code/share, verified-activity reward framing, tier progress,
  campus leaderboard
- ✅ **Web push + Settings**: permission/subscription flow (VAPID), Settings screen with
  push + data-saver toggles (SW already handles `push`/`notificationclick`)
- ✅ Route groups + RBAC mirror for `(marketing) (app) (admin) (enterprise)`
- ✅ Security headers / CSP, typed+validated API client, analytics event contract, feature flags
- ✅ Tests (Vitest unit + component, Playwright e2e) and CI

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture and
[`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) for open questions pending `DEMO_PRD.md`.

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev          # http://localhost:3000  (mock backend on by default)
```

To see **real video playback** locally (CSP allows only the configured media origin):

```bash
NEXT_PUBLIC_MEDIA_ORIGIN=https://test-streams.mux.dev pnpm dev
```

## Scripts

| Command                     | Does                                                |
| --------------------------- | --------------------------------------------------- |
| `pnpm dev`                  | Dev server                                          |
| `pnpm build` / `pnpm start` | Production build / serve                            |
| `pnpm typecheck`            | `tsc --noEmit`                                      |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                   |
| `pnpm test`                 | Vitest (unit + component)                           |
| `pnpm e2e`                  | Playwright (builds, then runs on a Pixel 7 profile) |

## Layout

```
app/            route groups: (marketing) (app) (admin) (enterprise) + offline shell
components/      ui/ (design system) · feed/ (the HLS feed slice)
lib/             api/ (typed client + contract types + mock) · money · connection ·
                 queue (optimistic engagement) · analytics · flags · auth/rbac · hooks
contracts/       openapi.yaml — single source of truth for the API
docs/            ARCHITECTURE · DESIGN_SYSTEM · ASSUMPTIONS
public/          manifest.webmanifest · sw.js
```

## Non-negotiables (enforced in code)

- **Data is the user's money.** ≤480p on cellular, ≤720p on Wi-Fi; prefetch only on Wi-Fi; honor
  `Save-Data`; visible data-saver toggle.
- **Never block the UI on the network.** Engagement is optimistic and queued; money never is.
- **Backend is the source of truth for money and entitlements.** No optimistic credit, no on-chain
  reads for gating.
