# Assumptions & Open Questions

The domain doc (`DEMO_PRD.md`) was not available when this foundation was built — only the
Frontend Build Instructions. The **foundation, design system, and feed slice do not depend** on the
items below, but the following surfaces will. Each is isolated behind a type/contract so correcting
it later is a localized change, not a rewrite.

Legend: 🟢 safe default · 🟡 needs confirmation · 🔴 blocking before that feature ships.

## Money & Credits

- 🟡 **Credit ↔ NGN top-up rate** and pack sizes. Modeled as opaque integer Credits; rate lives
  server-side. Client only displays server-returned prices. → `lib/money.ts`, `contracts`.
- 🟡 **What 1 Credit buys** (battle vote cost, gift tiers). Vote cost is a contract field, not hardcoded.
- 🟡 **Creator earnings → cash conversion** (rate, minimum withdrawal, KYC). UI keeps earnings and
  Credits visually distinct already; conversion flow is stubbed.
- 🟢 Currencies: Credits (internal), NGN (kobo), USD (cents). All integer minor units.

## Verification

- 🟡 **Exact price points**: "$1 creator / <$1 fan" — is fan price fixed (e.g. $0.50) or variable?
  Modeled as a server-quoted amount.
- 🟡 **What the badge gates** (upload? battles? DMs? withdrawal?). Gating reads a backend
  `entitlements` object; the specific keys are placeholders pending the PRD.
- 🟢 Wallet is invisible; provisioned server-side post-verification; surfaced only as a badge.

## Battles

- 🔴 **Format & scoring**: 1v1? bracket? duration? tie-break? vote weighting? Needed before the
  battles surface is built. Feed slice is independent of this.
- 🟡 **Vote → Credit consumption** mechanics and refunds.

## Charts

- 🔴 **Ranking math**: what is ranked (creators? clips? campuses?), window, and the formula
  (engagement-weighted? Credit-weighted? velocity?). Needed before charts surface.

## Talent Intelligence (enterprise / scout)

- 🟡 **Searchable fields, filters, export format/limits**, and the privacy boundary (what scouts may
  see vs. consumer privacy). Stubbed behind enterprise RBAC.

## Recommendation / analytics

- 🟢 Instrument impressions, completion, dwell, and all engagement from day one (per instructions).
  Event schema in `lib/analytics.ts` is a starting contract; align with the feature-store schema.
- 🟡 Privacy/consent model for Nigerian users (NDPR). Analytics layer has a consent gate hook.

## Identity & auth

- 🟡 **Auth provider** for the three separate realms (consumer / staff SSO / enterprise). Client
  models them as distinct sessions; provider TBD.

## Infra

- 🟡 **CDN/edge provider** and **object store** (R2 vs S3). Architecture is provider-agnostic; tus +
  signed-URL pattern holds either way.
- 🟡 **Embedded-wallet SDK** vendor. Isolated behind a thin server boundary; no client SDK assumed.

---

When `DEMO_PRD.md` arrives, resolve the 🔴 items first (battles, charts), then the 🟡 money/verification
specifics. None should require changing the foundation or design system.
