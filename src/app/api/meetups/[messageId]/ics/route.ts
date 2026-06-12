import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { toIcs } from "@/lib/calendar";

// Download an .ics for an accepted meetup. Participant-authorized.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const message = await db.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        include: {
          listing: { select: { ownerId: true } },
          starter: { select: { displayName: true } },
        },
      },
    },
  });
  if (!message || message.kind !== "MEETUP_PROPOSAL") {
    return new Response("Not found", { status: 404 });
  }

  const convo = message.conversation;
  const isParticipant =
    convo.starterId === user.id || convo.listing.ownerId === user.id;
  if (!isParticipant) return new Response("Not found", { status: 404 });

  const meta = (message.meta ?? {}) as Record<string, unknown>;
  const spot = String(meta.spot ?? "Campus");
  const datetime = String(meta.datetime ?? "");
  if (!datetime) return new Response("No time set", { status: 400 });

  const otherName =
    convo.starterId === user.id ? "the other party" : convo.starter.displayName ?? "the other party";

  const ics = toIcs({ spot, datetime, uid: message.id, otherName });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meetup.ics"',
    },
  });
}
