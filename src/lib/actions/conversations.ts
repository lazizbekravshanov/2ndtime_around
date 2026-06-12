"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  claimSchema,
  meetupProposalSchema,
  messageSchema,
} from "@/lib/validation";
import { notify } from "@/lib/notify";
import { isBlockedBetween } from "@/lib/actions/safety";
import type { ActionResult } from "@/lib/actions/listings";

/** True if the user is one of the two people in this conversation. */
async function loadConversationFor(userId: string, conversationId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { listing: { select: { id: true, ownerId: true, status: true, type: true } } },
  });
  if (!conversation) return null;
  const isParticipant =
    conversation.starterId === userId ||
    conversation.listing.ownerId === userId;
  return isParticipant ? conversation : null;
}

/** The other participant's user id, given one side of a loaded conversation. */
function otherParticipant(
  conversation: { starterId: string; listing: { ownerId: string } },
  userId: string
): string {
  return userId === conversation.starterId
    ? conversation.listing.ownerId
    : conversation.starterId;
}

/**
 * "Message seller" — reuses the existing thread if one exists, otherwise
 * creates it. Returns the conversation id to navigate to.
 */
export async function startConversation(
  listingId: string
): Promise<ActionResult<{ conversationId: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status === "DELETED" || listing.status === "DRAFT") {
    return { ok: false, error: "This listing no longer exists." };
  }
  if (listing.ownerId === user.id) {
    return { ok: false, error: "This is your own listing." };
  }
  if (await isBlockedBetween(user.id, listing.ownerId)) {
    return { ok: false, error: "This conversation isn't available." };
  }

  const existing = await db.conversation.findUnique({
    where: {
      listingId_starterId: { listingId, starterId: user.id },
    },
  });
  if (existing) return { ok: true, data: { conversationId: existing.id } };

  const conversation = await db.conversation.create({
    data: {
      listingId,
      starterId: user.id,
      participantIds: [user.id, listing.ownerId],
    },
  });
  return { ok: true, data: { conversationId: conversation.id } };
}

export async function sendMessage(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }

  const conversation = await loadConversationFor(
    user.id,
    parsed.data.conversationId
  );
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const recipientId = otherParticipant(conversation, user.id);
  if (await isBlockedBetween(user.id, recipientId)) {
    return { ok: false, error: "This conversation isn't available." };
  }

  await db.$transaction([
    db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        body: parsed.data.body,
        kind: "TEXT",
      },
    }),
    db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  revalidatePath(`/messages/${conversation.id}`);
  void notify({
    userId: recipientId,
    kind: "MESSAGE",
    title: `New message from ${user.displayName ?? "someone"}`,
    body: parsed.data.body.slice(0, 120),
    href: `/messages/${conversation.id}`,
    dedupe: true,
  });
  return { ok: true };
}

export async function proposeMeetup(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = meetupProposalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid proposal." };
  }

  const conversation = await loadConversationFor(
    user.id,
    parsed.data.conversationId
  );
  if (!conversation) return { ok: false, error: "Conversation not found." };

  await db.$transaction([
    db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        body: `Meetup proposed: ${parsed.data.spot}`,
        kind: "MEETUP_PROPOSAL",
        meta: {
          spot: parsed.data.spot,
          datetime: parsed.data.datetime,
          status: "PENDING",
        },
      },
    }),
    db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  revalidatePath(`/messages/${conversation.id}`);
  void notify({
    userId: otherParticipant(conversation, user.id),
    kind: "MEETUP",
    title: `${user.displayName ?? "Someone"} proposed a meetup`,
    body: parsed.data.spot,
    href: `/messages/${conversation.id}`,
  });
  return { ok: true };
}

const meetupResponseSchema = z.object({
  messageId: z.string().min(1),
  response: z.enum(["ACCEPTED", "DECLINED"]),
});

