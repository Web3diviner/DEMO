"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Trophy, Sparkles, Check, ShieldCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { format, gte } from "@/lib/money";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";
import type { BattleContestant, VoteResult, Wallet } from "@/lib/api/types";

export function BattleVote({ id }: { id: string }) {
  const qc = useQueryClient();

  const { data: battle, status } = useQuery({
    queryKey: ["battle", id],
    queryFn: ({ signal }) => api.battles.get(id, signal),
  });
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: ({ signal }) => api.wallet.get(signal),
  });

  const vote = useMutation({
    mutationFn: (contestantId: string) => api.battles.vote(id, contestantId),
    onSuccess: (res: VoteResult) => {
      // Server-truth updates: battle tallies AND wallet balance both come back confirmed.
      qc.setQueryData(["battle", id], res.battle);
      qc.setQueryData<Wallet>(["wallet"], res.wallet);
      qc.invalidateQueries({ queryKey: ["battles"] });
    },
  });

  const countdown = useCountdown(battle?.endsAt ?? null);

  if (status === "pending") {
    return (
      <div className="h-dscreen grid place-items-center">
        <Loader2 className="text-muted h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }
  if (status === "error" || !battle) {
    return <div className="text-muted h-dscreen grid place-items-center">Battle unavailable.</div>;
  }

  const total = battle.contestants.reduce((s, c) => s + c.votes, 0) || 1;
  const voted = battle.viewer.votedContestantId;
  const isVoting = battle.state === "voting" && !(countdown?.ended ?? false);
  const canAfford = wallet ? gte(wallet.credits, battle.voteCost) : true;

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/battles" aria-label="Back to battles" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-lg font-semibold">{battle.title}</h1>
      </div>

      {/* Status row */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-subtle flex items-center gap-1">
          <Sparkles className="h-4 w-4" aria-hidden /> {format(battle.prizePool)} pool
        </span>
        {isVoting && countdown ? (
          <span className="text-live flex items-center gap-1 font-semibold tabular-nums">
            <Clock className="h-4 w-4" aria-hidden /> {countdown.label} left
          </span>
        ) : battle.state === "settled" ? (
          <span className="text-gold flex items-center gap-1 font-medium">
            <Trophy className="h-4 w-4" aria-hidden /> Final result
          </span>
        ) : (
          <span className="text-muted font-medium">Voting opens soon</span>
        )}
      </div>

      {/* Contestants */}
      <div className="mt-4 space-y-3">
        {battle.contestants.map((c) => {
          const pct = Math.round((c.votes / total) * 100);
          const isWinner = battle.winnerContestantId === c.id;
          const isBacked = voted === c.id;
          return (
            <Contestant
              key={c.id}
              contestant={c}
              pct={pct}
              isWinner={isWinner}
              isBacked={isBacked}
              disabled={!isVoting || !!voted || vote.isPending || !canAfford}
              pending={vote.isPending && vote.variables === c.id}
              onVote={() => {
                track({ type: "route_view", path: `/battles/${id}:vote` });
                vote.mutate(c.id);
              }}
            />
          );
        })}
      </div>

      {/* Footer: voting affordances / state messaging */}
      <div className="mt-4">
        {isVoting && !voted && (
          <div className="border-line bg-surface flex items-center justify-between rounded-lg border p-3 text-sm">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="text-gold h-4 w-4" aria-hidden />
              Your verified vote counts{" "}
              <strong className="mx-1">{battle.viewer.voteWeight}×</strong>
            </span>
            <span className="text-subtle">{format(battle.voteCost)}/vote</span>
          </div>
        )}
        {isVoting && !voted && !canAfford && (
          <Link
            href="/credits"
            className="rounded-pill bg-brand text-brand-fg mt-3 flex h-11 items-center justify-center font-medium"
          >
            Top up to vote
          </Link>
        )}
        {voted && (
          <p className="text-success mt-1 flex items-center justify-center gap-1.5 text-sm font-medium">
            <Check className="h-4 w-4" aria-hidden /> Vote counted — good luck to your pick!
          </p>
        )}
        {vote.isError && (
          <p className="text-danger mt-2 text-center text-sm" role="alert">
            {vote.error instanceof Error ? vote.error.message : "Couldn't record your vote."}
          </p>
        )}
        {wallet && (
          <p className="text-subtle mt-3 text-center text-xs">Balance: {format(wallet.credits)}</p>
        )}
      </div>
    </main>
  );
}

function Contestant({
  contestant,
  pct,
  isWinner,
  isBacked,
  disabled,
  pending,
  onVote,
}: {
  contestant: BattleContestant;
  pct: number;
  isWinner: boolean;
  isBacked: boolean;
  disabled: boolean;
  pending: boolean;
  onVote: () => void;
}) {
  const { creator } = contestant;
  return (
    <div
      className={cn(
        "border-line bg-surface relative overflow-hidden rounded-lg border",
        isWinner && "border-gold",
        isBacked && "border-brand",
      )}
    >
      {/* Share-of-vote fill */}
      <div
        className="bg-brand/10 absolute inset-y-0 left-0 transition-[width] duration-[var(--dur-3)]"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="relative flex items-center gap-3 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={contestant.posterUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-semibold">
            <span className="truncate">@{creator.handle}</span>
            {isWinner && <Trophy className="text-gold h-4 w-4 shrink-0" aria-label="Winner" />}
          </p>
          <p className="text-subtle text-xs tabular-nums">
            {new Intl.NumberFormat("en-NG").format(contestant.votes)} votes · {pct}%
          </p>
        </div>
        <button
          type="button"
          onClick={onVote}
          disabled={disabled}
          className={cn(
            "rounded-pill h-9 shrink-0 px-4 text-sm font-semibold transition-colors",
            isBacked
              ? "bg-brand/15 text-brand"
              : "bg-brand text-brand-fg disabled:bg-elevated disabled:text-subtle",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : isBacked ? (
            "Backed"
          ) : (
            "Vote"
          )}
        </button>
      </div>
    </div>
  );
}
