/**
 * Connection awareness — the backbone of DEMO's data discipline.
 *
 * The audience pays for every megabyte on mobile data. We:
 *   - cap video quality on cellular (≤480p) vs Wi-Fi (≤720p),
 *   - prefetch upcoming clips ONLY on Wi-Fi,
 *   - honor the user's explicit Save-Data signal and our own data-saver toggle.
 *
 * `navigator.connection` is non-standard and absent on iOS Safari, so every read is defensive and
 * degrades to the *safe* (data-saving) assumption when unknown.
 */

export type EffectiveType = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

export type ConnectionState = {
  /** True when we believe the user is on a metered/cellular link (or it's unknown). */
  cellular: boolean;
  /** Browser/user Save-Data signal is on. */
  saveData: boolean;
  effectiveType: EffectiveType;
  /** Downlink estimate in Mbps, if reported. */
  downlinkMbps: number | null;
};

type NetworkInformation = {
  effectiveType?: EffectiveType;
  saveData?: boolean;
  downlink?: number;
  type?: string; // "wifi" | "cellular" | ...
  addEventListener?: (t: string, cb: () => void) => void;
  removeEventListener?: (t: string, cb: () => void) => void;
};

function nav(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformation }).connection ?? undefined;
}

export function readConnection(): ConnectionState {
  const c = nav();
  const effectiveType = (c?.effectiveType ?? "unknown") as EffectiveType;
  // Treat anything below 4g, an explicit cellular type, or unknown as "assume cellular".
  const knownWifi = c?.type === "wifi" || c?.type === "ethernet";
  const cellular =
    !knownWifi && (c?.type === "cellular" || effectiveType !== "4g" || c?.type === undefined);
  return {
    cellular: c ? cellular : true, // unknown → safe assumption: data is precious
    saveData: Boolean(c?.saveData),
    effectiveType,
    downlinkMbps: typeof c?.downlink === "number" ? c.downlink : null,
  };
}

export function subscribeConnection(cb: (s: ConnectionState) => void): () => void {
  const c = nav();
  const handler = () => cb(readConnection());
  c?.addEventListener?.("change", handler);
  return () => c?.removeEventListener?.("change", handler);
}

/** Resolved data policy given the live connection and the user's manual toggle. */
export type DataPolicy = {
  /** Max video height we are allowed to request. */
  maxHeight: 480 | 720;
  /** Whether we may prefetch the next clip(s). */
  prefetch: boolean;
  /** Whether autoplay should remain muted-only (always true on cellular to avoid surprise data). */
  dataSaver: boolean;
};

export function resolveDataPolicy(conn: ConnectionState, manualDataSaver: boolean): DataPolicy {
  const saver = manualDataSaver || conn.saveData || conn.cellular;
  return {
    maxHeight: saver ? 480 : 720,
    prefetch: !saver, // only on (unmetered) Wi-Fi
    dataSaver: saver,
  };
}
