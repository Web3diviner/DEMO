import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";

/**
 * Admin / staff route group — STAFF realm.
 *
 * Forced light theme (dense dashboards read better light). Access is gated server-side by staff SSO
 * + role (moderator/admin); this layout is presentation only. Heavy tables live behind here and are
 * never shipped in the consumer bundle.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="min-h-dscreen bg-canvas text-fg">
      <header className="border-line flex items-center gap-3 border-b px-5 py-3">
        <Wordmark markSize={22} className="text-sm" />
        <nav className="text-muted flex items-center gap-3 text-sm">
          <Link href="/moderation" className="hover:text-fg">
            Moderation
          </Link>
          <Link href="/treasury" className="hover:text-fg">
            Treasury &amp; Risk
          </Link>
        </nav>
      </header>
      <main id="main" className="p-5">
        {children}
      </main>
    </div>
  );
}
