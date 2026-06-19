"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, BadgeCheck, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import type { ScoutTalent } from "@/lib/api/types";
import { SCORE_META, scoreTone } from "./score-meta";
import { TalentDetail } from "./talent-detail";

const num = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

const CAMPUSES = ["UNILAG", "UI Ibadan", "ABU Zaria", "OAU", "UNN"];
const GENRES = ["Afrobeats", "Rap", "Gospel", "R&B", "Amapiano"];
const MIN_SCORES = [0, 60, 70, 80, 90];

function toCsv(rows: ScoutTalent[]): string {
  const header = [
    "handle",
    "name",
    "campus",
    "genre",
    "followers",
    "overall",
    ...SCORE_META.map((m) => m.key),
  ];
  const body = rows.map((r) =>
    [
      r.handle,
      r.displayName,
      r.campus,
      r.genre,
      r.followers,
      r.overall,
      ...SCORE_META.map((m) => Math.round(r.scores[m.key])),
    ].join(","),
  );
  return [header.join(","), ...body].join("\n");
}

export function ScoutDashboard() {
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [campus, setCampus] = React.useState("");
  const [genre, setGenre] = React.useState("");
  const [minOverall, setMinOverall] = React.useState(0);
  const [openHandle, setOpenHandle] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const params = { q: debounced, campus, genre, minOverall };
  const { data: talents, status } = useQuery({
    queryKey: ["scout", params],
    queryFn: ({ signal }) => api.scout.search(params, signal),
  });

  const exportCsv = () => {
    if (!talents?.length) return;
    const blob = new Blob([toCsv(talents)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demo-talent-shortlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectCls =
    "h-10 rounded-md border border-line bg-surface px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Talent Intelligence</h1>
      <p className="text-muted mt-1 text-sm">
        Search, filter, and shortlist emerging talent. Scores are explainable composites, refreshed
        weekly.
      </p>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="border-line bg-surface focus-within:border-line-strong flex h-10 min-w-[12rem] flex-1 items-center gap-2 rounded-md border px-3">
          <Search className="text-subtle h-4 w-4 shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or handle…"
            aria-label="Search talent"
            className="h-full flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <label className="sr-only" htmlFor="f-campus">
          Campus
        </label>
        <select
          id="f-campus"
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
          className={selectCls}
        >
          <option value="">All campuses</option>
          {CAMPUSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-genre">
          Genre
        </label>
        <select
          id="f-genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className={selectCls}
        >
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-score">
          Minimum score
        </label>
        <select
          id="f-score"
          value={minOverall}
          onChange={(e) => setMinOverall(Number(e.target.value))}
          className={selectCls}
        >
          {MIN_SCORES.map((m) => (
            <option key={m} value={m}>
              {m === 0 ? "Any score" : `${m}+`}
            </option>
          ))}
        </select>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-muted flex items-center gap-1.5 text-sm">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {talents?.length ?? 0} result{(talents?.length ?? 0) === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!talents?.length}
          className="border-line hover:bg-elevated flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Results */}
      <div className="mt-3 space-y-2">
        {status === "pending" &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface h-24 animate-pulse rounded-lg" />
          ))}

        {status === "success" && talents?.length === 0 && (
          <p className="text-subtle py-12 text-center text-sm">No talent matches those filters.</p>
        )}

        {talents?.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOpenHandle(t.handle)}
            className="border-line bg-surface hover:border-line-strong block w-full rounded-lg border p-3 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-brand text-brand-fg grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold">
                {t.displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-semibold">
                  {t.displayName}
                  {t.verified && (
                    <BadgeCheck className="text-gold h-3.5 w-3.5" aria-label="Verified" />
                  )}
                  <span className="text-subtle ml-1 truncate text-xs font-normal">@{t.handle}</span>
                </p>
                <p className="text-subtle text-xs">
                  {t.genre} · {t.campus} · {num.format(t.followers)} followers
                </p>
              </div>
              <div className="text-right">
                <div className="text-brand text-2xl font-bold tabular-nums">{t.overall}</div>
                <div className="text-subtle text-2xs uppercase">Overall</div>
              </div>
            </div>

            {/* Composite mini-bars */}
            <div className="mt-3 grid grid-cols-5 gap-2">
              {SCORE_META.map((m) => {
                const v = Math.round(t.scores[m.key]);
                return (
                  <div key={m.key}>
                    <div className="text-subtle text-2xs flex justify-between">
                      <span>{m.short}</span>
                      <span className="tabular-nums">{v}</span>
                    </div>
                    <div className="bg-elevated mt-0.5 h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className={cn("h-full rounded-full", scoreTone(v))}
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </button>
        ))}
      </div>

      <TalentDetail
        handle={openHandle}
        open={openHandle !== null}
        onClose={() => setOpenHandle(null)}
      />
    </div>
  );
}
