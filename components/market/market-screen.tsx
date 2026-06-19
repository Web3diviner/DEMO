"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Store, BadgeCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api/client";
import { format } from "@/lib/money";
import { useFlag } from "@/lib/flags-provider";
import { cn } from "@/lib/utils/cn";
import type { MarketCategory } from "@/lib/api/types";

const num = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

const TABS: { key: MarketCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "beat", label: "Beats" },
  { key: "song", label: "Songs" },
  { key: "ticket", label: "Tickets" },
  { key: "merch", label: "Merch" },
  { key: "service", label: "Services" },
];

export function MarketScreen() {
  const enabled = useFlag("marketplace");
  const [cat, setCat] = React.useState<MarketCategory | "all">("all");

  const { data: listings, status } = useQuery({
    queryKey: ["market", cat],
    queryFn: ({ signal }) => api.market.listings(cat, signal),
    enabled,
  });

  if (!enabled) {
    return (
      <main id="main" className="min-h-dscreen grid place-items-center px-8 text-center">
        <div>
          <Store className="text-muted mx-auto h-10 w-10" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">Marketplace is coming soon</h1>
          <p className="text-muted mt-2 text-sm">
            Beats, tickets, merch and more — launching shortly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Store className="text-brand h-6 w-6" aria-hidden /> Marketplace
      </h1>
      <p className="text-muted mt-1 text-sm">Buy direct from creators. Paid in Credits.</p>

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Category"
        className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={cat === t.key}
            onClick={() => setCat(t.key)}
            className={cn(
              "rounded-pill shrink-0 px-3.5 py-1.5 text-sm font-medium transition-colors",
              cat === t.key ? "bg-brand text-brand-fg" : "bg-surface text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {status === "pending" &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface aspect-[3/4] animate-pulse rounded-lg" />
          ))}

        {listings?.map((l) => (
          <Link
            key={l.id}
            href={`/market/${l.id}`}
            className="border-line bg-surface overflow-hidden rounded-lg border active:scale-[0.99]"
          >
            <div className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.coverUrl} alt="" className="h-full w-full object-cover" />
              <span className="bg-canvas/80 text-2xs rounded-pill absolute top-1.5 left-1.5 px-2 py-0.5 font-medium uppercase backdrop-blur">
                {l.category}
              </span>
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 text-sm leading-snug font-semibold">{l.title}</p>
              <p className="text-subtle mt-1 flex items-center gap-1 text-xs">
                @{l.creator.handle}
                {l.creator.verified && (
                  <BadgeCheck className="text-gold h-3 w-3" aria-label="Verified" />
                )}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-brand flex items-center gap-1 text-sm font-bold">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> {format(l.price)}
                </span>
                <span className="text-subtle text-2xs">{num.format(l.soldCount)} sold</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
