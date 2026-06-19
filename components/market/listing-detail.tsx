"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Sparkles, Check, Package, Download } from "lucide-react";
import { api } from "@/lib/api/client";
import { format, gte } from "@/lib/money";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { MarketOrder, Wallet } from "@/lib/api/types";

export function ListingDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const [buyOpen, setBuyOpen] = React.useState(false);

  const { data: listing, status } = useQuery({
    queryKey: ["listing", id],
    queryFn: ({ signal }) => api.market.listing(id, signal),
  });

  if (status === "pending") {
    return <div className="h-dscreen text-muted grid place-items-center">Loading…</div>;
  }
  if (status === "error" || !listing) {
    return <div className="h-dscreen text-muted grid place-items-center">Listing unavailable.</div>;
  }

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/market" aria-label="Back to marketplace" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-lg font-semibold">Marketplace</h1>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={listing.coverUrl} alt="" className="aspect-square w-full object-cover" />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <span className="text-subtle text-2xs font-medium uppercase">{listing.category}</span>
          <h2 className="text-xl leading-tight font-semibold">{listing.title}</h2>
          <p className="text-muted mt-1 flex items-center gap-1 text-sm">
            @{listing.creator.handle}
            {listing.creator.verified && (
              <BadgeCheck className="text-gold h-3.5 w-3.5" aria-label="Verified" />
            )}
          </p>
        </div>
        <span className="text-brand flex shrink-0 items-center gap-1 text-lg font-bold">
          <Sparkles className="h-4 w-4" aria-hidden /> {format(listing.price)}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed">{listing.description}</p>

      <div className="border-line bg-surface mt-4 flex items-start gap-2 rounded-lg border p-3">
        {listing.kind === "digital" ? (
          <Download className="text-brand mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Package className="text-brand mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <p className="text-muted text-sm">{listing.deliverableNote}</p>
      </div>

      <Button block className="mt-5" onClick={() => setBuyOpen(true)}>
        Buy · {format(listing.price)}
      </Button>

      <BuySheet
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        listing={listing}
        onConfirmed={(w) => qc.setQueryData<Wallet>(["wallet"], w)}
      />
    </main>
  );
}

function BuySheet({
  open,
  onClose,
  listing,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  listing: { id: string; title: string; price: Wallet["credits"]; kind: "digital" | "physical" };
  onConfirmed: (w: Wallet) => void;
}) {
  const [order, setOrder] = React.useState<MarketOrder | null>(null);
  const [ship, setShip] = React.useState({ name: "", address: "", phone: "" });

  // Reset when reopened (adjust-state-during-render).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setOrder(null);
      setShip({ name: "", address: "", phone: "" });
    }
  }

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: ({ signal }) => api.wallet.get(signal),
    enabled: open,
  });

  const buy = useMutation({
    mutationFn: () =>
      api.market.createOrder({
        listingId: listing.id,
        shipping: listing.kind === "physical" ? ship : undefined,
      }),
    onSuccess: (o) => {
      onConfirmed(o.wallet);
      setOrder(o);
      track({ type: "route_view", path: `/market/${listing.id}:purchased` });
    },
  });

  const canAfford = wallet ? gte(wallet.credits, listing.price) : true;
  const shipValid = listing.kind === "digital" || (ship.name && ship.address && ship.phone);

  return (
    <Sheet open={open} onClose={onClose} title={order ? "Order confirmed" : "Confirm purchase"}>
      {order ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">
            {order.status === "delivered" ? "Yours now 🎉" : "Order placed"}
          </p>
          <p className="text-subtle max-w-xs text-xs">
            {order.deliverable ? order.deliverable.note : "We'll keep you posted on fulfilment."}
          </p>
          {order.deliverable?.type === "download" && (
            <Button block className="mt-1">
              <Download className="h-4 w-4" /> Download
            </Button>
          )}
          <Button block variant="secondary" onClick={onClose} className="mt-1">
            Done
          </Button>
        </div>
      ) : (
        <>
          <div className="border-line flex items-center justify-between border-b pb-3">
            <span className="text-muted text-sm">{listing.title}</span>
            <span className="text-brand flex items-center gap-1 font-bold">
              <Sparkles className="h-4 w-4" aria-hidden /> {format(listing.price)}
            </span>
          </div>

          {listing.kind === "physical" && (
            <div className="mt-3 space-y-2">
              <p className="text-muted text-sm font-medium">Delivery details</p>
              {(["name", "address", "phone"] as const).map((f) => (
                <input
                  key={f}
                  value={ship[f]}
                  onChange={(e) => setShip((s) => ({ ...s, [f]: e.target.value }))}
                  placeholder={f === "name" ? "Full name" : f === "phone" ? "Phone" : "Address"}
                  className="border-line bg-surface focus-visible:outline-ring h-11 w-full rounded-md border px-3 text-sm focus-visible:outline-2"
                />
              ))}
            </div>
          )}

          {canAfford ? (
            <Button
              block
              className="mt-4"
              busy={buy.isPending}
              disabled={!shipValid}
              onClick={() => buy.mutate()}
            >
              {buy.isPending ? "Processing…" : `Pay ${format(listing.price)}`}
            </Button>
          ) : (
            <Link
              href="/credits"
              className="rounded-pill bg-brand text-brand-fg mt-4 flex h-11 items-center justify-center font-medium"
            >
              Top up to buy
            </Link>
          )}

          {buy.isError && (
            <p className="text-danger mt-2 text-center text-sm" role="alert">
              {buy.error instanceof Error ? buy.error.message : "Couldn't complete the purchase."}
            </p>
          )}
          {wallet && (
            <p className="text-subtle mt-3 text-center text-xs">
              Balance: {format(wallet.credits)}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
