import { DemoIdScreen } from "@/components/identity/demo-id-screen";

/**
 * DEMO ID — the invisible custodial wallet surfaced as plain-language ownership (PRD §8.1).
 * No seed phrase, no gas: just the credentials, badges and passes the user truly owns.
 */
export const metadata = { title: "DEMO ID" };

export default function DemoIdPage() {
  return <DemoIdScreen />;
}
