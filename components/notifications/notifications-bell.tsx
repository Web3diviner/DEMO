"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api } from "@/lib/api/client";

/**
 * Feed-chrome entry point to the activity inbox. Shows a count badge when there's unread activity.
 * Shares the ["notifications"] query cache with the inbox screen, so opening it (and marking read)
 * updates the badge with no extra fetch.
 */
export function NotificationsBell({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: ({ signal }) => api.notifications.list(signal),
    staleTime: 30_000,
  });
  const unread = data?.unread ?? 0;

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Activity, ${unread} unread` : "Activity"}
      className={className}
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 && (
        <span
          className="bg-live text-2xs absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 font-bold text-white"
          aria-hidden
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
