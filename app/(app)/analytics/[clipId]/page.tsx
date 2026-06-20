import { ClipAnalyticsScreen } from "@/components/analytics/clip-analytics-screen";

export const metadata = { title: "Clip insights" };

export default async function ClipAnalyticsPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const { clipId } = await params;
  return <ClipAnalyticsScreen clipId={clipId} />;
}
