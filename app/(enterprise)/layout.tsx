/**
 * Enterprise / scout route group — ENTERPRISE realm (separate from consumer auth).
 *
 * Talent Intelligence: search, filter, export. Light theme, gated server-side by enterprise auth.
 * Searchable fields and the privacy boundary come from the PRD (docs/ASSUMPTIONS.md, 🟡).
 */
export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="min-h-dscreen bg-canvas text-fg">
      <header className="border-line border-b px-5 py-3">
        <span className="text-sm font-semibold">DEMO · Talent Intelligence</span>
      </header>
      <main id="main" className="p-5">
        {children}
      </main>
    </div>
  );
}