export async function respondToMeetup(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = meetupResponseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const message = await db.message.findUnique({
    where: { id: parsed.data.messageId },
  });
  if (!message || message.kind !== "MEETUP_PROPOSAL") {
    return { ok: false, error: "Proposal not found." };
  }
  // Only the person who *received* the proposal can answer it.
  if (message.senderId === user.id) {
    return { ok: false, error: "You can't respond to your own proposal." };
  }
  const conversation = await loadConversationFor(user.id, message.conversationId);
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const meta = (message.meta ?? {}) as Record<string, unknown>;
  if (meta.status !== "PENDING") {
    return { ok: false, error: "This proposal was already answered." };
  }

  await db.message.update({
    where: { id: message.id },
    data: { meta: { ...meta, status: parsed.data.response } },
  });

  revalidatePath(`/messages/${conversation.id}`);
  void notify({
    userId: message.senderId,
    kind: "MEETUP",
    title: `Meetup ${parsed.data.response.toLowerCase()}`,
    body: `${user.displayName ?? "They"} ${parsed.data.response === "ACCEPTED" ? "accepted" : "declined"} your meetup.`,
    href: `/messages/${conversation.id}`,
  });
  return { ok: true };
}

/**
 * Lost & found: "This is mine" sends a CLAIM message with a verification
 * detail into a (possibly new) conversation with the finder.
 */
export async function submitClaim(
  input: unknown
): Promise<ActionResult<{ conversationId: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid claim.",
    };
  }

  const listing = await db.listing.findUnique({
    where: { id: parsed.data.listingId },
  });
  if (!listing || listing.status !== "ACTIVE" || listing.type !== "FOUND") {
    return { ok: false, error: "This found item is no longer claimable." };
  }
  if (listing.ownerId === user.id) {
    return { ok: false, error: "You posted this item." };
  }
  if (await isBlockedBetween(user.id, listing.ownerId)) {
    return { ok: false, error: "This conversation isn't available." };
  }

  const conversation = await db.conversation.upsert({
    where: {
      listingId_starterId: { listingId: listing.id, starterId: user.id },
    },
    update: { updatedAt: new Date() },
    create: {
      listingId: listing.id,
      starterId: user.id,
      participantIds: [user.id, listing.ownerId],
    },
  });

  await db.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      body: parsed.data.detail,
      kind: "CLAIM",
      meta: { status: "PENDING" },
    },
  });

  revalidatePath(`/messages/${conversation.id}`);
  void notify({
    userId: listing.ownerId,
    kind: "CLAIM",
    title: `Someone claims your found item`,
    body: listing.title,
    href: `/messages/${conversation.id}`,
  });
  return { ok: true, data: { conversationId: conversation.id } };
}

const claimResponseSchema = z.object({
  messageId: z.string().min(1),
  response: z.enum(["APPROVED", "DENIED"]),
});

/** Finder approves or denies a claim; approval resolves the listing. */
export async function respondToClaim(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const parsed = claimResponseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const message = await db.message.findUnique({
    where: { id: parsed.data.messageId },
    include: { conversation: { include: { listing: true } } },
  });
  if (!message || message.kind !== "CLAIM") {
    return { ok: false, error: "Claim not found." };
  }
  // Only the finder (listing owner) can judge a claim.
  if (message.conversation.listing.ownerId !== user.id) {
    return { ok: false, error: "Only the finder can respond to this claim." };
  }

  const meta = (message.meta ?? {}) as Record<string, unknown>;
  if (meta.status !== "PENDING") {
    return { ok: false, error: "This claim was already answered." };
  }

  const approved = parsed.data.response === "APPROVED";
  await db.$transaction([
    db.message.update({
      where: { id: message.id },
      data: { meta: { ...meta, status: parsed.data.response } },
    }),
    ...(approved
      ? [
          db.listing.update({
            where: { id: message.conversation.listingId },
            data: { status: "RESOLVED" },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/messages/${message.conversationId}`);
  revalidatePath(`/listing/${message.conversation.listingId}`);
  void notify({
    userId: message.senderId,
    kind: "CLAIM",
    title: `Your claim was ${approved ? "approved" : "declined"}`,
    body: message.conversation.listing.title,
    href: `/messages/${message.conversationId}`,
  });
  return { ok: true };
}

/** Mark everything the other person sent as read. */
export async function markConversationRead(
  conversationId: string
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You need to sign in first." };

  const conversation = await loadConversationFor(user.id, conversationId);
  if (!conversation) return { ok: false, error: "Conversation not found." };

  await db.message.updateMany({
    where: {
      conversationId,
      senderId: { not: user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  return { ok: true };
}
