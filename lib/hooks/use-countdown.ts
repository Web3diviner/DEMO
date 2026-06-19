"use client";

import * as React from "react";

/** Live countdown to an ISO deadline. Ticks each second; returns null when there's no deadline. */
export function useCountdown(endsAt: string | null): {
  label: string;
  ended: boolean;
} | null {
  const target = React.useMemo(() => (endsAt ? new Date(endsAt).getTime() : null), [endsAt]);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (target == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (target == null) return null;
  const ms = Math.max(0, target - now);
  const ended = ms === 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  return { label, ended };
}
