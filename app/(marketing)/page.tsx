import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";

/**
 * Landing — static, RSC, near-zero client JS. First impression on a cold cellular connection must
 * be instant, so this renders as static HTML with one CTA into the app.
 */
export const metadata = { title: "Where campus talent gets discovered" };

export default function Landing() {
  return (
    <main
      id="main"
      className="min-h-dscreen relative flex flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      {/* Ambient brand glow — pure CSS, no JS, respects reduced-motion via tokens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
      />
      <Wordmark markSize={40} className="mb-6 text-2xl" />
      <span className="rounded-pill border-line text-muted mb-4 border px-3 py-1 text-xs font-medium">
        Naija campus talent · live now
      </span>
      <h1 className="sm:text-display max-w-xl text-3xl leading-tight font-semibold tracking-tight text-balance">
        Where campus talent gets discovered.
      </h1>
      <p className="text-muted mt-4 max-w-md text-base text-balance">
        Watch, back, and battle the next generation of Nigerian talent. Built for your phone, light
        on your data.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/feed"
          className="rounded-pill bg-brand text-brand-fg shadow-1 flex h-13 w-full items-center justify-center px-7 text-lg font-medium transition-transform duration-[var(--dur-1)] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.97]"
        >
          Enter the feed
        </Link>
        <Link href="/creator/register" className="text-muted hover:text-fg text-sm font-medium">
          Are you a creator? Get verified →
        </Link>
      </div>
    </main>
  );
}
