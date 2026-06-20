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

function Row({ n, onOpen }: { n: Notification; onOpen: (id: string) => void }) {
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
    <Link
      href={n.href}
      onClick={() => !n.read && onOpen(n.id)}
      className={cn(rowClass, "hover:bg-elevated/60 rounded-lg")}
    >
      {inner}
    </Link>
  ) : (
    <div className={rowClass}>{inner}</div>
  );
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "earnings", label: "Earnings" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

function matchesFilter(n: Notification, filter: Filter): boolean {
  if (filter === "unread") return !n.read;
  if (filter === "earnings") return n.kind === "tip" || n.kind === "earning";
  return true;
}

export function NotificationsScreen() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<Filter>("all");
  const { data, status } = useQuery({
    queryKey: ["notifications"],
    queryFn: ({ signal }) => api.notifications.list(signal),
  });

  /** Shared optimistic helper: apply `mutate` to the cached page, recomputing unread. */
  const optimistic = (mutate: (n: Notification) => Notification) => {
    const prev = qc.getQueryData<NotificationsPage>(["notifications"]);
    if (prev) {
      const items = prev.items.map(mutate);
      qc.setQueryData<NotificationsPage>(["notifications"], {
        items,
        unread: items.filter((n) => !n.read).length,
      });
    }
    return { prev };
  };

  const markAll = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onMutate: () => {
      track({ type: "route_view", path: "/notifications:read-all" });
      return optimistic((n) => (n.read ? n : { ...n, read: true }));
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["notifications"], ctx.prev),
    onSuccess: (page) => qc.setQueryData(["notifications"], page),
  });

  // Mark a single item read when its row is opened. Optimistic so the dot clears before navigation.
  const markOne = useMutation({
    mutationFn: (id: string) => api.notifications.read(id),
    onMutate: (id) => optimistic((n) => (n.id === id ? { ...n, read: true } : n)),
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(["notifications"], ctx.prev),
    onSuccess: (page) => qc.setQueryData(["notifications"], page),
  });

  const unread = data?.unread ?? 0;
  const groups = React.useMemo(() => {
    const order: Array<"Today" | "This week" | "Earlier"> = ["Today", "This week", "Earlier"];
    const by = new Map<string, Notification[]>();
    for (const n of data?.items ?? []) {
      if (!matchesFilter(n, filter)) continue;
      const key = bucket(n.createdAt);
      (by.get(key) ?? by.set(key, []).get(key)!).push(n);
    }
    return order.filter((k) => by.has(k)).map((k) => [k, by.get(k)!] as const);
  }, [data, filter]);
  const visibleCount = groups.reduce((sum, [, items]) => sum + items.length, 0);

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
          onClick={() => markAll.mutate()}
          disabled={unread === 0 || markAll.isPending}
          className="text-brand flex items-center gap-1.5 text-sm font-medium disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" aria-hidden /> Mark all read
        </button>
      </div>

      {/* Filters */}
      <div role="tablist" aria-label="Filter activity" className="mt-4 flex gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count =
            f.id === "unread"
              ? unread
              : (data?.items.filter((n) => matchesFilter(n, f.id)).length ?? 0);
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-brand text-brand-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {f.label}
              {f.id !== "all" && count > 0 && (
                <span className={cn("ml-1.5 tabular-nums", active ? "opacity-80" : "text-subtle")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
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

      {status === "success" && visibleCount === 0 && (
        <div className="text-subtle grid place-items-center gap-2 py-20 text-center text-sm">
          <Bell className="h-8 w-8" aria-hidden />
          {filter === "unread"
            ? "No unread activity — you're all caught up."
            : filter === "earnings"
              ? "No earnings activity yet. Tips and payouts show up here."
              : "You're all caught up. Activity from fans and battles shows up here."}
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
                  <Row n={n} onOpen={(id) => markOne.mutate(id)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </main>
  );
}
