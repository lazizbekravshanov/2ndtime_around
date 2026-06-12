"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { listingSchema } from "@/lib/validation";
import { notify } from "@/lib/notify";
import { matchSavedSearches } from "@/lib/savedSearchMatch";

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
      ...(isDrop ? { lastNotifiedPrice: newPrice } : {}),
    },
  });

  revalidatePath("/browse");
  revalidatePath(`/listing/${listingId}`);

  if (isDrop && newPrice !== null) {
    void notifyFavoriters(listingId, {
      kind: "PRICE_DROP",
      title: `Price drop: ${d.title}`,
      body: `Now $${newPrice} (was $${existing.price}).`,
    });
  }
  if (willPublish) void matchSavedSearches(updated);

  return { ok: true, data: { id: listingId } };
}

/** Notify everyone who favorited a listing (excluding its owner). */
async function notifyFavoriters(
  listingId: string,
  payload: { kind: "PRICE_DROP" | "FAVORITE_SOLD"; title: string; body: string }
): Promise<void> {
  const favs = await db.favorite.findMany({
    where: { listingId },
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

  await db.listing.update({
    where: { id: listing.id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/browse");
  revalidatePath(`/listing/${listing.id}`);
  revalidatePath("/my-items");

  // Let watchers know a saved item is gone.
  if (parsed.data.status === "SOLD" || parsed.data.status === "RESOLVED") {
    void notifyFavoriters(listing.id, {
      kind: "FAVORITE_SOLD",
      title: `A saved item is no longer available`,
      body: `${listing.title} was just marked ${parsed.data.status.toLowerCase()}.`,
    });
  }
  return { ok: true };
}
