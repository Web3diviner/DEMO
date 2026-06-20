/**
 * HeroMusician — a brand-aligned vector portrait of a campus musician mid-performance.
 *
 * Why an inline SVG instead of a photo: the product promise is "light on your data," and the
 * landing must paint instantly on a cold cellular connection. A hand-built illustration ships as
 * static markup (no extra request, no layout shift, no licensing), scales crisply on every screen,
 * and inherits the Skylora green/gold spotlight identity. Server-safe (no hooks).
 */
export function HeroMusician({
  size = 240,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 320 320"
      className={className}
      role="img"
      aria-label="A campus musician singing into a microphone under a spotlight"
    >
      <defs>
        <linearGradient id="hm-disc" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#27B074" />
          <stop offset="1" stopColor="#10654A" />
        </linearGradient>
        <linearGradient id="hm-skin" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#B97C4E" />
          <stop offset="1" stopColor="#8A5736" />
        </linearGradient>
        <linearGradient id="hm-hair" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#2A1E14" />
          <stop offset="1" stopColor="#0E0A07" />
        </linearGradient>
        <linearGradient id="hm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE0A0" />
          <stop offset="1" stopColor="#E7A52E" />
        </linearGradient>
        <linearGradient id="hm-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#23A56C" />
          <stop offset="1" stopColor="#15784E" />
        </linearGradient>
        <linearGradient id="hm-mic" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6E6E78" />
          <stop offset="1" stopColor="#2A2A30" />
        </linearGradient>
        <radialGradient id="hm-glow" cx="0.5" cy="0.28" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <clipPath id="hm-clip">
          <circle cx="160" cy="160" r="150" />
        </clipPath>
      </defs>

      {/* Brand disc */}
      <circle cx="160" cy="160" r="150" fill="url(#hm-disc)" />

      <g clipPath="url(#hm-clip)">
        {/* Spotlight beam from above */}
        <polygon points="160,28 78,300 242,300" fill="url(#hm-glow)" />
        <circle cx="160" cy="120" r="160" fill="url(#hm-glow)" />

        {/* Hair — gold rim-light behind a dark afro */}
        <g>
          <circle cx="158" cy="150" r="124" fill="#C9912E" opacity="0.45" />
          <circle cx="84" cy="126" r="58" fill="#C9912E" opacity="0.4" />
          <circle cx="236" cy="126" r="58" fill="#C9912E" opacity="0.4" />
          <circle cx="160" cy="150" r="118" fill="url(#hm-hair)" />
          <circle cx="86" cy="128" r="56" fill="url(#hm-hair)" />
          <circle cx="234" cy="128" r="56" fill="url(#hm-hair)" />
          <circle cx="70" cy="206" r="50" fill="url(#hm-hair)" />
          <circle cx="250" cy="206" r="50" fill="url(#hm-hair)" />
        </g>

        {/* Garment — off-shoulder top in brand green */}
        <path
          d="M28 322 Q56 268 120 262 Q160 256 200 262 Q264 268 292 322 Z"
          fill="url(#hm-top)"
        />
        <path
          d="M120 264 Q160 258 200 264 Q196 276 160 278 Q124 276 120 264 Z"
          fill="url(#hm-gold)"
          opacity="0.85"
        />

        {/* Neck */}
        <path d="M138 222 Q140 250 138 264 L182 264 Q180 250 182 222 Z" fill="#9A6440" />

        {/* Face */}
        <path
          d="M160 92
             C206 92 224 128 224 166
             C224 206 198 240 160 240
             C122 240 96 206 96 166
             C96 128 114 92 160 92 Z"
          fill="url(#hm-skin)"
        />

        {/* Forehead hairline + side locks framing the face */}
        <path d="M92 132 Q160 78 228 132 Q200 120 160 120 Q120 120 92 132 Z" fill="url(#hm-hair)" />
        <ellipse cx="100" cy="178" rx="22" ry="74" fill="url(#hm-hair)" />
        <ellipse cx="220" cy="178" rx="22" ry="74" fill="url(#hm-hair)" />

        {/* Cheek light */}
        <ellipse cx="130" cy="188" rx="16" ry="11" fill="#FFFFFF" opacity="0.07" />
        <ellipse cx="190" cy="188" rx="16" ry="11" fill="#FFFFFF" opacity="0.07" />

        {/* Brows */}
        <path d="M118 150 Q133 142 148 149" stroke="#2A1B11" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M202 149 Q187 142 172 150" stroke="#2A1B11" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* Eyes — closed, serene, mid-note */}
        <path d="M116 166 Q132 178 148 166" stroke="#23150C" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M148 166 l7 -3" stroke="#23150C" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M204 166 Q188 178 172 166" stroke="#23150C" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M172 166 l-7 -3" stroke="#23150C" strokeWidth="3.5" fill="none" strokeLinecap="round" />

        {/* Nose hint */}
        <path d="M155 196 Q160 200 166 195" stroke="#75492C" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Lips — parted, singing */}
        <path d="M140 208 Q160 200 180 208 Q160 212 140 208 Z" fill="#9B4B3F" />
        <path d="M145 214 Q160 226 175 214 Q160 218 145 214 Z" fill="#6E342B" />

        {/* Gold hoop earrings */}
        <circle cx="98" cy="206" r="9" fill="none" stroke="url(#hm-gold)" strokeWidth="4" />
        <circle cx="222" cy="206" r="9" fill="none" stroke="url(#hm-gold)" strokeWidth="4" />

        {/* Microphone — grille at the lips, body angling down */}
        <g>
          <rect x="150" y="266" width="20" height="62" rx="10" fill="url(#hm-gold)" />
          <rect x="148" y="258" width="24" height="12" rx="6" fill="#3A3A42" />
          <circle cx="160" cy="248" r="23" fill="url(#hm-mic)" />
          <g stroke="#9A9AA6" strokeWidth="1.5" opacity="0.55">
            <path d="M140 242 H180" />
            <path d="M140 250 H180" />
            <path d="M140 258 H180" />
            <path d="M152 230 V268" />
            <path d="M160 228 V270" />
            <path d="M168 230 V268" />
          </g>
          <ellipse cx="153" cy="241" rx="6" ry="9" fill="#FFFFFF" opacity="0.25" />
        </g>
      </g>

      {/* Sparkles — the Skylora spotlight motif */}
      <g fill="url(#hm-gold)">
        <path
          transform="translate(44 58) scale(0.085)"
          d="M256 116 C272 214 298 240 396 256 C298 272 272 298 256 396 C240 298 214 272 116 256 C214 240 240 214 256 116 Z"
        />
        <path
          transform="translate(250 80) scale(0.06)"
          d="M256 116 C272 214 298 240 396 256 C298 272 272 298 256 396 C240 298 214 272 116 256 C214 240 240 214 256 116 Z"
        />
        <path
          transform="translate(70 250) scale(0.045)"
          d="M256 116 C272 214 298 240 396 256 C298 272 272 298 256 396 C240 298 214 272 116 256 C214 240 240 214 256 116 Z"
        />
      </g>
    </svg>
  );
}
