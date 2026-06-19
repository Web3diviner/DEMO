import { TalentHub } from "@/components/profile/talent-hub";

/** Public Talent Hub for any creator, reusing the same component as the signed-in /profile. */
export const metadata = { title: "Profile" };

export default async function UserProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <TalentHub handle={handle} />;
}
