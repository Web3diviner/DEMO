"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, MapPin, Users, BadgeCheck, Check, Sparkles } from "lucide-react";
import { api } from "@/lib/api/client";
import { format, gte } from "@/lib/money";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PseudoQR } from "./pseudo-qr";
import type { Ticket, Wallet } from "@/lib/api/types";

const num = new Intl.NumberFormat("en-NG");

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EventDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const { data: ev, status } = useQuery({
    queryKey: ["event", id],
    queryFn: ({ signal }) => api.events.get(id, signal),
  });

  if (status === "pending") {
    return <div className="h-dscreen text-muted grid place-items-center">Loading…</div>;
  }
  if (status === "error" || !ev) {
    return <div className="h-dscreen text-muted grid place-items-center">Event unavailable.</div>;
  }

  const free = ev.price.minor === 0;

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/events" aria-label="Back to events" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-lg font-semibold">Event</h1>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ev.coverUrl} alt="" className="aspect-[16/9] w-full object-cover" />
      </div>

      <span className="text-subtle text-2xs mt-3 block font-medium uppercase">{ev.type}</span>
      <h2 className="text-2xl leading-tight font-semibold">{ev.title}</h2>

      <div className="text-muted mt-3 space-y-1.5 text-sm">
        <p className="flex items-center gap-2">
          <CalendarDays className="text-brand h-4 w-4" aria-hidden /> {fmtDateTime(ev.startsAt)}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="text-brand h-4 w-4" aria-hidden /> {ev.venue} · {ev.campus}
        </p>
        <p className="flex items-center gap-2">
          <Users className="text-brand h-4 w-4" aria-hidden /> {num.format(ev.attendees)} going
        </p>
      </div>

      <p className="mt-4 text-sm leading-relaxed">{ev.description}</p>

      <h3 className="text-muted mt-5 mb-2 text-sm font-medium">Lineup</h3>
      <div className="flex flex-wrap gap-2">
        {ev.lineup.map((c) => (
          <Link
            key={c.handle}
            href={`/u/${c.handle}`}
            className="border-line bg-surface rounded-pill flex items-center gap-1.5 border px-3 py-1.5 text-sm"
          >
            @{c.handle}
            {c.verified && <BadgeCheck className="text-gold h-3.5 w-3.5" aria-label="Verified" />}
          </Link>
        ))}
      </div>

      {/* Sticky-ish CTA */}
      <div className="mt-6">
        {ev.viewer.hasTicket ? (
          <Link
            href="/tickets"
            className="rounded-pill border-success/40 text-success flex h-12 items-center justify-center gap-2 border font-medium"
          >
            <Check className="h-4 w-4" /> You&apos;re going · view ticket
          </Link>
        ) : (
          <Button block size="lg" onClick={() => setOpen(true)}>
            {free ? "RSVP — Free" : `Get ticket · ${format(ev.price)}`}
          </Button>
        )}
      </div>

      <TicketSheet
        open={open}
        onClose={() => setOpen(false)}
        event={{ id: ev.id, title: ev.title, price: ev.price, free }}
        onConfirmed={(w) => {
          qc.setQueryData<Wallet>(["wallet"], w);
          qc.invalidateQueries({ queryKey: ["event", id] });
          qc.invalidateQueries({ queryKey: ["tickets"] });
        }}
      />
    </main>
  );
}

function TicketSheet({
  open,
  onClose,
  event,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  event: { id: string; title: string; price: Wallet["credits"]; free: boolean };
  onConfirmed: (w: Wallet) => void;
}) {
  const [ticket, setTicket] = React.useState<Ticket | null>(null);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTicket(null);
  }

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: ({ signal }) => api.wallet.get(signal),
    enabled: open && !event.free,
  });

  const reserve = useMutation({
    mutationFn: () => api.events.getTicket(event.id),
    onSuccess: (res) => {
      onConfirmed(res.wallet);
      setTicket(res.ticket);
      track({ type: "route_view", path: `/events/${event.id}:ticket` });
    },
  });

  const canAfford = event.free || (wallet ? gte(wallet.credits, event.price) : true);

  return (
    <Sheet open={open} onClose={onClose} title={ticket ? "Your ticket" : "Get ticket"}>
      {ticket ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="rounded-xl bg-white p-3">
            <PseudoQR code={ticket.code} />
          </div>
          <p className="text-lg font-semibold">{ticket.title}</p>
          <p className="text-subtle text-xs">
            {ticket.venue} · {new Date(ticket.startsAt).toLocaleDateString()}
          </p>
          <p className="text-subtle text-2xs font-mono">{ticket.code}</p>
          <Button block variant="secondary" onClick={onClose} className="mt-1">
            Done
          </Button>
        </div>
      ) : (
        <>
          <div className="border-line flex items-center justify-between border-b pb-3">
            <span className="text-muted text-sm">{event.title}</span>
            <span className="font-bold">
              {event.free ? (
                "Free"
              ) : (
                <span className="text-brand flex items-center gap-1">
                  <Sparkles className="h-4 w-4" aria-hidden /> {format(event.price)}
                </span>
              )}
            </span>
          </div>
          {canAfford ? (
            <Button
              block
              className="mt-4"
              busy={reserve.isPending}
              onClick={() => reserve.mutate()}
            >
              {reserve.isPending
                ? "Reserving…"
                : event.free
                  ? "Confirm RSVP"
                  : `Pay ${format(event.price)}`}
            </Button>
          ) : (
            <Link
              href="/credits"
              className="rounded-pill bg-brand text-brand-fg mt-4 flex h-11 items-center justify-center font-medium"
            >
              Top up to get ticket
            </Link>
          )}
          {reserve.isError && (
            <p className="text-danger mt-2 text-center text-sm" role="alert">
              {reserve.error instanceof Error
                ? reserve.error.message
                : "Couldn't reserve a ticket."}
            </p>
          )}
          {!event.free && wallet && (
            <p className="text-subtle mt-3 text-center text-xs">
              Balance: {format(wallet.credits)}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
