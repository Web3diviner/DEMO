import { NextResponse } from "next/server";

/**
 * Liveness/readiness probe for container orchestrators and load balancers.
 *
 * Kept dependency-free and uncached so a healthy reply always reflects this instance right now —
 * never a CDN/edge cache. Returns 200 with a tiny JSON body the platform can match on.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    { status: "ok", uptime: Math.round(process.uptime()) },
    { headers: { "cache-control": "no-store" } },
  );
}
