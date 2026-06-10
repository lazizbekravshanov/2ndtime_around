import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
};

/** Returns the signed-in user or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
  };
}

/**
 * Auth guard for protected pages: redirects anonymous visitors to /signin
 * and first-time users (no display name yet) to /onboarding.
 */
export async function requireUser(opts?: {
  allowUnonboarded?: boolean;
}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  if (!user.displayName && !opts?.allowUnonboarded) redirect("/onboarding");
  return user;
}
