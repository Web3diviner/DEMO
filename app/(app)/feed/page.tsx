import dynamic from "next/dynamic";

/**
 * Feed route. The interactive scroller (and, transitively, hls.js) is dynamically imported so it
 * stays out of the initial/shared bundle and only loads on this route.
 */
const FeedScroller = dynamic(
  () => import("@/components/feed/feed-scroller").then((m) => m.FeedScroller),
  {
    loading: () => (
      <div className="h-dscreen grid place-items-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    ),
  },
);

export const metadata = { title: "Feed" };

export default function FeedPage() {
  return <FeedScroller />;
}
