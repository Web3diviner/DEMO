import { ListingDetail } from "@/components/market/listing-detail";

export const metadata = { title: "Listing" };

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}
