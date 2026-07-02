import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/ui/Stars";
import { ChevronLeftIcon, EyeIcon, PinIcon } from "@/components/icons";
import {
  TYPE_LABELS,
  MEETUP_SPOTS,
  type ListingStatus,
  type ListingType,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { formatPrice, monthYear, photoList, timeAgo } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ListingMenu } from "./ListingMenu";
import { ClaimButton } from "./ClaimButton";
import { MessageSellerButton } from "./MessageSellerButton";
import { OwnerActions } from "./OwnerActions";

// cache() dedupes the query between generateMetadata and the page render.
const getListing = cache((id: string) =>
  db.listing.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, displayName: true, createdAt: true },
      },
    },
  })
);

/** Share-friendly metadata: a listing pasted into a group chat previews with
 *  its title, price, blurb, and first photo. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing || listing.status !== "ACTIVE") return { title: "Listing" };

  const price =
    listing.type === "SELL" && listing.price !== null
      ? ` · ${formatPrice(listing.price)}`
      : listing.type === "DONATE"
        ? " · Free"
        : "";
  const title = `${listing.title}${price}`;
  const description = listing.description.slice(0, 160);
  const photo = photoList(listing.photos)[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(photo ? { images: [{ url: photo }] } : {}),
    },
    twitter: { card: photo ? "summary_large_image" : "summary" },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const listing = await getListing(id);
  if (!listing || listing.status === "DELETED") notFound();

  const isOwner = listing.ownerId === user.id;
  // Only ACTIVE listings are publicly reachable by URL. The owner can still
  // open their own draft / sold / resolved listings; everyone else hits a
  // friendly dead end instead of the full page.
  if (!isOwner && listing.status !== "ACTIVE") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          This listing is no longer available.
        </h1>
        <p className="mt-2 text-sm text-faint">
          It may have been sold, claimed, or taken down.
        </p>
        <Link
          href="/browse"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          <ChevronLeftIcon className="h-4 w-4" /> Back to browse
        </Link>
      </div>
    );
  }

  // Count the view (not the owner's own visits) — fire and forget.
  if (!isOwner) {
    db.listing
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});
  }

  // Seller reputation: average rating + completed exchanges.
  const [ratingAgg, completedCount] = await Promise.all([
    db.rating.aggregate({
      where: { toUserId: listing.ownerId },
      _avg: { stars: true },
      _count: true,
    }),
    db.listing.count({
      where: { ownerId: listing.ownerId, status: { in: ["SOLD", "RESOLVED"] } },
    }),
  ]);

  const type = listing.type as ListingType;
  const photos = photoList(listing.photos);
  const isLostFound = type === "LOST" || type === "FOUND";
  const isWanted = type === "WANTED";
  const done = listing.status === "SOLD" || listing.status === "RESOLVED";
  const showMeetup = (type === "SELL" || type === "DONATE") && !done;

  const favorited = isOwner
    ? false
    : (await db.favorite.findUnique({
        where: { userId_listingId: { userId: user.id, listingId: id } },
        select: { id: true },
      })) !== null;

  return (
    <div>
      <Link
        href="/browse"
        className="inline-flex items-center gap-1 text-sm text-faint hover:text-ink"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to browse
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <PhotoCarousel photos={photos} title={listing.title} />
        </div>

        <div className="md:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={type === "LOST" || type === "DONATE" ? "accent" : "neutral"}>
              {TYPE_LABELS[type]}
            </Badge>
            <Badge tone="outline">{listing.category}</Badge>
            {listing.courseCode && (
              <Badge tone="neutral">{listing.courseCode}</Badge>
            )}
            {listing.status === "DRAFT" && <StatusBadge status="DRAFT" />}
            {done && <StatusBadge status={listing.status as ListingStatus} />}
          </div>

          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            {listing.title}
          </h1>

          {type === "SELL" && listing.price !== null && (
            <p className="mt-1 text-xl font-semibold">
              {formatPrice(listing.price)}
            </p>
          )}
          {type === "DONATE" && (
            <p className="mt-1 text-xl font-semibold text-success">Free</p>
          )}

          <p className="mt-2 flex items-center gap-3 text-sm text-faint">
            <span>Posted {timeAgo(listing.createdAt)}</span>
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="h-4 w-4" />
              {listing.viewCount} {listing.viewCount === 1 ? "view" : "views"}
            </span>
          </p>

          {listing.condition && (
            <p className="mt-4 text-sm">
              <span className="text-faint">Condition:</span>{" "}
              <span className="font-medium">{listing.condition}</span>
            </p>
          )}

          {isLostFound && listing.locationNote && (
            <p className="mt-4 flex items-start gap-1.5 text-sm">
              <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
              <span>
                <span className="text-faint">
                  {type === "LOST" ? "Last seen:" : "Found at:"}
                </span>{" "}
                <span className="font-medium">{listing.locationNote}</span>
              </span>
            </p>
          )}

          <p className="mt-4 whitespace-pre-line text-sm">
            {listing.description}
          </p>

          {/* Seller / reporter card */}
          <div className="mt-6 rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              {isLostFound
                ? type === "LOST"
                  ? "Reported by"
                  : "Found by"
                : "Seller"}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <Link
                  href={`/profile/${listing.owner.id}`}
                  className="font-medium hover:underline"
                >
                  {listing.owner.displayName}
                </Link>
                <p className="text-xs text-faint">
                  Member since {monthYear(listing.owner.createdAt)} ·{" "}
                  {completedCount} completed{" "}
                  {completedCount === 1 ? "exchange" : "exchanges"}
                </p>
              </div>
              {ratingAgg._count > 0 ? (
                <StarRating
                  value={ratingAgg._avg.stars ?? 0}
                  count={ratingAgg._count}
                />
              ) : (
                <span className="text-xs text-faint">No ratings yet</span>
              )}
            </div>
          </div>

          {/* Primary action */}
          <div className="mt-4 space-y-3">
            {isOwner ? (
              <OwnerActions
                listingId={listing.id}
                type={type}
                status={listing.status}
              />
            ) : done ? (
              <div className="space-y-3">
                <p className="rounded-xl border border-line bg-surface p-4 text-sm text-faint">
                  This {isLostFound ? "item" : "listing"} has been{" "}
                  {listing.status === "SOLD" ? "sold" : "resolved"}.
                </p>
                <div className="flex items-center gap-2">
                  <FavoriteButton
                    listingId={listing.id}
                    initial={favorited}
                    variant="inline"
                  />
                  <ListingMenu
                    listingId={listing.id}
                    ownerId={listing.owner.id}
                    ownerName={listing.owner.displayName ?? "this user"}
                  />
                </div>
              </div>
            ) : (
              <>
                {type === "FOUND" && <ClaimButton listingId={listing.id} />}
                <MessageSellerButton
                  listingId={listing.id}
                  label={
                    type === "FOUND"
                      ? "Message finder"
                      : type === "LOST"
                        ? "I think I found it — message them"
                        : isWanted
                          ? "I have this"
                          : "Message seller"
                  }
                  secondary={type === "FOUND"}
                />
                <div className="flex items-center gap-2">
                  <FavoriteButton
                    listingId={listing.id}
                    initial={favorited}
                    variant="inline"
                  />
                  <ListingMenu
                    listingId={listing.id}
                    ownerId={listing.owner.id}
                    ownerName={listing.owner.displayName ?? "this user"}
                  />
                </div>
              </>
            )}
          </div>

          {/* Safe meetup spots — selectable later, inside the chat */}
          {showMeetup && (
            <div className="mt-6 rounded-xl border border-line bg-surface p-4">
              <p className="text-sm font-medium">Suggested safe meetup spots</p>
              <p className="mt-0.5 text-xs text-faint">
                Well-lit, staffed campus locations. You can propose one with a
                time inside the chat.
              </p>
              <ul className="mt-3 space-y-1.5">
                {MEETUP_SPOTS.map((spot) => (
                  <li
                    key={spot.name}
                    className="flex items-center gap-2 text-sm text-faint"
                  >
                    <PinIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span>
                      {spot.name}
                      <span className="text-faint"> · {spot.blurb}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
