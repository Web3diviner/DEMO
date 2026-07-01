"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Hash, BadgeCheck, TrendingUp, Play } from "lucide-react";
import { api } from "@/lib/api/client";
import { track } from "@/lib/analytics";

const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

export function SearchScreen() {
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  // Debounce input so we don't fire a request per keystroke on metered data.
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  React.useEffect(() => {
    if (debounced) track({ type: "route_view", path: `/search?q=${debounced}` });
  }, [debounced]);

  const { data: trends } = useQuery({
    queryKey: ["trends"],
    queryFn: ({ signal }) => api.search.trends(signal),
    enabled: debounced.length === 0,
  });

  const { data: results, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: ({ signal }) => api.search.query(debounced, signal),
    enabled: debounced.length > 0,
  });

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      {/* Search box */}
      <div className="border-line bg-surface focus-within:border-line-strong rounded-pill flex h-11 items-center gap-2 border px-4">
        <Search className="text-subtle h-4 w-4 shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search creators, hashtags…"
          aria-label="Search"
          autoFocus
          className="h-full flex-1 bg-transparent text-sm outline-none"
        />
        {q && (
          <button type="button" aria-label="Clear" onClick={() => setQ("")} className="text-subtle">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Empty state: trending hashtags */}
      {debounced.length === 0 && (
        <section className="mt-6">
          <h2 className="text-muted mb-2 flex items-center gap-1.5 text-sm font-medium">
            <TrendingUp className="h-4 w-4" aria-hidden /> Trending now
          </h2>
          <ul className="divide-line divide-y">
            {trends?.map((t) => (
              <li key={t.tag}>
                <button
                  type="button"
                  onClick={() => setQ(`#${t.tag}`)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span className="bg-elevated text-muted grid h-10 w-10 shrink-0 place-items-center rounded-full">
                    <Hash className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">#{t.tag}</span>
                    <span className="text-subtle text-xs">{compact.format(t.posts)} posts</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Results */}
      {debounced.length > 0 && (
        <div className="mt-5 space-y-6">
          {isFetching && !results && (
            <p className="text-subtle py-8 text-center text-sm">Searching…</p>
          )}

          {results &&
            results.creators.length === 0 &&
            results.hashtags.length === 0 &&
            results.clips.length === 0 && (
              <p className="text-subtle py-8 text-center text-sm">No results for “{debounced}”.</p>
            )}

          {results && results.creators.length > 0 && (
            <section>
              <h2 className="text-muted mb-2 text-sm font-medium">Creators</h2>
              <ul className="divide-line divide-y">
                {results.creators.map((c) => (
                  <li key={c.id}>
                    <Link href={`/u/${c.handle}`} className="flex items-center gap-3 py-2.5">
                      <span className="bg-brand text-brand-fg grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold">
                        {c.displayName.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 font-semibold">
                          @{c.handle}
                          {c.verified && (
                            <BadgeCheck className="text-gold h-3.5 w-3.5" aria-label="Verified" />
                          )}
                        </span>
                        {c.campus && <span className="text-subtle block text-xs">{c.campus}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results && results.hashtags.length > 0 && (
            <section>
              <h2 className="text-muted mb-2 text-sm font-medium">Hashtags</h2>
              <ul className="divide-line divide-y">
                {results.hashtags.map((t) => (
                  <li key={t.tag}>
                    <button
                      type="button"
                      onClick={() => setQ(`#${t.tag}`)}
                      className="flex w-full items-center gap-3 py-2.5 text-left"
                    >
                      <Hash className="text-muted h-5 w-5" aria-hidden />
                      <span>
                        <span className="block font-semibold">#{t.tag}</span>
                        <span className="text-subtle text-xs">{compact.format(t.posts)} posts</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results && results.clips.length > 0 && (
            <section>
              <h2 className="text-muted mb-2 text-sm font-medium">Clips</h2>
              <ul className="grid grid-cols-3 gap-1">
                {results.clips.map((clip) => (
                  <li
                    key={clip.id}
                    className="bg-surface relative aspect-[9/12] overflow-hidden rounded-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={clip.posterUrl} alt="" className="h-full w-full object-cover" />
                    <span className="text-2xs absolute bottom-1 left-1 flex items-center gap-0.5 font-semibold text-white drop-shadow">
                      <Play className="h-3 w-3 fill-white" aria-hidden />{" "}
                      {compact.format(clip.plays)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
