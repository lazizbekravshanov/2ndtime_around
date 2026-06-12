"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/listings";

/** Toggle a favorite on/off. Can't favorite your own listing. */
export async function toggleFavorite(
  listingId: string
): Promise<ActionResult<{ favorited: boolean }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true },
  });
  if (!listing) return { ok: false, error: "This listing no longer exists." };
  if (listing.ownerId === user.id) {
    return { ok: false, error: "You can't favorite your own listing." };
  }

  const existing = await db.favorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
    select: { id: true },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/saved");
    return { ok: true, data: { favorited: false } };
  }

  await db.favorite.create({ data: { userId: user.id, listingId } });
  revalidatePath("/saved");
  return { ok: true, data: { favorited: true } };
}

/** Listing ids the user has favorited, for hydrating the heart state. */
export async function favoritedListingIds(userId: string): Promise<Set<string>> {
  const rows = await db.favorite.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return new Set(rows.map((r) => r.listingId));
}
