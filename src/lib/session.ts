import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

/** True if the user is a moderator (legacy flag or role). */
export async function isModerator(userId: string): Promise<boolean> {
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { isModerator: true, role: true },
  });
  return Boolean(me && (me.isModerator || me.role === "MODERATOR"));
}

/**
 * Guard for moderator-only pages (e.g. /funnel): requires a signed-in user
 * who is a moderator, otherwise 404s so the route is indistinguishable from
 * a non-existent page for regular users.
 */
export async function requireModerator(): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await isModerator(user.id))) notFound();
  return user;
}
