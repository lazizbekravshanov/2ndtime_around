import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { ChevronLeftIcon } from "@/components/icons";
import { TYPE_LABELS, type ListingType } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatPrice, photoList } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { RatingPrompt } from "@/components/RatingPrompt";
import { Thread } from "./Thread";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await requireUser();

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      listing: {
        include: { owner: { select: { id: true, displayName: true, email: true } } },
      },
      starter: { select: { id: true, displayName: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (
    !conversation ||
    (conversation.starterId !== user.id &&
      conversation.listing.ownerId !== user.id)
  ) {
    notFound();
  }

  const { listing } = conversation;
  const other =
    conversation.starter.id === user.id
      ? conversation.listing.owner
      : conversation.starter;
  const isFinderView = listing.ownerId === user.id; // for claim approve/deny
  const cover = photoList(listing.photos)[0];
  const type = listing.type as ListingType;

  // Completed exchange + linked conversation → one-tap rating prompt,
  // unless this user already rated this listing.
  const exchangeDone =
    listing.status === "SOLD" || listing.status === "RESOLVED";
  const alreadyRated = exchangeDone
    ? (await db.rating.findUnique({
        where: {
          fromUserId_listingId: { fromUserId: user.id, listingId: listing.id },
        },
      })) !== null
    : true;

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1 text-sm text-faint hover:text-ink"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        All messages
      </Link>

      {/* The listing this thread is about, pinned for context */}
      <Link
        href={`/listing/${listing.id}`}
        className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-faint/50"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-faint">
              No photo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{listing.title}</p>
          <p className="text-xs text-faint">
            {TYPE_LABELS[type]}
            {type === "SELL" && listing.price !== null
              ? ` · ${formatPrice(listing.price)}`
              : type === "DONATE"
                ? " · Free"
                : ""}{" "}
            · with {other.displayName}
          </p>
        </div>
        {(listing.status === "SOLD" || listing.status === "RESOLVED") && (
          <Badge tone="success">
            {listing.status === "SOLD" ? "Sold" : "Resolved"}
          </Badge>
        )}
      </Link>

      {exchangeDone && !alreadyRated && (
        <RatingPrompt
          listingId={listing.id}
          toUserId={other.id}
          otherName={other.displayName ?? "this student"}
        />
      )}

      <Thread
        conversationId={conversation.id}
        currentUserId={user.id}
        otherUser={{
          id: other.id,
          displayName: other.displayName ?? "UC student",
          email: other.email,
        }}
        myEmail={user.email}
        isFinderView={isFinderView}
        listingType={type}
        initialListingStatus={listing.status}
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          kind: m.kind,
          meta: m.meta as Record<string, unknown> | null,
          readAt: m.readAt ? m.readAt.toISOString() : null,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
