import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Where the home-screen app opens: signed-in people land in their own app,
// everyone else on the website.
export default async function AppEntry() {
  const viewer = await getViewer();
  redirect(viewer ? homeFor(viewer.profile.role) : "/");
}
