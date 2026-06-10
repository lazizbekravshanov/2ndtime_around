"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { listingSchema } from "@/lib/validation";

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
  await db.listing.update({
    where: { id: listingId },
    data: {
      title: d.title,
      description: d.description,
      category: d.category,
      condition: d.condition ?? null,
      price: existing.type === "SELL" ? (d.price ?? null) : null,
      locationNote: d.locationNote ?? null,
      photos: d.photos,
      ...(publish && existing.status === "DRAFT" ? { status: "ACTIVE" } : {}),
    },
  });

  revalidatePath("/browse");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true, data: { id: listingId } };
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
  return { ok: true };
}
