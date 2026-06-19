import { SearchScreen } from "@/components/search/search-screen";

/** Search & hashtags (PRD §6.1). Debounced, data-frugal; trending hashtags when empty. */
export const metadata = { title: "Search" };

export default function SearchPage() {
  return <SearchScreen />;
}
