import { FanClubScreen } from "@/components/premium/fanclub-screen";

/**
 * Fan Club (PRD §6.6) — tiered recurring memberships, gated behind the `premium` flag. Recurring
 * Paystack billing; access is gated on the off-chain entitlement (mirrored as an expiring badge).
 */
export const metadata = { title: "Fan Club" };

export default async function FanClubPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <FanClubScreen handle={handle} />;
}
