"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Send } from "lucide-react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import type { DmMessage, DmThreadDetail } from "@/lib/api/types";

export function DmThread({ id }: { id: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  const { data, status } = useQuery({
    queryKey: ["dm", id],
    queryFn: ({ signal }) => api.dms.thread(id, signal),
  });

  const send = useMutation({
    mutationFn: (body: string) => {
      const localId = `local_${Date.now()}`;
      // Optimistic append — chat should never wait on the network.
      const optimistic: DmMessage = {
        id: localId,
        fromMe: true,
        body,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<DmThreadDetail>(["dm", id], (prev) =>
        prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev,
      );
      return api.dms.send(id, body, localId).then((confirmed) => ({ localId, confirmed }));
    },
    onSuccess: ({ localId, confirmed }) => {
      // Swap the optimistic message for the server-confirmed one.
      qc.setQueryData<DmThreadDetail>(["dm", id], (prev) =>
        prev
          ? { ...prev, messages: prev.messages.map((m) => (m.id === localId ? confirmed : m)) }
          : prev,
      );
      qc.invalidateQueries({ queryKey: ["dms"] });
    },
  });

  // Keep the latest message in view.
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    send.mutate(body);
    setDraft("");
  };

  return (
    <div className="h-dscreen mx-auto flex max-w-md flex-col">
      {/* Header */}
      <header className="border-line flex items-center gap-3 border-b px-4 py-3">
        <Link href="/dms" aria-label="Back to messages" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {data && (
          <>
            <div className="bg-brand text-brand-fg grid h-9 w-9 place-items-center rounded-full font-bold">
              {data.participant.displayName.charAt(0)}
            </div>
            <p className="flex items-center gap-1 font-semibold">
              @{data.participant.handle}
              {data.participant.verified && (
                <BadgeCheck className="text-gold h-4 w-4" aria-label="Verified" />
              )}
            </p>
          </>
        )}
      </header>

      {/* Messages */}
      <div id="main" className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {status === "pending" && <p className="text-subtle text-center text-sm">Loading…</p>}
        {data?.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
            <p
              className={cn(
                "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug break-words",
                m.fromMe ? "bg-brand text-brand-fg rounded-br-sm" : "bg-surface rounded-bl-sm",
              )}
            >
              {m.body}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={submit}
        className="border-line bg-canvas flex items-end gap-2 border-t px-3 pt-2"
        // Clear the floating bottom tab bar (nav is ~4rem + safe area).
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      >
        <label htmlFor="dm-input" className="sr-only">
          Message
        </label>
        <input
          id="dm-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          // Gate sending until the thread has loaded: the optimistic append needs existing
          // thread data to attach to, so sending into an unloaded thread would drop the message.
          disabled={!data}
          placeholder="Message…"
          className="border-line bg-surface focus-visible:outline-ring rounded-pill h-11 flex-1 border px-4 text-sm focus-visible:outline-2 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !data}
          aria-label="Send message"
          className="bg-brand text-brand-fg grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-40"
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
