import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

// Defensive shortcut: /profile (no id) resolves to the signed-in user's own
// profile, or to sign-in if they're not logged in. Prevents a 404 from any
// bare /profile link.
export default async function ProfileIndex() {
  const user = await getSessionUser();
  redirect(user ? `/profile/${user.id}` : "/signin");
}
