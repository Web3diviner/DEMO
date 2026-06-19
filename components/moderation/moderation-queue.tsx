"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Bot, Flag, Check, Trash2, Ban, ArrowUpRight, Inbox } from "lucide-react";
import { api } from "@/lib/api/client";
import { ago } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import type { ModerationAction, ModerationItem } from "@/lib/api/types";

const SEVERITY: Record<ModerationItem["severity"], string> = {
  high: "bg-danger/15 text-danger",
  medium: "bg-warning/15 text-warning",
  low: "bg-elevated text-muted",
};

export function ModerationQueue() {
  const qc = useQueryClient();

  const { data: items, status } = useQuery({
    queryKey: ["moderation-queue"],
    queryFn: ({ signal }) => api.moderation.queue(signal),
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ModerationAction }) =>
      api.moderation.act(id, action),
    // Optimistically remove the resolved item; rollback on error.
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["moderation-queue"] });
      const prev = qc.getQueryData<ModerationItem[]>(["moderation-queue"]);
      qc.setQueryData<ModerationItem[]>(["moderation-queue"], (cur) =>
        (cur ?? []).filter((m) => m.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["moderation-queue"], ctx.prev);
    },
  });

  const highCount = items?.filter((i) => i.severity === "high").length ?? 0;
  const aiCount = items?.filter((i) => i.source === "ai").length ?? 0;

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <ShieldAlert className="h-5 w-5" aria-hidden /> Review queue
      </h1>
      <p className="text-muted mt-1 text-sm">
        Automated first pass + reports. Staff-only; every action is logged and re-checked
        server-side.
      </p>

      {/* Queue stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="In queue" value={items?.length ?? 0} />
        <Stat label="High severity" value={highCount} tone="danger" />
        <Stat label="Auto-flagged" value={aiCount} />
      </div>

      {/* Items */}
      <div className="mt-5 space-y-3">
        {status === "pending" &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface h-28 animate-pulse rounded-lg" />
          ))}

        {status === "success" && items?.length === 0 && (
          <div className="text-muted grid place-items-center gap-2 py-16 text-center text-sm">
            <Inbox className="h-8 w-8" aria-hidden />
            Queue clear. Nice work.
          </div>
        )}

        {items?.map((item) => (
          <Item key={item.id} item={item} onAct={(action) => act.mutate({ id: item.id, action })} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3 text-center">
      <div className={cn("text-2xl font-bold tabular-nums", tone === "danger" && "text-danger")}>
        {value}
      </div>
      <div className="text-subtle text-xs">{label}</div>
    </div>
  );
}

function Item({
  item,
  onAct,
}: {
  item: ModerationItem;
  onAct: (action: ModerationAction) => void;
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3">
      <div className="flex gap-3">
        {/* Preview */}
        {item.preview.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.preview.posterUrl}
            alt=""
            className="h-20 w-16 shrink-0 rounded-md object-cover"
          />
        ) : (
          <p className="bg-elevated text-muted text-2xs line-clamp-4 h-20 w-16 shrink-0 rounded-md p-1.5">
            {item.preview.text}
          </p>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-pill text-2xs px-2 py-0.5 font-bold uppercase",
                SEVERITY[item.severity],
              )}
            >
              {item.severity}
            </span>
            <span className="text-muted flex items-center gap-1 text-xs">
              {item.source === "ai" ? (
                <>
                  <Bot className="h-3 w-3" aria-hidden /> AI
                  {item.confidence != null && ` · ${Math.round(item.confidence * 100)}%`}
                </>
              ) : (
                <>
                  <Flag className="h-3 w-3" aria-hidden /> {item.reportCount} reports
                </>
              )}
            </span>
            <span className="text-subtle text-2xs ml-auto">{ago(item.createdAt)}</span>
          </div>
          <p className="mt-1 font-semibold">{item.reason}</p>
          <p className="text-muted text-xs">
            {item.kind} · @{item.subject.handle}
          </p>

          {/* Actions */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <ActionBtn label="Approve" tone="ok" icon={Check} onClick={() => onAct("approve")} />
            <ActionBtn label="Remove" tone="danger" icon={Trash2} onClick={() => onAct("remove")} />
            {item.kind === "user" && (
              <ActionBtn label="Ban" tone="danger" icon={Ban} onClick={() => onAct("ban")} />
            )}
            <ActionBtn label="Escalate" icon={ArrowUpRight} onClick={() => onAct("escalate")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ok" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        tone === "danger"
          ? "border-danger/30 text-danger hover:bg-danger/10"
          : tone === "ok"
            ? "border-success/30 text-success hover:bg-success/10"
            : "border-line text-fg hover:bg-elevated",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
