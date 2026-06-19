import { AmbassadorScreen } from "@/components/ambassador/ambassador-screen";

/**
 * Campus ambassador (PRD §6.10). Referral tools + gamified rewards; payout is tied to verified
 * activity (not raw sign-ups), and referrals are de-duplicated server-side.
 */
export const metadata = { title: "Ambassador" };

export default function AmbassadorPage() {
  return <AmbassadorScreen />;
}
