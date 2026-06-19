"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Users, Ticket as TicketIcon, Sparkles } from "lucide-react";
import { api } from "@/lib/api/client";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils/cn";
import type { EventType } from "@/lib/api/types";

const num = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

const TABS: { key: EventType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "show", label: "Shows" },
  { key: "concert", label: "Concerts" },
  { key: "competition", label: "Competitions" },
  { key: "awards", label: "Awards" },
  { key: "festival", label: "Festivals" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function EventsScreen() {
  const [type, setType] = React.useState<EventType | "all">("all");

  const { data: events, status } = useQuery({
    queryKey: ["events", type],
    queryFn: ({ signal }) => api.events.list(type, signal),
  });

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CalendarDays className="text-brand h-6 w-6" aria-hidden /> Events
        </h1>
        <Link
          href="/tickets"
          className="text-muted hover:text-fg flex items-center gap-1.5 text-sm font-medium"
        >
          <TicketIcon className="h-4 w-4" aria-hidden /> My tickets
        </Link>
      </div>
      <p className="text-muted mt-1 text-sm">Campus shows, concerts &amp; competitions near you.</p>

      <div
        role="tablist"
        aria-label="Event type"
        className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={type === t.key}
            onClick={() => setType(t.key)}
            className={cn(
              "rounded-pill shrink-0 px-3.5 py-1.5 text-sm font-medium transition-colors",
              type === t.key ? "bg-brand text-brand-fg" : "bg-surface text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {status === "pending" &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface h-40 animate-pulse rounded-lg" />
          ))}

        {events?.map((e) => (
          <Link
            key={e.id}
            href={`/events/${e.id}`}
            className="border-line bg-surface block overflow-hidden rounded-lg border active:scale-[0.99]"
          >
            <div className="relative aspect-[16/9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.coverUrl} alt="" className="h-full w-full object-cover" />
              <span className="bg-canvas/80 text-2xs rounded-pill absolute top-2 left-2 px-2 py-0.5 font-medium uppercase backdrop-blur">
                {e.type}
              </span>
              {e.viewer.hasTicket && (
                <span className="bg-success text-2xs rounded-pill absolute top-2 right-2 px-2 py-0.5 font-bold text-white">
                  Going
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="leading-snug font-semibold">{e.title}</p>
              <div className="text-subtle mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" aria-hidden /> {fmtDate(e.startsAt)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden /> {e.venue}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden /> {num.format(e.attendees)}
                </span>
              </div>
              <p className="text-brand mt-2 flex items-center gap-1 text-sm font-bold">
                {e.price.minor === 0 ? (
                  "Free"
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden /> {format(e.price)}
                  </>
                )}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
