"use client";

import * as React from "react";
import { DEFAULT_FLAGS, resolveFlags, type FlagKey, type Flags } from "./flags";

/**
 * Feature flags for staged rollout (premium, marketplace, multi-campus, …).
 *
 * The provider is seeded with defaults and can be hydrated with server-provided overrides (e.g. from
 * a flag service keyed on the user/campus). `useFlag` is a type-safe read — an unknown key is a
 * compile error, never a silent `false`. Gating here is presentation only; the server still enforces
 * access to flagged features.
 */
const FlagsContext = React.createContext<Flags>(DEFAULT_FLAGS);

export function FlagsProvider({
  overrides,
  children,
}: {
  overrides?: Partial<Flags>;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => resolveFlags(overrides), [overrides]);
  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlags(): Flags {
  return React.useContext(FlagsContext);
}

export function useFlag(key: FlagKey): boolean {
  return React.useContext(FlagsContext)[key];
}
