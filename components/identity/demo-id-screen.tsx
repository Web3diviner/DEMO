"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ago } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import type { OwnedItem } from "@/lib/api/types";

const KIND_META: Record<
  OwnedItem["kind"],
  { Icon: React.ComponentType<{ className?: string }>; tint: string; label: string }
> = {
  credential: { Icon: ShieldCheck, tint: "bg-gold/15 text-gold", label: "Credential" },
  collectible: { Icon: Sparkles, tint: "bg-brand/15 text-brand", label: "Collectible" },
  pass: { Icon: Ticket, tint: "bg-live/15 text-live", label: "Pass" },
};

function OwnedRow({ item, showTech }: { item: OwnedItem; showTech: boolean }) {
  const { Icon, tint, label } = KIND_META[item.kind];
  return (
    <div className="border-line bg-surface flex items-center gap-3 rounded-lg border p-3">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", tint)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          {item.title}
          {item.soulbound && (
            <span
              className="text-subtle bg-elevated rounded-pill text-2xs px-1.5 py-0.5 font-medium"
              title="Soulbound — can't be sold or transferred"
            >
              Soulbound
            </span>
          )}
        </p>
        <p className="text-subtle truncate text-xs">{item.subtitle}</p>
        {showTech ? (
          <p className="text-subtle text-2xs mt-0.5 font-mono">{item.tokenRef}</p>
        ) : (
          <p className="text-subtle text-2xs">Owned · {ago(item.issuedAt)}</p>
        )}
      </div>
      <span className="text-subtle text-2xs shrink-0 font-medium">{label}</span>
    </div>
  );
}

export function DemoIdScreen() {
  const [showTech, setShowTech] = React.useState(false);
  const { data, status } = useQuery({
    queryKey: ["ownership"],
    queryFn: ({ signal }) => api.me.ownership(signal),
  });

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Back to profile" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">DEMO ID</h1>
      </div>

      {status === "pending" && (
        <div className="mt-6 space-y-3">
          <div className="bg-surface h-40 animate-pulse rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface h-16 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="text-muted py-16 text-center text-sm">
          Couldn&apos;t load your DEMO ID. Pull to retry.
        </p>
      )}

      {status === "success" && data && (
        <>
          {/* Identity card — the anchor. Deliberately calm about the chain underneath. */}
          <section className="border-brand/30 from-brand/15 to-gold/10 relative mt-5 overflow-hidden rounded-xl border bg-gradient-to-br p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                <Fingerprint className="h-4 w-4" aria-hidden /> Campus identity
              </span>
              <BadgeCheck className="text-gold h-5 w-5" aria-label="Verified" />
            </div>
            <p className="mt-3 font-mono text-lg font-semibold break-all">{data.did}</p>
            <p className="text-subtle mt-1 text-xs">@{data.handle}</p>
            <div className="border-line/60 mt-4 flex items-center gap-2 border-t pt-3">
              <KeyRound className="text-brand h-4 w-4 shrink-0" aria-hidden />
              <p className="text-subtle text-xs">
                Invisible wallet — no seed phrase, no gas. We keep the keys safe so you don&apos;t
                have to.
              </p>
            </div>
          </section>

          <div className="mt-3 flex items-center justify-between px-1">
            <h2 className="text-subtle text-xs font-medium tracking-wide uppercase">
              You own {data.items.length}
            </h2>
            <button
              type="button"
              onClick={() => setShowTech((v) => !v)}
              aria-pressed={showTech}
              className="text-brand text-xs font-medium"
            >
              {showTech ? "Hide technical details" : "Show technical details"}
            </button>
          </div>

          <ul className="mt-2 space-y-2">
            {data.items.map((item) => (
              <li key={item.id}>
                <OwnedRow item={item} showTech={showTech} />
              </li>
            ))}
          </ul>

          {/* Technical footer, revealed alongside per-item refs. */}
          {showTech && (
            <dl className="border-line bg-surface mt-3 space-y-2 rounded-lg border p-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Address</dt>
                <dd className="font-mono">{data.address}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Network</dt>
                <dd>{data.network}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-subtle">Custody</dt>
                <dd>{data.custodial ? "Platform-managed" : "Self-custody"}</dd>
              </div>
            </dl>
          )}

          {/* Earn-more nudge: ownership grows as you participate. */}
          <Link
            href="/creator/register"
            className="border-gold/30 bg-surface mt-4 flex items-center gap-3 rounded-lg border p-3 active:scale-[0.99]"
          >
            <span className="bg-gold/15 text-gold grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Add the Verified Creator badge</span>
              <span className="text-subtle block text-xs">
                A soulbound proof minted to your DEMO ID.
              </span>
            </span>
            <ChevronRight className="text-subtle h-4 w-4 shrink-0" aria-hidden />
          </Link>

          <p className="text-subtle text-2xs mt-4 px-1 text-center">
            Your items are recorded on {data.network}. You can take them with you — ownership stays
            yours even if you leave.
          </p>
        </>
      )}
    </main>
  );
}
