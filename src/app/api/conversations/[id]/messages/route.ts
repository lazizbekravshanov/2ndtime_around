import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { limitMessagePoll, apiRateLimitResponse } from "@/lib/rateLimit";

// Poll target for the open thread (every 5s). Returns the full message
// list plus listing status, and marks incoming messages as read — if
// you're polling, you're looking at the thread.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const rl = await limitMessagePoll(user.id);
  if (!rl.allowed) {
    return apiRateLimitResponse(rl, { error: "Slow down." });
  }

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { ownerId: true, status: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (
    !conversation ||
    (conversation.starterId !== user.id &&
      conversation.listing.ownerId !== user.id)
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    listingStatus: conversation.listing.status,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      kind: m.kind,
      meta: m.meta,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
