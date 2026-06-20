import { TalentHub } from "@/components/profile/talent-hub";

/**
 * Talent Hub — the signed-in creator's own profile. The handle comes from the session in
 * production; the mock resolves a demo creator. A public `/u/[handle]` view reuses <TalentHub />.
 */
export const metadata = { title: "Talent Hub" };

export default function ProfilePage() {
  return <TalentHub handle="ada.beats" editable />;
}
