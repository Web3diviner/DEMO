"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, UserX } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import type { BlockedUser } from "@/lib/api/types";

export function BlockedAccountsScreen() {
  const qc = useQueryClient();
  const { data: blocked, status } = useQuery({
    queryKey: ["blocked"],
    queryFn: ({ signal }) => api.privacy.blocked(signal),
  });

  const unblock = useMutation({
    mutationFn: (handle: string) => api.privacy.unblock(handle),
    onMutate: (handle) => {
      const prev = qc.getQueryData<BlockedUser[]>(["blocked"]);
      qc.setQueryData<BlockedUser[]>(["blocked"], (list) =>
        list?.filter((b) => b.handle !== handle),
      );
      return { prev };
    },
    onError: (_e, _h, ctx) => ctx?.prev && qc.setQueryData(["blocked"], ctx.prev),
    onSuccess: (list) => qc.setQueryData(["blocked"], list),
  });

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      <div className="flex items-center gap-3">
        <Link
          href="/settings/privacy"
          aria-label="Back to privacy"
          className="text-muted hover:text-fg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Blocked accounts</h1>
      </div>

      {status === "pending" && (
        <ul className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="bg-surface h-14 animate-pulse rounded-lg" />
          ))}
        </ul>
      )}

      {status === "success" && blocked && blocked.length === 0 && (
        <div className="text-subtle grid place-items-center gap-2 py-20 text-center text-sm">
          <UserX className="h-8 w-8" aria-hidden />
          You haven&apos;t blocked anyone. Blocked accounts can&apos;t find your profile or message
          you.
        </div>
      )}

      {status === "success" && blocked && blocked.length > 0 && (
        <ul className="divide-line/60 mt-2 divide-y">
          {blocked.map((b) => (
            <li key={b.handle} className="flex items-center gap-3 py-3">
              <span className="bg-elevated text-muted grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold">
                {b.displayName.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-medium">
                  <span className="truncate">{b.displayName}</span>
                  {b.verified && (
                    <BadgeCheck className="text-gold h-3.5 w-3.5 shrink-0" aria-label="Verified" />
                  )}
                </p>
                <p className="text-subtle truncate text-xs">@{b.handle}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                busy={unblock.isPending && unblock.variables === b.handle}
                onClick={() => unblock.mutate(b.handle)}
              >
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
