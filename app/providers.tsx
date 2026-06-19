"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureAnalytics } from "@/lib/analytics";

/**
 * Client providers: server-state cache + service-worker registration + analytics consent.
 * Retry/backoff defaults are tuned for flaky mobile networks.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 2,
            retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  React.useEffect(() => {
    // Register the offline shell / sync worker (no-op if unsupported).
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // TODO: gate on a real NDPR consent prompt; enabled here so the feature store receives events.
    configureAnalytics({ consented: true });
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
