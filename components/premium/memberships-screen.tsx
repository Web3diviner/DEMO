"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { Membership } from "@/lib/api/types";

const STATUS_STYLE: Record<Membership["status"], string> = {
  active: "bg-success/15 text-success",
  cancelled: "bg-warning/15 text-warning",
  expired: "bg-elevated text-muted",
};

export function MembershipsScreen() {
  const qc = useQueryClient();
  const { data: memberships, status } = useQuery({
    queryKey: ["memberships"],
    queryFn: ({ signal }) => api.premium.memberships(signal),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.premium.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberships"] }),
  });

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Crown className="text-gold h-6 w-6" aria-hidden /> Memberships
      </h1>
      <p className="text-muted mt-1 text-sm">Your Fan Club subscriptions.</p>

      <div className="mt-5 space-y-3">
        {status === "pending" &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-surface h-20 animate-pulse rounded-lg" />
          ))}

        {status === "success" && memberships?.length === 0 && (
          <div className="text-subtle grid place-items-center gap-3 py-16 text-center text-sm">
            <Crown className="h-8 w-8" aria-hidden />
            No memberships yet. Join a creator&apos;s Fan Club to get started.
          </div>
        )}

        {memberships?.map((m) => (
          <div key={m.id} className="border-line bg-surface rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand text-brand-fg grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold">
                {m.displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/fanclub/${m.creatorHandle}`}
                  className="flex items-center gap-1 font-semibold"
                >
                  {m.displayName} <ChevronRight className="text-subtle h-4 w-4" aria-hidden />
                </Link>
                <p className="text-subtle text-xs">{m.tierName}</p>
              </div>
              <span
                className={cn(
                  "rounded-pill text-2xs px-2 py-0.5 font-bold uppercase",
                  STATUS_STYLE[m.status],
                )}
              >
                {m.status}
              </span>
            </div>
            <div className="text-subtle mt-2 flex items-center justify-between text-xs">
              <span>
                {m.status === "active" && m.renewsAt
                  ? `Renews ${new Date(m.renewsAt).toLocaleDateString()}`
                  : `Access until ${new Date(m.expiresAt).toLocaleDateString()}`}
              </span>
              {m.status === "active" && (
                <Button
                  variant="ghost"
                  size="sm"
                  busy={cancel.isPending && cancel.variables === m.id}
                  onClick={() => cancel.mutate(m.id)}
                  className="text-danger h-7 px-2"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
