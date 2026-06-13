"use server";

import { Prisma } from "@prisma/client";
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
    // deleteMany is idempotent — a concurrent double-tap that already removed
    // it won't throw P2025.
    await db.favorite.deleteMany({ where: { userId: user.id, listingId } });
    revalidatePath("/saved");
    return { ok: true, data: { favorited: false } };
  }

  try {
    await db.favorite.create({ data: { userId: user.id, listingId } });
  } catch (e) {
    // Two near-simultaneous taps both saw no row and both tried to create;
    // the unique constraint rejects the loser. It's already favorited — fine.
    if (
      !(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    ) {
      throw e;
    }
  }
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
