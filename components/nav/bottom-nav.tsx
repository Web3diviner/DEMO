"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Wallet, User, PlusSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/feed", label: "Feed", Icon: Home },
  { href: "/battles", label: "Battles", Icon: Swords },
  { href: "/upload", label: "Upload", Icon: PlusSquare },
  { href: "/credits", label: "Credits", Icon: Wallet },
  { href: "/profile", label: "Hub", Icon: User },
];

/**
 * Persistent bottom tab bar. Thumb-reachable (Fitts's Law), large targets, safe-area anchored.
 * The active tab is reflected both visually and via `aria-current="page"` so assistive tech and
 * sighted users get the same "you are here" signal.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-line bg-canvas/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-6xl items-center justify-around px-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 w-16 flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                  active ? "text-brand" : "text-muted hover:text-fg",
                )}
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span className="text-2xs font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
