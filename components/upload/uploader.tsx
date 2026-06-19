"use client";

import * as React from "react";
import { UploadCloud, Pause, Play, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api/client";
import { useDataPolicy } from "@/lib/hooks/use-data-policy";
import { maybePrecompress } from "@/lib/uploads/precompress";
import {
  createResumableUpload,
  type UploadController,
  type UploadState,
} from "@/lib/uploads/tus-upload";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const MAX_BYTES = 200 * 1024 * 1024; // 200MB guard

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const INITIAL: UploadState = {
  status: "idle",
  progress: 0,
  bytesSent: 0,
  bytesTotal: 0,
  error: null,
};

export function Uploader() {
  const { policy } = useDataPolicy();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState("");
  const [state, setState] = React.useState<UploadState>(INITIAL);
  const [published, setPublished] = React.useState(false);
  const controllerRef = React.useRef<UploadController | null>(null);

  // Revoke the object URL when the file changes / unmounts (no leaks).
  React.useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setState({ ...INITIAL, status: "error", error: "Please choose a video file." });
      return;
    }
    if (f.size > MAX_BYTES) {
      setState({ ...INITIAL, status: "error", error: "That clip is over the 200MB limit." });
      return;
    }
    setFile(f);
    setState({ ...INITIAL, bytesTotal: f.size });
    setPublished(false);
  };

  const startUpload = async () => {
    if (!file) return;
    track({ type: "route_view", path: "/upload:start" });
    setState((s) => ({ ...s, status: "uploading", error: null }));
    try {
      // 1) Optional Wi-Fi-only pre-compression (no-op on cellular by policy).
      const { file: toUpload } = await maybePrecompress(file, policy);
      // 2) Signed ticket — direct-to-storage, never through our API.
      const ticket = await api.uploads.createTicket({
        sizeBytes: toUpload.size,
        mimeType: toUpload.type,
      });
      // 3) Resumable upload.
      const controller = await createResumableUpload({
        file: toUpload,
        ticket,
        policy,
        caption,
        onState: async (s) => {
          setState(s);
          if (s.status === "success" && !published) {
            // 4) Publish metadata + claim the asset.
            try {
              await api.uploads.publish({ assetId: ticket.assetId, caption });
              setPublished(true);
            } catch {
              setState((prev) => ({
                ...prev,
                status: "error",
                error: "Upload saved, but publishing failed. Retry.",
              }));
            }
          }
        },
      });
      controllerRef.current = controller;
      await controller.start();
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed.",
      }));
    }
  };

  const reset = () => {
    void controllerRef.current?.abort(true);
    controllerRef.current = null;
    setFile(null);
    setCaption("");
    setState(INITIAL);
    setPublished(false);
  };

  const pct = Math.round(state.progress * 100);

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight">New clip</h1>
      <p className="text-muted mt-1 text-sm">
        {policy.dataSaver
          ? "Data Saver is on — uploads resume automatically if your connection drops."
          : "On Wi-Fi — full quality. Uploads resume automatically if interrupted."}
      </p>

      {/* Picker / preview */}
      <div className="mt-5">
        {!file ? (
          <label className="border-line bg-surface hover:border-line-strong flex aspect-[9/12] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors">
            <UploadCloud className="text-muted h-10 w-10" aria-hidden />
            <span className="text-sm font-medium">Tap to choose a video</span>
            <span className="text-subtle text-xs">MP4 or WebM · up to 200MB</span>
            <input
              type="file"
              accept="video/*"
              capture="environment"
              className="sr-only"
              onChange={onPick}
            />
          </label>
        ) : (
          <div className="bg-surface relative aspect-[9/12] w-full overflow-hidden rounded-lg">
            {previewUrl && (
              <video src={previewUrl} muted playsInline className="h-full w-full object-cover" />
            )}
            {state.status === "success" && published && (
              <div className="absolute inset-0 grid place-items-center bg-black/60 text-center">
                <div>
                  <CheckCircle2 className="text-success mx-auto h-12 w-12" aria-hidden />
                  <p className="mt-2 font-semibold text-white">Uploaded — processing</p>
                  <p className="text-xs text-white/70">
                    We&apos;ll notify you when it&apos;s live.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {file && state.status !== "success" && (
        <>
          <label htmlFor="caption" className="text-muted mt-4 block text-sm font-medium">
            Caption
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Say something about your clip…"
            className="border-line bg-surface focus-visible:outline-ring mt-1 w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:outline-2"
          />

          {/* Progress */}
          {(state.status === "uploading" || state.status === "paused") && (
            <div className="mt-4" role="status" aria-live="polite">
              <div className="text-muted mb-1 flex justify-between text-xs tabular-nums">
                <span>
                  {state.status === "paused" ? "Paused" : "Uploading"} · {fmtBytes(state.bytesSent)}{" "}
                  / {fmtBytes(state.bytesTotal)}
                </span>
                <span>{pct}%</span>
              </div>
              <div className="bg-elevated h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-brand h-full rounded-full transition-[width] duration-[var(--dur-2)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {state.error && (
        <p className="text-danger mt-3 flex items-center gap-1.5 text-sm" role="alert">
          <AlertTriangle className="h-4 w-4" aria-hidden /> {state.error}
        </p>
      )}

      {/* Actions */}
      <div className="mt-5 flex gap-3">
        {file && state.status === "idle" && (
          <Button block onClick={startUpload}>
            Upload clip
          </Button>
        )}
        {state.status === "uploading" && (
          <Button block variant="secondary" onClick={() => controllerRef.current?.pause()}>
            <Pause className="h-4 w-4" /> Pause
          </Button>
        )}
        {state.status === "paused" && (
          <Button block onClick={() => controllerRef.current?.resume()}>
            <Play className="h-4 w-4" /> Resume
          </Button>
        )}
        {state.status === "error" && file && (
          <Button block onClick={startUpload}>
            Retry
          </Button>
        )}
        {file && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Discard"
            onClick={reset}
            className={cn(state.status === "success" && "hidden")}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        {state.status === "success" && published && (
          <Button block variant="secondary" onClick={reset}>
            Upload another
          </Button>
        )}
      </div>
    </div>
  );
}
