"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Send } from "lucide-react";
import { api } from "@/lib/api/client";
import { getEngagementQueue } from "@/lib/queue/shared";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import type { Comment } from "@/lib/api/types";

const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

/** Relative time, tiny and dependency-free. */
function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86_400)}d`;
}

export function CommentSheet({
  clipId,
  open,
  onClose,
}: {
  clipId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = React.useState("");
  // Locally-added optimistic comments, newest first, layered above the fetched list.
  const [optimistic, setOptimistic] = React.useState<Comment[]>([]);

  const { data, status } = useQuery({
    queryKey: ["comments", clipId],
    queryFn: ({ signal }) => api.comments.list(clipId, null, signal),
    enabled: open,
  });

  // Reset optimistic comments when the sheet (re)opens or switches clips — adjust-state-during-render
  // (React's recommended pattern) rather than a setState-in-effect.
  const [prev, setPrev] = React.useState({ open, clipId });
  if (open !== prev.open || clipId !== prev.clipId) {
    setPrev({ open, clipId });
    if (open) setOptimistic([]);
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const localId = `local_${Date.now()}`;
    // Optimistic: show instantly, queue for background sync — never block on the network.
    setOptimistic((prev) => [
      {
        id: localId,
        author: { handle: "you", displayName: "You", verified: false },
        body,
        createdAt: new Date().toISOString(),
        likeCount: 0,
      },
      ...prev,
    ]);
    getEngagementQueue().enqueue({ kind: "comment", clipId, body, localId });
    track({ type: "engagement", action: "comment", clipId });
    setDraft("");
  };

  const comments = [...optimistic, ...(data?.items ?? [])];
  const total = (data?.total ?? 0) + optimistic.length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Comments${data ? ` · ${compact.format(total)}` : ""}`}
    >
      <div className="space-y-4">
        {status === "pending" && (
          <p className="text-subtle py-6 text-center text-sm">Loading comments…</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="bg-surface text-muted grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold">
              {c.author.displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-semibold">
                @{c.author.handle}
                {c.author.verified && (
                  <BadgeCheck className="text-gold h-3.5 w-3.5" aria-label="Verified" />
                )}
                <span className="text-subtle ml-1 text-xs font-normal">{ago(c.createdAt)}</span>
              </p>
              <p className="text-sm leading-snug break-words">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Composer pinned at the bottom of the sheet. */}
      <form onSubmit={submit} className="bg-canvas sticky bottom-0 mt-3 flex items-end gap-2 pt-2">
        <label htmlFor="comment-input" className="sr-only">
          Add a comment
        </label>
        <input
          id="comment-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={300}
          placeholder="Add a comment…"
          className="border-line bg-surface focus-visible:outline-ring rounded-pill h-11 flex-1 border px-4 text-sm focus-visible:outline-2"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Post comment"
          className="bg-brand text-brand-fg grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-40"
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </form>
    </Sheet>
  );
}
