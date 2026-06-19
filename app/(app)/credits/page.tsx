import { CreditsScreen } from "@/components/credits/credits-screen";

/**
 * Credits & Earnings. Live balances from the wallet endpoint; fan Credits (spendable, non-cashable)
 * and creator earnings (withdrawable) stay DISTINCT. Top-ups are webhook-confirmed — the balance
 * never moves optimistically (see TopUpSheet).
 */
export const metadata = { title: "Credits" };

export default function CreditsPage() {
  return <CreditsScreen />;
}
