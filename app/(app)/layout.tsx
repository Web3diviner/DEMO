import { BottomNav } from "@/components/nav/bottom-nav";

/**
 * Consumer app shell. A persistent bottom tab bar — thumb-reachable (Fitts's Law), large targets,
 * and anchored to the safe area. The feed owns the full viewport; the bar floats above it.
 *
 * RBAC note: this group requires a consumer session; enforcement is server-side (middleware/route
 * handlers). The bar here is presentation only.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dscreen relative">
      <main id="main">{children}</main>
      <BottomNav />
    </div>
  );
}
