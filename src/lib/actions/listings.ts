"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { listingSchema } from "@/lib/validation";
import { notify } from "@/lib/notify";
import { matchSavedSearches } from "@/lib/savedSearchMatch";
import { blockedUserIds } from "@/lib/actions/safety";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_LISTING_LIMIT = 10;

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createListing(
  input: unknown,
  asDraft = false
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  // Anti-spam: at most 10 self-serve listings per rolling 24h. Bulk move-out
  // posts go through createMoveoutBatch (tagged with moveoutBatchId) and are
  // intentionally excluded from this cap.
  const since = new Date(Date.now() - DAY_MS);
  const recent = await db.listing.findMany({
    where: {
      ownerId: user.id,
      moveoutBatchId: null,
      status: { not: "DELETED" },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (recent.length >= DAILY_LISTING_LIMIT) {
    const freesUpAt = recent[0].createdAt.getTime() + DAY_MS;
    const hours = Math.max(1, Math.ceil((freesUpAt - Date.now()) / (60 * 60 * 1000)));
    return {
      ok: false,
      error: `You've posted a lot today! You can post again in about ${hours} hour${hours === 1 ? "" : "s"}.`,
    };
  }

  const d = parsed.data;
  const listing = await db.listing.create({
    data: {
      type: d.type,
      title: d.title,
      description: d.description,
      category: d.category,
      condition: d.condition ?? null,
      // Price only ever applies to SELL listings; donations are free.
      price: d.type === "SELL" ? (d.price ?? null) : null,
      locationNote: d.locationNote ?? null,
      photos: d.photos,
      status: asDraft ? "DRAFT" : "ACTIVE",
      ownerId: user.id,
    },
  });

  revalidatePath("/browse");
  if (!asDraft) void matchSavedSearches(listing);
  return { ok: true, data: { id: listing.id } };
}

export async function updateListing(
  listingId: string,
  input: unknown,
  publish = false
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  // Owners only — verified server-side, never trusted from the client.
  const existing = await db.listing.findUnique({ where: { id: listingId } });
  if (!existing || existing.status === "DELETED") {
    return { ok: false, error: "This listing no longer exists." };
  }
  if (existing.ownerId !== user.id) {
    return { ok: false, error: "Only the owner can edit this listing." };
  }

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const d = parsed.data;
  const newPrice = existing.type === "SELL" ? (d.price ?? null) : null;
  const willPublish = publish && existing.status === "DRAFT";

  // Price drop: fire at most once per new low, only for already-active sales.
  const isDrop =
    existing.type === "SELL" &&
    existing.status === "ACTIVE" &&
    newPrice !== null &&
    existing.price !== null &&
    newPrice < existing.price &&
    newPrice < (existing.lastNotifiedPrice ?? Infinity);

  // Raising the price clears the "last notified" floor, so a later genuine
  // drop from the new higher price notifies again instead of being suppressed.
  const isIncrease =
    existing.type === "SELL" &&
    newPrice !== null &&
    existing.price !== null &&
    newPrice > existing.price;

  const updated = await db.listing.update({
    where: { id: listingId },
    data: {
      title: d.title,
      description: d.description,
      category: d.category,
      condition: d.condition ?? null,
      price: newPrice,
      locationNote: d.locationNote ?? null,
      photos: d.photos,
      ...(willPublish ? { status: "ACTIVE" } : {}),
      ...(isDrop
        ? { lastNotifiedPrice: newPrice }
        : isIncrease
          ? { lastNotifiedPrice: null }
          : {}),
    },
  });

  revalidatePath("/browse");
  revalidatePath(`/listing/${listingId}`);

  if (isDrop && newPrice !== null) {
    void notifyFavoriters(listingId, existing.ownerId, {
      kind: "PRICE_DROP",
      title: `Price drop: ${d.title}`,
      body: `Now $${newPrice} (was $${existing.price}).`,
    });
  }
  if (willPublish) void matchSavedSearches(updated);

  return { ok: true, data: { id: listingId } };
}

/**
 * Notify everyone who favorited a listing, excluding its owner and anyone in a
 * block relationship with the owner (a blocked user shouldn't keep getting
 * price-drop / sold pings from someone they blocked).
 */
async function notifyFavoriters(
  listingId: string,
  ownerId: string,
  payload: { kind: "PRICE_DROP" | "FAVORITE_SOLD"; title: string; body: string }
): Promise<void> {
  const blocked = await blockedUserIds(ownerId);
  const favs = await db.favorite.findMany({
    where: { listingId, userId: { notIn: [ownerId, ...blocked] } },
    select: { userId: true },
  });
  for (const f of favs) {
    void notify({ userId: f.userId, ...payload, href: `/listing/${listingId}` });
  }
}

const statusChangeSchema = z.object({
  listingId: z.string().min(1),
  status: z.enum(["ACTIVE", "SOLD", "RESOLVED", "DELETED"]),
});

export async function setListingStatus(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const listing = await db.listing.findUnique({
    where: { id: parsed.data.listingId },
  });
  if (!listing || listing.status === "DELETED") {
    return { ok: false, error: "This listing no longer exists." };
  }
  if (listing.ownerId !== user.id) {
    return { ok: false, error: "Only the owner can change this listing." };
  }

  // No-op if the status didn't actually change — prevents re-firing the
  // "no longer available" blast every time the owner re-taps Mark as sold.
  if (listing.status === parsed.data.status) return { ok: true };

  // Compare-and-set on the prior status: if a concurrent action already moved
  // it, this matches zero rows and we skip the (now-stale) notification.
  const result = await db.listing.updateMany({
    where: { id: listing.id, status: listing.status },
    data: { status: parsed.data.status },
  });
  if (result.count === 0) return { ok: true };

  revalidatePath("/browse");
  revalidatePath(`/listing/${listing.id}`);
  revalidatePath("/my-items");

  // Notify watchers only on a genuine transition INTO sold/resolved from an
  // available state — never when it was already completed.
  const becameUnavailable =
    (parsed.data.status === "SOLD" || parsed.data.status === "RESOLVED") &&
    (listing.status === "ACTIVE" || listing.status === "DRAFT");
  if (becameUnavailable) {
    void notifyFavoriters(listing.id, listing.ownerId, {
      kind: "FAVORITE_SOLD",
      title: `A saved item is no longer available`,
      body: `${listing.title} was just marked ${parsed.data.status.toLowerCase()}.`,
    });
  }
  return { ok: true };
}
