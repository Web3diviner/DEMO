import type { NextConfig } from "next";

/**
 * Security headers — default-deny posture.
 *
 * CSP allows: self, the media CDN, and Paystack (payments). Everything else is denied.
 * Override origins via env when the CDN/API domains are final.
 *
 * `'unsafe-inline'` for styles is required by Tailwind's runtime injection and Next's streaming
 * style insertion; tighten scripts with a server-issued nonce once the backend exists. Paystack
 * Inline injects a script + checkout iframe, hence its explicit origins.
 */
const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_ORIGIN ?? "https://cdn.demo.example";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://api.demo.example";

const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `img-src 'self' data: blob: ${MEDIA_CDN}`,
  `media-src 'self' blob: ${MEDIA_CDN}`,
  `font-src 'self' data:`,
  `style-src 'self' 'unsafe-inline'`,
  `script-src 'self' 'unsafe-inline' https://js.paystack.co`,
  `frame-src https://checkout.paystack.com https://*.paystack.co`,
  `connect-src 'self' ${API_ORIGIN} ${MEDIA_CDN} https://api.paystack.co`,
  `worker-src 'self'`,
  `manifest-src 'self'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(self), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must revalidate so it can never pin a stale shell.
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
