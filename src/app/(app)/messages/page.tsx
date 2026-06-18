import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { photoList, timeAgo } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser();

  const conversations = await db.conversation.findMany({
    where: {
      OR: [{ starterId: user.id }, { listing: { ownerId: user.id } }],
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          photos: true,
          status: true,
          owner: { select: { id: true, displayName: true } },
        },
      },
      starter: { select: { id: true, displayName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: { where: { readAt: null, senderId: { not: user.id } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-medium tracking-tight">Messages</h1>

      {conversations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No conversations yet"
            hint="Find something you like and message the seller — every exchange starts here."
            action={<ButtonLink href="/browse">Browse listings</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {conversations.map((c) => {
            const other =
              c.starter.id === user.id ? c.listing.owner : c.starter;
            const last = c.messages[0];
            const unread = c._count.messages;
            const cover = photoList(c.listing.photos)[0];
            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-paper"
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
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          unread > 0 ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {other.displayName}
                        <span className="ml-2 font-normal text-faint">
                          · {c.listing.title}
                        </span>
                      </p>
                      {last && (
                        <span className="shrink-0 text-xs text-faint">
                          {timeAgo(last.createdAt)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`truncate text-sm ${
                        unread > 0 ? "font-medium text-ink" : "text-faint"
                      }`}
                    >
                      {last
                        ? last.kind === "MEETUP_PROPOSAL"
                          ? "📍 Meetup proposed"
                          : last.kind === "CLAIM"
                            ? "Ownership claim"
                            : last.body
                        : "No messages yet — say hi!"}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span
                      aria-label={`${unread} unread`}
                      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white"
                    >
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
