"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { ratingSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/listings";

/**
 * Rate the other party after a completed exchange. Allowed only when:
 * the listing is SOLD/RESOLVED, a conversation links the two users to it,
 * and this user hasn't already rated this listing (DB-enforced too).
 */
export async function submitRating(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rating." };
  }
  const { listingId, toUserId, stars, comment } = parsed.data;

  if (toUserId === user.id) {
    return { ok: false, error: "You can't rate yourself." };
  }

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || !["SOLD", "RESOLVED"].includes(listing.status)) {
    return { ok: false, error: "Ratings open once the exchange is completed." };
  }

  // Both raters must actually be the two sides of a conversation on this
  // listing — owner on one side, a thread starter on the other.
  const pairIsValid =
    (listing.ownerId === toUserId &&
      (await db.conversation.findUnique({
        where: { listingId_starterId: { listingId, starterId: user.id } },
      }))) ||
    (listing.ownerId === user.id &&
      (await db.conversation.findUnique({
        where: { listingId_starterId: { listingId, starterId: toUserId } },
      })));
  if (!pairIsValid) {
    return { ok: false, error: "You can only rate someone you exchanged with." };
  }

  try {
    await db.rating.create({
      data: {
        fromUserId: user.id,
        toUserId,
        listingId,
        stars,
        comment: comment || null,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "You already rated this exchange." };
    }
    throw err;
  }

  revalidatePath(`/profile/${toUserId}`);
  return { ok: true };
}
