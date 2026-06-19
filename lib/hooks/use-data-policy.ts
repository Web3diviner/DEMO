"use client";

import * as React from "react";
import {
  readConnection,
  resolveDataPolicy,
  subscribeConnection,
  type ConnectionState,
  type DataPolicy,
} from "@/lib/connection";

const TOGGLE_KEY = "demo.dataSaver.manual";
const SAFE_DEFAULT: ConnectionState = {
  cellular: true,
  saveData: false,
  effectiveType: "unknown",
  downlinkMbps: null,
};

/* ── Connection store ──────────────────────────────────────────────────────
   `useSyncExternalStore` is the right primitive for subscribing to a browser
   store (navigator.connection): no setState-in-effect, no hydration mismatch.
   Snapshots are cached so identical reads keep referential equality. */
let connSnapshot: ConnectionState = SAFE_DEFAULT;
function sameConn(a: ConnectionState, b: ConnectionState): boolean {
  return (
    a.cellular === b.cellular &&
    a.saveData === b.saveData &&
    a.effectiveType === b.effectiveType &&
    a.downlinkMbps === b.downlinkMbps
  );
}
function getConnSnapshot(): ConnectionState {
  const next = readConnection();
  if (!sameConn(connSnapshot, next)) connSnapshot = next;
  return connSnapshot;
}

/* ── Manual data-saver toggle store (localStorage-backed) ─────────────────── */
const toggleListeners = new Set<() => void>();
function getToggle(): boolean {
  try {
    return localStorage.getItem(TOGGLE_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeToggle(cb: () => void): () => void {
  toggleListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOGGLE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    toggleListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function setToggle(on: boolean): void {
  try {
    localStorage.setItem(TOGGLE_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
  toggleListeners.forEach((cb) => cb());
}

/**
 * Live data policy for the current connection + the user's manual Data-Saver toggle.
 * SSR-safe: server snapshots resolve to the *safe* (data-saving) assumption.
 */
export function useDataPolicy(): {
  policy: DataPolicy;
  connection: ConnectionState;
  manualDataSaver: boolean;
  setManualDataSaver: (on: boolean) => void;
} {
  const connection = React.useSyncExternalStore(
    subscribeConnection,
    getConnSnapshot,
    () => SAFE_DEFAULT,
  );
  const manual = React.useSyncExternalStore(subscribeToggle, getToggle, () => false);

  const policy = React.useMemo(() => resolveDataPolicy(connection, manual), [connection, manual]);

  return { policy, connection, manualDataSaver: manual, setManualDataSaver: setToggle };
}
