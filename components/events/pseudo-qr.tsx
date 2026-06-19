import * as React from "react";

/**
 * A QR-like visual rendered from a code string — pure SVG, no dependency. It is decorative (a real
 * scannable code comes from the backend), but it reads convincingly as a ticket QR: corner finder
 * patterns + a deterministic module pattern derived from the code.
 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function PseudoQR({ code, size = 132 }: { code: string; size?: number }) {
  const N = 21;
  const cell = size / N;
  // The three corner finder origins (top-left, top-right, bottom-left).
  const finders = [
    [0, 0],
    [N - 7, 0],
    [0, N - 7],
  ];
  const finderModule = (x: number, y: number): boolean | null => {
    for (const [cx, cy] of finders) {
      if (x >= cx && x < cx + 7 && y >= cy && y < cy + 7) {
        const lx = x - cx;
        const ly = y - cy;
        const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6;
        const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
        return ring || core;
      }
    }
    return null; // not in a finder zone
  };

  const rects: React.ReactElement[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const f = finderModule(x, y);
      const on = f !== null ? f : (hash(`${code}:${x}:${y}`) & 7) > 3;
      if (on) {
        rects.push(
          <rect
            key={`${x}-${y}`}
            x={x * cell}
            y={y * cell}
            width={cell}
            height={cell}
            rx={cell * 0.15}
          />,
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Ticket QR code"
      className="text-black"
    >
      <rect width={size} height={size} fill="white" rx={size * 0.06} />
      <g fill="currentColor">{rects}</g>
    </svg>
  );
}
