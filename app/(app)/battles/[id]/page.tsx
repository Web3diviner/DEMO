import { BattleVote } from "@/components/battles/battle-vote";

export const metadata = { title: "Battle" };

export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BattleVote id={id} />;
}
