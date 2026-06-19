"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/listings";

const REASONS = [
  "SCAM",
  "PROHIBITED",
  "SPAM",
  "INAPPROPRIATE",
  "HARASSMENT",
  "OTHER",
] as const;

const reportSchema = z.object({
  reason: z.enum(REASONS),
  detail: z.string().trim().max(300).optional(),
});

/** True if either user has blocked the other. Used to gate conversations. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return block !== null;
}

/** Ids the given user has blocked — to hide their listings from browse. */
export async function blockedUserIds(userId: string): Promise<string[]> {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) ids.add(r.blockerId === userId ? r.blockedId : r.blockerId);
  return [...ids];
}

export async function reportListing(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const schema = reportSchema.extend({ listingId: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a reason." };

  const listing = await db.listing.findUnique({
    where: { id: parsed.data.listingId },
    select: { id: true, ownerId: true },
  });
  if (!listing) return { ok: false, error: "This listing no longer exists." };
  if (listing.ownerId === user.id) {
    return { ok: false, error: "You can't report your own listing." };
  }

  // One open report per reporter per listing.
  const existing = await db.report.findFirst({
    where: { reporterId: user.id, listingId: listing.id, status: "OPEN" },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "You've already reported this listing." };
  }

  await db.report.create({
    data: {
      reporterId: user.id,
      listingId: listing.id,
      reason: parsed.data.reason,
      detail: parsed.data.detail || null,
    },
  });
  return { ok: true };
}

export async function reportUser(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const schema = reportSchema.extend({ reportedUserId: z.string().min(1) });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a reason." };
  if (parsed.data.reportedUserId === user.id) {
    return { ok: false, error: "You can't report yourself." };
  }

  const existing = await db.report.findFirst({
    where: {
      reporterId: user.id,
      reportedUserId: parsed.data.reportedUserId,
      status: "OPEN",
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "You've already reported this user." };
  }

  await db.report.create({
    data: {
      reporterId: user.id,
      reportedUserId: parsed.data.reportedUserId,
      reason: parsed.data.reason,
      detail: parsed.data.detail || null,
    },
  });
  return { ok: true };
}

export async function blockUser(blockedId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };
  if (!blockedId || blockedId === user.id) {
    return { ok: false, error: "Invalid request." };
  }

  await db.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
    update: {},
    create: { blockerId: user.id, blockedId },
  });
  revalidatePath(`/profile/${blockedId}`);
  revalidatePath("/browse");
  return { ok: true };
}

export async function unblockUser(blockedId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  await db.block
    .delete({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
    })
    .catch(() => {}); // already unblocked is fine
  revalidatePath(`/profile/${blockedId}`);
  revalidatePath("/browse");
  return { ok: true };
}

/** Is the viewer currently blocking (or blocked by) this user? */
export async function blockStateWith(otherId: string): Promise<{
  blocked: boolean;
}> {
  const user = await getSessionUser();
  if (!user) return { blocked: false };
  return { blocked: await isBlockedBetween(user.id, otherId) };
}
