import { DmsList } from "@/components/dms/dms-list";

/** Direct messages (PRD §11 — basic DMs). Conversation list; threads live at /dms/[id]. */
export const metadata = { title: "Messages" };

export default function DmsPage() {
  return <DmsList />;
}
