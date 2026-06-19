import Link from "next/link";
import { Home, Swords, Wallet, User, PlusSquare } from "lucide-react";

/**
 * Consumer app shell. A persistent bottom tab bar — thumb-reachable (Fitts's Law), large targets,
 * and anchored to the safe area. The feed owns the full viewport; the bar floats above it.
 *
 * RBAC note: this group requires a consumer session; enforcement is server-side (middleware/route
 * handlers). The bar here is presentation only.
 */

const tabs = [
  { href: "/feed", label: "Feed", Icon: Home },
  { href: "/battles", label: "Battles", Icon: Swords },
  { href: "/upload", label: "Upload", Icon: PlusSquare },
  { href: "/credits", label: "Credits", Icon: Wallet },
  { href: "/profile", label: "Hub", Icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dscreen relative">
      <main id="main">{children}</main>
      <nav
        aria-label="Primary"
        className="border-line bg-canvas/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-md items-center justify-around px-2">
          {tabs.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-muted hover:text-fg flex h-16 w-16 flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span className="text-2xs font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
