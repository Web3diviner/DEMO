"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Eye, Heart, Pencil, Trash2, Film } from "lucide-react";
import { api } from "@/lib/api/client";
import { ago } from "@/lib/utils/time";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { MyClip } from "@/lib/api/types";

const nfCompact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

function EditCaptionSheet({
  clip,
  onClose,
  onSave,
  pending,
}: {
  clip: MyClip | null;
  onClose: () => void;
  onSave: (caption: string) => void;
  pending: boolean;
}) {
  const open = clip !== null;
  const [caption, setCaption] = React.useState("");

  // Seed the field from the clip when the sheet opens — adjust-state-during-render.
  const [prevId, setPrevId] = React.useState<string | null>(null);
  if (clip && clip.id !== prevId) {
    setPrevId(clip.id);
    setCaption(clip.caption);
  }

  const trimmed = caption.trim();
  return (
    <Sheet open={open} onClose={onClose} title="Edit caption">
      <label htmlFor="caption" className="sr-only">
        Caption
      </label>
      <textarea
        id="caption"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={150}
        rows={3}
        className="border-line bg-surface focus-visible:outline-ring w-full resize-none rounded-lg border p-3 text-sm focus-visible:outline-2"
      />
      <div className="text-subtle mt-1 text-right text-xs tabular-nums">{caption.length}/150</div>
      <Button
        block
        className="mt-2"
        busy={pending}
        disabled={pending || trimmed === "" || trimmed === clip?.caption}
        onClick={() => onSave(trimmed)}
      >
        {pending ? "Saving…" : "Save caption"}
      </Button>
    </Sheet>
  );
}

function ClipRow({
  clip,
  onEdit,
  onDelete,
}: {
  clip: MyClip;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const processing = clip.status === "processing";
  return (
    <div className="flex gap-3 py-3">
      <span className="bg-elevated relative grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-md">
        <Film className="text-subtle h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{clip.caption}</p>
        {processing ? (
          <p className="text-warning mt-1 text-xs font-medium">Processing…</p>
        ) : (
          <p className="text-subtle mt-1 flex items-center gap-3 text-xs tabular-nums">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" aria-hidden /> {nfCompact.format(clip.views)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" aria-hidden /> {nfCompact.format(clip.likes)}
            </span>
            <span>{ago(clip.createdAt)}</span>
          </p>
        )}
        <div className="mt-2 flex items-center gap-4 text-xs font-medium">
          {!processing && (
            <Link
              href={`/analytics/${clip.id}`}
              className="text-brand flex items-center gap-1 hover:underline"
            >
              <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Insights
            </Link>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="text-muted hover:text-fg flex items-center gap-1"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-danger flex items-center gap-1 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContentScreen() {
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState<MyClip | null>(null);
  const [deleting, setDeleting] = React.useState<MyClip | null>(null);

  const { data: clips, status } = useQuery({
    queryKey: ["my-clips"],
    queryFn: ({ signal }) => api.content.mine(signal),
  });

  const edit = useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string }) =>
      api.content.updateCaption(id, caption),
    onMutate: ({ id, caption }) => {
      const prev = qc.getQueryData<MyClip[]>(["my-clips"]);
      qc.setQueryData<MyClip[]>(["my-clips"], (list) =>
        list?.map((c) => (c.id === id ? { ...c, caption } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["my-clips"], ctx.prev),
    onSuccess: () => setEditing(null),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.content.remove(id),
    onMutate: (id) => {
      const prev = qc.getQueryData<MyClip[]>(["my-clips"]);
      qc.setQueryData<MyClip[]>(["my-clips"], (list) => list?.filter((c) => c.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(["my-clips"], ctx.prev),
    onSettled: () => setDeleting(null),
  });

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your content</h1>
        <Link
          href="/upload"
          className="rounded-pill bg-brand text-brand-fg flex h-9 items-center px-4 text-sm font-medium"
        >
          Upload
        </Link>
      </div>

      {status === "pending" && (
        <ul className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="bg-surface h-20 animate-pulse rounded-lg" />
          ))}
        </ul>
      )}

      {status === "error" && (
        <p className="text-muted mt-10 text-center text-sm">Couldn&apos;t load your content.</p>
      )}

      {status === "success" && clips && clips.length === 0 && (
        <div className="text-subtle grid place-items-center gap-2 py-20 text-center text-sm">
          <Film className="h-8 w-8" aria-hidden />
          No clips yet. Upload your first to get discovered.
        </div>
      )}

      {status === "success" && clips && clips.length > 0 && (
        <ul className="divide-line/60 mt-2 divide-y">
          {clips.map((clip) => (
            <li key={clip.id}>
              <ClipRow
                clip={clip}
                onEdit={() => setEditing(clip)}
                onDelete={() => setDeleting(clip)}
              />
            </li>
          ))}
        </ul>
      )}

      <EditCaptionSheet
        clip={editing}
        onClose={() => setEditing(null)}
        onSave={(caption) => editing && edit.mutate({ id: editing.id, caption })}
        pending={edit.isPending}
      />

      {/* Delete confirmation */}
      <Sheet open={deleting !== null} onClose={() => setDeleting(null)} title="Delete clip?">
        <p className="text-muted text-sm">
          This permanently removes <span className="text-fg font-medium">{deleting?.caption}</span>{" "}
          and its stats. This can&apos;t be undone.
        </p>
        <div className={cn("mt-4 flex gap-2")}>
          <Button block variant="secondary" onClick={() => setDeleting(null)}>
            Keep
          </Button>
          <Button
            block
            className="bg-danger text-white"
            busy={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id)}
          >
            Delete
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
