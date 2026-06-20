import { CreatorRegister } from "@/components/creator/creator-register";

/**
 * Creator verification ($1, PRD §7.3). Pay via Paystack Inline → the badge appears only AFTER the
 * backend confirms the gas-sponsored mint (never optimistically, never on an on-chain read). The
 * interactive flow lives in the client component.
 */
export const metadata = { title: "Get verified" };

export default function CreatorRegisterPage() {
  return <CreatorRegister />;
}
