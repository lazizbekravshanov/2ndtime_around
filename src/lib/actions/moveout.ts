"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { moveoutBatchSchema } from "@/lib/validation";
import { matchSavedSearches } from "@/lib/savedSearchMatch";
import type { ActionResult } from "@/lib/actions/listings";

/**
 * Move-out mode: post many items at once under one shareable batch. "Free"
 * items become donations. Validated up front; committed all-or-nothing.
 */
export async function createMoveoutBatch(
  input: unknown
): Promise<ActionResult<{ batchId: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = moveoutBatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your items.",
    };
  }

  const batchId = crypto.randomUUID();
  const { items, locationNote } = parsed.data;

  const created = await db.$transaction(
    items.map((item) =>
      db.listing.create({
        data: {
          type: item.free ? "DONATE" : "SELL",
          title: item.title,
          description: item.free
            ? "Free — grab it before move-out."
            : "Selling as part of my move-out. Message me to grab it.",
          category: item.category,
          condition: item.condition ?? null,
          price: item.free ? null : (item.price ?? null),
          locationNote: locationNote ?? null,
          photos: item.photos,
          status: "ACTIVE",
          ownerId: user.id,
          moveoutBatchId: batchId,
        },
      })
    )
  );

  revalidatePath("/browse");
  for (const listing of created) void matchSavedSearches(listing);

  return { ok: true, data: { batchId } };
}
