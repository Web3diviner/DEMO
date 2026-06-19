import type { UploadTicket } from "@/lib/api/types";
import type { DataPolicy } from "@/lib/connection";

/**
 * Resumable, chunked video upload — straight to object storage via a signed tus ticket. The video
 * never touches our API. Survives connectivity loss and full page reloads (tus fingerprints the
 * file in localStorage and resumes from the last acknowledged offset).
 *
 * Data discipline: smaller chunks on cellular so a dropped connection wastes less and resumes at a
 * finer granularity; larger chunks on Wi-Fi for throughput. `tus-js-client` is imported lazily so
 * its weight never lands in the initial bundle.
 */

export type UploadStatus = "idle" | "uploading" | "paused" | "error" | "success";

export type UploadState = {
  status: UploadStatus;
  /** 0..1 */
  progress: number;
  bytesSent: number;
  bytesTotal: number;
  error: string | null;
};

export type UploadController = {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  /** Cancel and (optionally) tell the server to discard the partial upload. */
  abort: (terminate?: boolean) => Promise<void>;
};

type CreateOpts = {
  file: File;
  ticket: UploadTicket;
  policy: DataPolicy;
  caption: string;
  onState: (s: UploadState) => void;
};

const MB = 1024 * 1024;

export function chunkSizeFor(policy: DataPolicy): number {
  // Cellular: 2MB (fine-grained resume on flaky links). Wi-Fi: 8MB (fewer round-trips).
  return policy.dataSaver ? 2 * MB : 8 * MB;
}

export async function createResumableUpload(opts: CreateOpts): Promise<UploadController> {
  const { file, ticket, policy, caption, onState } = opts;
  const { Upload } = await import("tus-js-client");

  let state: UploadState = {
    status: "idle",
    progress: 0,
    bytesSent: 0,
    bytesTotal: file.size,
    error: null,
  };
  const emit = (patch: Partial<UploadState>) => {
    state = { ...state, ...patch };
    onState(state);
  };

  const upload = new Upload(file, {
    endpoint: ticket.endpoint,
    chunkSize: chunkSizeFor(policy),
    headers: ticket.headers,
    // Exponential-ish auto-retry for transient mobile drops.
    retryDelays: [0, 1000, 3000, 5000, 10_000, 20_000],
    removeFingerprintOnSuccess: true,
    metadata: {
      filename: file.name,
      filetype: file.type,
      caption,
      assetId: ticket.assetId,
    },
    onError: (err) => emit({ status: "error", error: err.message }),
    onProgress: (sent, total) =>
      emit({
        status: "uploading",
        bytesSent: sent,
        bytesTotal: total,
        progress: total ? sent / total : 0,
      }),
    onSuccess: () => emit({ status: "success", progress: 1 }),
  });

  const start = async () => {
    emit({ status: "uploading", error: null });
    // Resume a prior interrupted upload of the same file if one exists.
    try {
      const previous = await upload.findPreviousUploads();
      if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
    } catch {
      /* no resumable state; start fresh */
    }
    upload.start();
  };

  return {
    start,
    pause: () => {
      upload.abort();
      emit({ status: "paused" });
    },
    resume: async () => {
      emit({ status: "uploading", error: null });
      upload.start();
    },
    abort: async (terminate = false) => {
      await upload.abort(terminate);
      emit({ status: "idle", progress: 0, bytesSent: 0, error: null });
    },
  };
}
