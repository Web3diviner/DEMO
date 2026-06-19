/**
 * Admin / moderation route group — STAFF realm.
 *
 * Forced light theme (dense dashboards read better light). Access is gated server-side by staff SSO
 * + role (moderator/admin); this layout is presentation only. Heavy tables live behind here and are
 * never shipped in the consumer bundle.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="min-h-dscreen bg-canvas text-fg">
      <header className="border-line border-b px-5 py-3">
        <span className="text-sm font-semibold">DEMO · Moderation</span>
      </header>
      <main id="main" className="p-5">
        {children}
      </main>
    </div>
  );
}
