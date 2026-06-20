import { BadgeCheck, ShieldCheck, Wallet, Sparkles } from "lucide-react";

/**
 * Creator verification ($1). Models the build-instruction rules (§2.4):
 *   - pay via Paystack Inline,
 *   - the badge appears only AFTER the backend reports the gas-sponsored mint succeeded,
 *   - the wallet is invisible (no seed phrase, no gas) — surfaced only as a badge,
 *   - features gate on the backend entitlement, never an on-chain read.
 *
 * The Paystack popup + backend polling wire into the CTA; this is the onboarding surface.
 */
export const metadata = { title: "Get verified" };

const perks = [
  { Icon: BadgeCheck, title: "Verified badge", body: "A gold check that proves it's really you." },
  {
    Icon: Sparkles,
    title: "Unlock creator tools",
    body: "Battles, earnings, and your Talent Hub.",
  },
  {
    Icon: Wallet,
    title: "Invisible wallet",
    body: "Set up for you automatically — no seed phrase, no gas.",
  },
];

export default function CreatorRegisterPage() {
  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-8 pb-28">
      <div className="bg-brand/15 text-gold grid h-14 w-14 place-items-center rounded-2xl">
        <ShieldCheck className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Become a verified creator</h1>
      <p className="text-muted mt-2 text-sm">
        A one-time <span className="text-fg font-semibold">$1</span> verification keeps Skylora real
        and unlocks everything you need to get discovered.
      </p>

      <ul className="mt-6 space-y-3">
        {perks.map(({ Icon, title, body }) => (
          <li key={title} className="border-line bg-surface flex gap-3 rounded-lg border p-4">
            <Icon className="text-gold mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-muted text-sm">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="rounded-pill bg-brand text-brand-fg mt-6 flex h-12 w-full items-center justify-center font-medium active:scale-[0.98]"
      >
        Verify for $1
      </button>
      <p className="text-subtle mt-3 text-center text-xs">
        Your badge appears once payment is confirmed. Secured by Paystack.
      </p>
    </main>
  );
}
