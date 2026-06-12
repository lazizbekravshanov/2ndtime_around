import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// Near-real-time message stream. Authorizes the participant, then pushes the
// thread state (~1s latency) and closes after ~25s so the platform's bounded
// serverless runtime stays happy — the browser's EventSource auto-reconnects.
// The 5s polling route remains the guaranteed fallback.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: { listing: { select: { ownerId: true } } },
  });
  if (
    !conversation ||
    (conversation.starterId !== user.id &&
      conversation.listing.ownerId !== user.id)
  ) {
    return new Response("Not found", { status: 404 });
  }
  const listingId = conversation.listingId;

  // Mark the other person's messages as read once, like the poll route does.
  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const startedAt = Date.now();
      let signature = "";

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const tick = async () => {
        if (closed) return;
        try {
          const [messages, listing] = await Promise.all([
            db.message.findMany({
              where: { conversationId: id },
              orderBy: { createdAt: "asc" },
            }),
            db.listing.findUnique({
              where: { id: listingId },
              select: { status: true },
            }),
          ]);
          const payload = {
            listingStatus: listing?.status ?? "ACTIVE",
            messages: messages.map((m) => ({
              id: m.id,
              senderId: m.senderId,
              body: m.body,
              kind: m.kind,
              meta: m.meta,
              readAt: m.readAt ? m.readAt.toISOString() : null,
              createdAt: m.createdAt.toISOString(),
            })),
          };
          const sig = JSON.stringify(payload);
          if (sig !== signature) {
            signature = sig;
            controller.enqueue(encoder.encode(`data: ${sig}\n\n`));
          }
        } catch {
          // transient DB hiccup — try again next tick
        }

        if (Date.now() - startedAt > 25000) {
          close();
          return;
        }
        setTimeout(tick, 1000);
      };

      tick();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
