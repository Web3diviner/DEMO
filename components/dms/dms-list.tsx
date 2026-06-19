"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MessageSquare } from "lucide-react";
import { api } from "@/lib/api/client";
import { ago } from "@/lib/utils/time";

export function DmsList() {
  const { data: threads, status } = useQuery({
    queryKey: ["dms"],
    queryFn: ({ signal }) => api.dms.threads(signal),
  });

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>

      <div className="mt-4">
        {status === "pending" &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface my-1 h-16 animate-pulse rounded-lg" />
          ))}

        {status === "success" && threads?.length === 0 && (
          <div className="text-subtle grid place-items-center gap-2 py-16 text-center text-sm">
            <MessageSquare className="h-8 w-8" aria-hidden />
            No messages yet.
          </div>
        )}

        <ul className="divide-line divide-y">
          {threads?.map((t) => (
            <li key={t.id}>
              <Link href={`/dms/${t.id}`} className="flex items-center gap-3 py-3">
                <div className="bg-brand text-brand-fg grid h-12 w-12 shrink-0 place-items-center rounded-full font-bold">
                  {t.participant.displayName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 font-semibold">
                    <span className="truncate">@{t.participant.handle}</span>
                    {t.participant.verified && (
                      <BadgeCheck
                        className="text-gold h-3.5 w-3.5 shrink-0"
                        aria-label="Verified"
                      />
                    )}
                    <span className="text-subtle ml-auto pl-2 text-xs font-normal">
                      {ago(t.lastAt)}
                    </span>
                  </p>
                  <p className="text-muted truncate text-sm">{t.lastMessage}</p>
                </div>
                {t.unread > 0 && (
                  <span
                    className="bg-brand text-brand-fg text-2xs grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-bold"
                    aria-label={`${t.unread} unread`}
                  >
                    {t.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
