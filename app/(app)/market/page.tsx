import { MarketScreen } from "@/components/market/market-screen";

/**
 * Marketplace (PRD §6.7) — beats, songs, tickets, merch, services. Gated behind the `marketplace`
 * feature flag for staged rollout. Purchases spend Credits (server-truth); digital delivers on
 * confirm, physical collects fulfilment details.
 */
export const metadata = { title: "Marketplace" };

export default function MarketPage() {
  return <MarketScreen />;
}
