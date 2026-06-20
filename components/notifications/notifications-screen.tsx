"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  Coins,
  Heart,
  MessageCircle,
  Swords,
  TrendingUp,
  UserPlus,
  Sparkles,
  CheckCheck,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ago } from "@/lib/utils/time";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";
import type { Notification, NotificationKind, NotificationsPage } from "@/lib/api/types";

/** Per-kind icon + accent. Mirrors the colour language used across the app (gold = money/verify,
 *  live-orange = engagement, brand-green = social, muted for system). */
const KIND: Record<
  NotificationKind,
  { Icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  follow: { Icon: UserPlus, tint: "bg-brand/15 text-brand" },
  like: { Icon: Heart, tint: "bg-live/15 text-live" },
  comment: { Icon: MessageCircle, tint: "bg-brand/15 text-brand" },
  tip: { Icon: Coins, tint: "bg-gold/15 text-gold" },
  battle: { Icon: Swords, tint: "bg-live/15 text-live" },
  earning: { Icon: TrendingUp, tint: "bg-gold/15 text-gold" },
  system: { Icon: Sparkles, tint: "bg-elevated text-muted" },
};

/** Day-bucket label so the list reads like an activity timeline, not a flat dump. */
function bucket(iso: string): "Today" | "This week" | "Earlier" {
  const ageMs = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (ageMs < day) return "Today";
  if (ageMs < 7 * day) return "This week";
  return "Earlier";
}

function Row({ n }: { n: Notification }) {
  const { Icon, tint } = KIND[n.kind];
  const inner = (
    <>
      <span
        className={cn("relative grid h-10 w-10 shrink-0 place-items-center rounded-full", tint)}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {!n.read && (
          <span
            className="bg-live ring-canvas absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2"
            aria-hidden
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          {n.actor && <span className="text-fg truncate font-semibold">@{n.actor.handle}</span>}
          {n.actor?.verified && (
            <BadgeCheck className="text-gold h-3.5 w-3.5 shrink-0" aria-label="Verified" />
          )}
          <span className="text-subtle ml-auto pl-2 text-xs whitespace-nowrap">
            {ago(n.createdAt)}
          </span>
        </span>
        <span className={cn("block text-sm", n.read ? "text-muted" : "text-fg")}>{n.text}</span>
      </span>
    </>
  );

  const rowClass = cn(
    "flex items-start gap-3 px-2 py-3 transition-colors",
    !n.read && "bg-brand/[0.04]",
  );

  return n.href ? (
    <Link href={n.href} className={cn(rowClass, "hover:bg-elevated/60 rounded-lg")}>
      {inner}
    </Link>
  ) : (
    <div className={rowClass}>{inner}</div>
  );
}

export function NotificationsScreen() {
  const qc = useQueryClient();
  const { data, status } = useQuery({
    queryKey: ["notifications"],
    queryFn: ({ signal }) => api.notifications.list(signal),
  });

  const markRead = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    // Optimistic: clear the dots immediately, reconcile with the server reply.
    onMutate: () => {
      const prev = qc.getQueryData<NotificationsPage>(["notifications"]);
      if (prev) {
        qc.setQueryData<NotificationsPage>(["notifications"], {
          items: prev.items.map((n) => ({ ...n, read: true })),
          unread: 0,
        });
      }
      track({ type: "route_view", path: "/notifications:read-all" });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications"], ctx.prev);
    },
    onSuccess: (page) => qc.setQueryData(["notifications"], page),
  });

  const unread = data?.unread ?? 0;
  const groups = React.useMemo(() => {
    const order: Array<"Today" | "This week" | "Earlier"> = ["Today", "This week", "Earlier"];
    const by = new Map<string, Notification[]>();
    for (const n of data?.items ?? []) {
      const key = bucket(n.createdAt);
      (by.get(key) ?? by.set(key, []).get(key)!).push(n);
    }
    return order.filter((k) => by.has(k)).map((k) => [k, by.get(k)!] as const);
  }, [data]);

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          Activity
          {unread > 0 && (
            <span
              className="bg-live text-2xs grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-bold text-white"
              aria-label={`${unread} unread`}
            >
              {unread}
            </span>
          )}
        </h1>
        <button
          type="button"
          onClick={() => markRead.mutate()}
          disabled={unread === 0 || markRead.isPending}
          className="text-brand flex items-center gap-1.5 text-sm font-medium disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" aria-hidden /> Mark all read
        </button>
      </div>

      {status === "pending" && (
        <ul className="mt-4 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="bg-surface h-16 animate-pulse rounded-lg" />
          ))}
        </ul>
      )}

      {status === "error" && (
        <p className="text-muted mt-10 text-center text-sm">
          Couldn&apos;t load your activity. Pull to retry.
        </p>
      )}

      {status === "success" && data.items.length === 0 && (
        <div className="text-subtle grid place-items-center gap-2 py-20 text-center text-sm">
          <Bell className="h-8 w-8" aria-hidden />
          You&apos;re all caught up. Activity from fans and battles shows up here.
        </div>
      )}

      {status === "success" &&
        groups.map(([label, items]) => (
          <section key={label} className="mt-5">
            <h2 className="text-subtle mb-1 px-2 text-xs font-medium tracking-wide uppercase">
              {label}
            </h2>
            <ul className="divide-line/60 divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <Row n={n} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </main>
  );
}
