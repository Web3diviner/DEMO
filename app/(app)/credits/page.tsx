import { Sparkles, ArrowDownToLine, Info } from "lucide-react";
import { fromMinor, format } from "@/lib/money";

/**
 * Credits & Earnings.
 *
 * Hard product rule (build instructions §2.4): fan Credits (spendable, NON-cashable) and creator
 * earnings (withdrawable) are shown DISTINCTLY and never implied to be interchangeable. Balances are
 * server-truth; top-ups are webhook-confirmed (no optimistic credit). Demo values stand in for the
 * `/v1/wallet` response until the backend exists.
 */
export const metadata = { title: "Credits" };

// Placeholder balances (server-provided in production).
const creditsBalance = fromMinor(1240, "CREDITS");
const earningsBalance = fromMinor(875000, "NGN"); // ₦8,750.00

export default function CreditsPage() {
  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>

      {/* Fan Credits — spendable, not cashable. */}
      <section className="border-line bg-surface mt-5 rounded-lg border p-5">
        <div className="text-muted flex items-center gap-2">
          <Sparkles className="text-brand h-4 w-4" aria-hidden />
          <span className="text-sm font-medium">Fan Credits</span>
        </div>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{format(creditsBalance)}</p>
        <p className="text-subtle mt-1 flex items-center gap-1 text-xs">
          <Info className="h-3 w-3" aria-hidden /> Spend on battles, gifts &amp; boosts. Credits
          don&apos;t cash out.
        </p>
        <button
          type="button"
          className="rounded-pill bg-brand text-brand-fg mt-4 flex h-11 w-full items-center justify-center font-medium active:scale-[0.98]"
        >
          Top up Credits
        </button>
      </section>

      {/* Creator earnings — withdrawable, clearly separate. */}
      <section className="border-gold/30 bg-surface mt-4 rounded-lg border p-5">
        <div className="text-muted flex items-center gap-2">
          <ArrowDownToLine className="text-gold h-4 w-4" aria-hidden />
          <span className="text-sm font-medium">Creator earnings</span>
        </div>
        <p className="text-gold mt-2 text-3xl font-semibold tabular-nums">
          {format(earningsBalance)}
        </p>
        <p className="text-subtle mt-1 text-xs">
          Withdraw to your bank or convert. Separate from Credits.
        </p>
        <button
          type="button"
          className="rounded-pill border-gold/40 text-gold mt-4 flex h-11 w-full items-center justify-center border font-medium active:scale-[0.98]"
        >
          Withdraw
        </button>
      </section>
    </main>
  );
}
