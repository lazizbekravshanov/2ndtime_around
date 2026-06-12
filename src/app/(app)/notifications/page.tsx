import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { NotificationRow } from "./NotificationRow";
import { MarkAllRead } from "./MarkAllRead";

export const metadata = { title: "Notifications" };

/** Group label for a notification by recency. */
function dayBucket(date: Date): string {
  const now = Date.now();
  const diffDays = Math.floor((now - date.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  return "Earlier";
}

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const hasUnread = notifications.some((n) => n.readAt === null);

  // Preserve order while grouping by recency bucket.
  const groups: { label: string; items: typeof notifications }[] = [];
  for (const n of notifications) {
    const label = dayBucket(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Notifications</h1>
        {hasUnread && <MarkAllRead />}
      </div>

      <div className="mt-5">
        {notifications.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            hint="Messages, claims, meetups, price drops, and saved-search matches will show up here."
            action={<ButtonLink href="/browse">Browse items</ButtonLink>}
          />
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                  {g.label}
                </p>
                <div className="space-y-2">
                  {g.items.map((n) => (
                    <NotificationRow
                      key={n.id}
                      n={{
                        id: n.id,
                        kind: n.kind,
                        title: n.title,
                        body: n.body,
                        href: n.href,
                        read: n.readAt !== null,
                        createdAt: n.createdAt,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
