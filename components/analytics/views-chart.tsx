import type { AnalyticsPoint } from "@/lib/api/types";

const nfCompact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Views trend — a dependency-free SVG bar chart. Scales to the series max and stretches to the
 * container width via a viewBox, so it stays crisp at any size with zero JS on the client.
 * Accessible: one `role="img"` with a summary label (the bars themselves are decorative).
 */
export function ViewsChart({ series }: { series: AnalyticsPoint[] }) {
  const W = 320;
  const H = 120;
  const max = Math.max(1, ...series.map((p) => p.views));
  const n = series.length;
  const gap = n > 40 ? 1 : 2;
  const bw = (W - gap * (n - 1)) / n;
  const total = series.reduce((s, p) => s + p.views, 0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-32 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Daily views over the period, ${nfCompact.format(total)} total. Trend is rising.`}
    >
      {series.map((p, i) => {
        const h = Math.max(2, (p.views / max) * (H - 6));
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={H - h}
            width={bw}
            height={h}
            rx={n > 40 ? 0.5 : 1.5}
            className="fill-brand"
            opacity={0.55 + 0.45 * (i / n)}
          />
        );
      })}
    </svg>
  );
}
