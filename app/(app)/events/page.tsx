import { EventsScreen } from "@/components/events/events-screen";

/**
 * Events (PRD §6.8) — campus shows, concerts, competitions, awards, festivals. Ticketing now;
 * NFT tickets (provenance / anti-fraud / resale-royalty) are a later phase.
 */
export const metadata = { title: "Events" };

export default function EventsPage() {
  return <EventsScreen />;
}
