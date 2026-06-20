import { TreasuryConsole } from "@/components/admin/treasury-console";

/**
 * Treasury & Risk console (staff-only). The money-integrity counterpart to the moderation queue:
 * a server-truth platform ledger plus explainable fraud signals with freeze/clear/escalate actions.
 * Server enforces staff SSO + role; this is presentation + read/act over the contract.
 */
export const metadata = { title: "Treasury & Risk" };

export default function TreasuryPage() {
  return <TreasuryConsole />;
}
