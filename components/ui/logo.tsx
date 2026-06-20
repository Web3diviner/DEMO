import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Skylora logo. The mark is a gold "light" star on the brand green — the spotlight that lifts
 * talent. Server-safe (no hooks) so it can render in any layout/page. Gradient ids are static and
 * identical across instances, which renders correctly in all browsers.
 */
export function LogoMark({
  size = 40,
  className,
  title = "Skylora",
  decorative = false,
}: {
  size?: number;
  className?: string;
  title?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
    >
      <defs>
        <linearGradient id="sl-bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#27B074" />
          <stop offset="1" stopColor="#168A5C" />
        </linearGradient>
        <linearGradient id="sl-star" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE0A0" />
          <stop offset="1" stopColor="#E7A52E" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#sl-bg)" />
      <path
        d="M256 116 C272 214 298 240 396 256 C298 272 272 298 256 396 C240 298 214 272 116 256 C214 240 240 214 256 116 Z"
        fill="url(#sl-star)"
      />
      <circle cx="214" cy="208" r="13" fill="#FFFFFF" opacity="0.5" />
    </svg>
  );
}

/** Horizontal lockup: mark + "Skylora" wordmark ("Sky" in foreground, "lora" in gold). */
export function Wordmark({
  markSize = 28,
  className,
}: {
  markSize?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}
      aria-label="Skylora"
    >
      <LogoMark size={markSize} decorative />
      <span aria-hidden>
        <span className="text-fg">Sky</span>
        <span className="text-gold">lora</span>
      </span>
    </span>
  );
}
