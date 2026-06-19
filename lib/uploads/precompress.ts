import type { DataPolicy } from "@/lib/connection";

/**
 * Optional client-side pre-compression before upload.
 *
 * Honest scope note: real in-browser video transcoding needs WebCodecs or ffmpeg.wasm (a multi-MB
 * download + heavy CPU) — exactly the costs this audience can't afford on cellular. So the policy is:
 *
 *   - On cellular / data-saver: NEVER pre-compress here. Spending CPU/time/data to shrink before an
 *     upload the user wants done now is the wrong trade; the server transcodes to HLS rungs anyway.
 *   - On Wi-Fi with WebCodecs available: a transcode pass is worthwhile (smaller upload, faster
 *     processing). That encoder is a deliberate follow-up — gated behind capability detection below
 *     so enabling it is a localized change, never a regression on unsupported devices.
 *
 * Until the encoder lands, this returns the original file with the reason recorded, so callers and
 * tests can rely on a stable contract.
 */

export type PrecompressResult = {
  file: File;
  applied: boolean;
  reason: "cellular" | "unsupported" | "encoder-not-enabled" | "applied";
};

function webCodecsAvailable(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoDecoder" in window;
}

export async function maybePrecompress(file: File, policy: DataPolicy): Promise<PrecompressResult> {
  if (policy.dataSaver) return { file, applied: false, reason: "cellular" };
  if (!webCodecsAvailable()) return { file, applied: false, reason: "unsupported" };
  // Capability is present and we're on Wi-Fi — the encoder pass plugs in here.
  return { file, applied: false, reason: "encoder-not-enabled" };
}
