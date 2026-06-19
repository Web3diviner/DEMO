import { WifiOff } from "lucide-react";

/** Offline shell — served by the service worker when a navigation fails. Intentionally tiny. */
export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main id="main" className="min-h-dscreen grid place-items-center px-8 text-center">
      <div>
        <WifiOff className="text-muted mx-auto h-10 w-10" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">You&apos;re offline</h1>
        <p className="text-muted mt-2 text-sm">
          Your likes and follows are saved and will sync the moment you&apos;re back online.
        </p>
      </div>
    </main>
  );
}
