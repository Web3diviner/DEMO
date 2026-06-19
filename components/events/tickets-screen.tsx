"use client";

import { useQuery } from "@tanstack/react-query";
import { Ticket as TicketIcon, CalendarDays, MapPin } from "lucide-react";
import { api } from "@/lib/api/client";
import { PseudoQR } from "./pseudo-qr";
import { cn } from "@/lib/utils/cn";

export function TicketsScreen() {
  const { data: tickets, status } = useQuery({
    queryKey: ["tickets"],
    queryFn: ({ signal }) => api.events.tickets(signal),
  });

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <TicketIcon className="text-brand h-6 w-6" aria-hidden /> My tickets
      </h1>
      <p className="text-muted mt-1 text-sm">Show the code at the door.</p>

      <div className="mt-5 space-y-4">
        {status === "pending" &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-surface h-44 animate-pulse rounded-xl" />
          ))}

        {status === "success" && tickets?.length === 0 && (
          <div className="text-subtle grid place-items-center gap-3 py-16 text-center text-sm">
            <TicketIcon className="h-8 w-8" aria-hidden />
            No tickets yet. Grab one from Events.
          </div>
        )}

        {tickets?.map((t) => (
          <div key={t.id} className="border-line bg-surface flex gap-4 rounded-xl border p-4">
            <div className="shrink-0 rounded-lg bg-white p-2">
              <PseudoQR code={t.code} size={96} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-pill text-2xs px-2 py-0.5 font-bold uppercase",
                    t.status === "valid" ? "bg-success/15 text-success" : "bg-elevated text-muted",
                  )}
                >
                  {t.status}
                </span>
              </div>
              <p className="mt-1.5 leading-snug font-semibold">{t.title}</p>
              <p className="text-subtle mt-1 flex items-center gap-1 text-xs">
                <CalendarDays className="h-3 w-3" aria-hidden />{" "}
                {new Date(t.startsAt).toLocaleDateString()}
              </p>
              <p className="text-subtle flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" aria-hidden /> {t.venue}
              </p>
              <p className="text-subtle text-2xs mt-1 font-mono">{t.code}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
