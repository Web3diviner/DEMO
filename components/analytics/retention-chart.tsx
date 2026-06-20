import type { RetentionPoint } from "@/lib/api/types";

/**
 * Audience-retention curve — a dependency-free SVG area chart. The x-axis is position through the
 * clip (0–100%), the y-axis is the share still watching (0–1). Rendered as a filled area + line,
 * scaled via a viewBox so it's crisp at any width. Accessible via one summary label.
 */
export function RetentionChart({
  data,
  avgWatchPct,
}: {
  data: RetentionPoint[];
  avgWatchPct: number;
}) {
  const W = 320;
  const H = 120;
  const pad = 4;
  const x = (pct: number) => (pct / 100) * W;
  const y = (value: number) => pad + (1 - value) * (H - pad * 2);

  const line = data
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.pct).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-32 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Audience retention curve. Average ${Math.round(avgWatchPct * 100)} percent watched.`}
    >
      <path d={area} className="fill-brand/15" />
      <path
        d={line}
        className="stroke-brand fill-none"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
