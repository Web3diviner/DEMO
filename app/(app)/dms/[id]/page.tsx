import { DmThread } from "@/components/dms/dm-thread";

export const metadata = { title: "Chat" };

export default async function DmThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DmThread id={id} />;
}
