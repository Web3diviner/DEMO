# Assumptions & Open Questions

`DEMO_PRD.md` v1.0 (17 Jun 2026) is now available and resolved the previously-blocking items. This
log records what's confirmed and what's still genuinely open (TBD in the PRD itself).

Legend: ✅ confirmed by PRD · 🟡 PRD says TBD / needs a value · 🔵 deferred (post-MVP).

## Resolved by the PRD

- ✅ **Backend = Go (decided)** (§10.1). The web client consumes a generated typed API client over
  the Go↔TS boundary — exactly the contract-first approach in `lib/api` + `contracts/openapi.yaml`.
- ✅ **Credits**: prepaid, closed-loop, **spend-only**, non-redeemable, non-transferable; bought with
  naira via Paystack; issued on idempotent webhook confirm into a double-entry ledger (§7.1).
  Matches `lib/money` (integer minor units) and the no-optimistic-credit top-up flow.
- ✅ **Creator earnings** = a naira revenue-share **payable** (not a wallet balance): cash out via
  Paystack Transfers (KYC + threshold) **or** convert to spend-Credits (§7.2). The wallet UI keeps
  Credits vs earnings distinct and offers withdraw/convert.
- ✅ **Platform fee** 10–25% per transaction type, atomic ledger entry (§7.3).
- ✅ **Battles** (§6.5): state machine Draft→Open→Voting→Settled→Archived; each vote is a Credit
  transaction (cost → escrow + platform fee); settlement distributes escrow; **verified-user vote
  weighting** (§8.4/8.5). Implemented in `/battles` + `/battles/[id]`.
- ✅ **Charts** (§6.4): campus/state/national/genre/**rising**; time-decay scoring; **Rising Stars
  ranks growth velocity, not totals**; verified weighting on official boards. Implemented in
  `/charts` (campus + rising for MVP).
- ✅ **Verification**: $1 creator registration (KYC'd, soulbound badge mint, gas-sponsored); access
  gates on the **off-chain entitlement, never an on-chain check** (§5.4, §8). Matches the
  verification onboarding + the "gate on backend entitlement" rule.
- ✅ **Feed**: two feeds — algorithmic **For You** and **Following/Support** (§6.1). (We currently
  ship FYP; the Following toggle is a small follow-up — see below.)
- ✅ **Talent Intelligence** (§6.9): explainable composites — Talent Growth, Virality, Fan Loyalty,
  Campus Influence, Label/Sponsor Readiness; transparent (not one opaque number); enterprise
  search/filter. Schema for the scout dashboard build.

## Still open (PRD marks TBD)

- 🟡 **Verified-fan fee** exact value ("< $1, TBD", §7.3/§13). Modeled as a server-quoted amount.
- 🟡 **Exact vote cost** and the **platform-fee split per transaction type** (PRD gives the 10–25%
  range). Vote cost is a contract field (`Battle.voteCost`), not hardcoded in the client.
- 🟡 **Verified-user vote weight** multiplier (PRD says verified carry "more weight", no number).
  Carried as `Battle.viewer.voteWeight` from the server (mock uses 3×).
- 🟡 **Embedded-wallet vendor** and **moderation/CSAM vendor** (§13). Isolated behind the server.
- 🟡 **KYC provider** for Tier 1–3 (§9.3).

## Deferred (post-MVP, per §11/§12)

- 🔵 Marketplace, Fan Clubs / premium subscriptions (ERC-5643), Events/NFT tickets, transferable
  asset NFTs, crypto on-ramp, multi-campus, advanced two-tower ML ranking, enterprise scouting
  dashboard (Phase 3). Route groups/stubs exist; full builds gated by phase + feature flags.

## Frontend follow-ups

- ✅ Following ↔ For You feed toggle (§6.1).
- ✅ One-tap support/tip in the feed rail (Credits spend → earnings split, §6.1/§7.2).
- ✅ Basic **DMs** (MVP scope, §11). Push notifications still pending.
- ✅ Moderation review queue (launch blocker, §10.3). Ledger + fraud dashboards still to attach.
- ✅ Hashtags/search (MVP scope, §6.1) + public `/u/[handle]` profiles.
- ☐ Ambassador onboarding (MVP scope, §6.10).
- ☐ Web push wiring (SW handler exists; needs subscription + backend).
