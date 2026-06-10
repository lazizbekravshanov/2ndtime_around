"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { onboardingSchema } from "@/lib/validation";

export type OnboardingResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function completeOnboarding(
  input: unknown
): Promise<OnboardingResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName,
      major: parsed.data.major || null,
      year: parsed.data.year ?? null,
    },
  });

  return { ok: true };
}
