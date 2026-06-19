import { Search } from "lucide-react";

/**
 * Scout dashboard — placeholder for Talent Intelligence (search / filter / export). Built against
 * the enterprise contract once the searchable schema + privacy boundary are confirmed.
 */
export const metadata = { title: "Scout" };

export default function ScoutPage() {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Search className="h-5 w-5" aria-hidden /> Talent Intelligence
      </h1>
      <p className="text-muted mt-2 text-sm">
        Search and filter campus talent; export shortlists. Enterprise access only.
      </p>
    </div>
  );
}
