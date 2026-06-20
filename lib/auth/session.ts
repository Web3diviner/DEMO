"use client";

import * as React from "react";
import type { SessionUser } from "@/lib/api/types";

/**
 * Client session — the off-chain source of truth for who's signed in and their KYC tier (PRD
 * §9.3). Persisted in localStorage so it survives reloads (the mock backend is in-memory). A real
 * deployment swaps this for an httpOnly session cookie + /v1/session; the hook surface stays.
 *
 * For the demo, an unset session defaults to a signed-in user so every screen is reachable without
 * forcing onboarding first; signing out writes an explicit "guest" marker.
 */
export type { SessionUser };

const KEY = "skylora.session";

const DEMO_USER: SessionUser = {
  handle: "ada.beats",
  displayName: "Ada",
  campus: "UNILAG",
  kycTier: 2,
  // Not yet a verified creator, so the $1 verification flow stays demonstrable. (A creator's public
  // verified badge comes from the profile API, independent of this session flag.)
  verifiedCreator: false,
  verifiedFan: false,
};

export type SessionState =
  | { status: "authed"; user: SessionUser }
  | { status: "guest"; user: null };

const SERVER_SNAPSHOT: SessionState = { status: "authed", user: DEMO_USER };

// useSyncExternalStore requires a stable snapshot reference between unchanged reads, so cache the
// parsed state and only recompute when the persisted raw value actually changes.
let cachedRaw: string | null | undefined;
let cached: SessionState = SERVER_SNAPSHOT;

function compute(raw: string | null): SessionState {
  if (raw === "guest") return { status: "guest", user: null };
  if (raw) {
    try {
      return { status: "authed", user: JSON.parse(raw) as SessionUser };
    } catch {
      /* fall through to default */
    }
  }
  return { status: "authed", user: DEMO_USER };
}

function read(): SessionState {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = compute(raw);
  }
  return cached;
}

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function signIn(user: SessionUser) {
  window.localStorage.setItem(KEY, JSON.stringify(user));
  emit();
}

export function signOut() {
  window.localStorage.setItem(KEY, "guest");
  emit();
}

/** Patch the current user (e.g. lift the KYC tier after BVN verification). */
export function patchSession(patch: Partial<SessionUser>) {
  const s = read();
  if (s.status === "authed") signIn({ ...s.user, ...patch });
}

export function useSession(): SessionState {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === KEY && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    read,
    () => SERVER_SNAPSHOT,
  );
}

export const KYC_LABEL: Record<number, string> = {
  0: "Guest",
  1: "Phone verified",
  2: "Identity verified",
  3: "Fully verified",
};
