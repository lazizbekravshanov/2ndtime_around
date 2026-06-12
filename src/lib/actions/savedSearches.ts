"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { CATEGORIES, LISTING_TYPES } from "@/lib/constants";
import type { ActionResult } from "@/lib/actions/listings";

const MAX_SAVED_SEARCHES = 20;

const savedSearchSchema = z.object({
  label: z.string().trim().min(1, "Give it a name.").max(60),
  q: z.string().trim().max(80).optional(),
  category: z.enum(CATEGORIES).optional(),
  type: z.enum(LISTING_TYPES).optional(),
  minPrice: z.number().min(0).max(10000).optional(),
  maxPrice: z.number().min(0).max(10000).optional(),
  notify: z.boolean().default(true),
});

export async function createSavedSearch(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = savedSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid search." };
  }

  const count = await db.savedSearch.count({ where: { userId: user.id } });
  if (count >= MAX_SAVED_SEARCHES) {
    return {
      ok: false,
      error: `You can save up to ${MAX_SAVED_SEARCHES} searches. Delete one to add another.`,
    };
  }

  const d = parsed.data;
  await db.savedSearch.create({
    data: {
      userId: user.id,
      label: d.label,
      q: d.q || null,
      category: d.category ?? null,
      type: d.type ?? null,
      minPrice: d.minPrice ?? null,
      maxPrice: d.maxPrice ?? null,
      notify: d.notify,
    },
  });
  revalidatePath("/saved");
  return { ok: true };
}

export async function deleteSavedSearch(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };
  // Owner-only: scope the delete to this user's rows.
  await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/saved");
  return { ok: true };
}

export async function toggleSavedSearchNotify(
  id: string
): Promise<ActionResult<{ notify: boolean }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const row = await db.savedSearch.findFirst({
    where: { id, userId: user.id },
    select: { id: true, notify: true },
  });
  if (!row) return { ok: false, error: "Saved search not found." };

  await db.savedSearch.update({
    where: { id: row.id },
    data: { notify: !row.notify },
  });
  revalidatePath("/saved");
  return { ok: true, data: { notify: !row.notify } };
}
