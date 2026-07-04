import { notFound } from "next/navigation";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BadgeIcon } from "@/components/icons";
import { StarRating } from "@/components/ui/Stars";
import { db } from "@/lib/db";
import { monthYear, timeAgo } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import { isBlockedBetween } from "@/lib/actions/safety";
import { getUserStats, computeBadges } from "@/lib/badges";
import { BadgeShelf } from "@/components/BadgeShelf";
import { ProfileMenu } from "./ProfileMenu";

export const metadata = { title: "Profile" };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Public page: anonymous visitors can view, signed-in visitors get the
  // viewer-only affordances (self tag, block/report, locked-badge progress).
  const viewer = await getSessionUser();

  const profile = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      major: true,
      year: true,
      createdAt: true,
    },
  });
  if (!profile || !profile.displayName) notFound();

  const isSelf = viewer?.id === profile.id;
  const blocked =
    !viewer || isSelf ? false : await isBlockedBetween(viewer.id, profile.id);
  const badges = computeBadges(await getUserStats(profile.id));

  const [listings, ratings, ratingAgg, completedCount] = await Promise.all([
    db.listing.findMany({
      where: { ownerId: profile.id, status: "ACTIVE" },
      include: { owner: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.rating.findMany({
      where: { toUserId: profile.id },
      include: { fromUser: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.rating.aggregate({
      where: { toUserId: profile.id },
      _avg: { stars: true },
      _count: true,
    }),
    db.listing.count({
      where: { ownerId: profile.id, status: { in: ["SOLD", "RESOLVED"] } },
    }),
  ]);

  return (
    <div>
      {/* Profile header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-xl font-semibold uppercase">
            {profile.displayName.charAt(0)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.displayName}
              {isSelf && (
                <span className="ml-2 font-sans text-sm font-normal text-faint">
                  (you)
                </span>
              )}
            </h1>
            <p className="text-sm text-faint">
              {[profile.major, profile.year].filter(Boolean).join(" · ") || "UC student"}{" "}
              · Member since {monthYear(profile.createdAt)} · {completedCount}{" "}
              completed {completedCount === 1 ? "exchange" : "exchanges"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {ratingAgg._count > 0 && (
            <StarRating value={ratingAgg._avg.stars ?? 0} count={ratingAgg._count} />
          )}
          {viewer && !isSelf && (
            <ProfileMenu
              userId={profile.id}
              name={profile.displayName}
              initialBlocked={blocked}
            />
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="mt-6">
        <BadgeShelf badges={badges} showLocked={isSelf} />
      </div>

      {/* Active listings */}
      <section className="mt-10">
        <h2 className="text-base font-semibold">Active listings</h2>
        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-faint">
            {isSelf
              ? "You have no active listings right now."
              : "Nothing listed right now."}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={{ ...l, type: l.type as never, status: l.status as never }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Ratings received */}
      <section className="mt-10">
        <h2 className="text-base font-semibold">Ratings</h2>
        {ratings.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<BadgeIcon className="h-6 w-6" />}
              title="No ratings yet"
              hint="Ratings appear here after completed exchanges."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {ratings.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <StarRating value={r.stars} />
                  <span className="text-xs text-faint">
                    {r.fromUser.displayName} · {timeAgo(r.createdAt)}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 max-w-prose text-sm">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
