import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/ui/Stars";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PinIcon,
} from "@/components/icons";
import {
  TYPE_LABELS,
  MEETUP_SPOTS,
  type ListingStatus,
  type ListingType,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { formatPrice, monthYear, photoList, timeAgo } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import { safeBrowseReturn } from "@/lib/url";
import { viewOutcome } from "@/lib/listingVisibility";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ListingMenu } from "./ListingMenu";
import { ClaimButton } from "./ClaimButton";
import { MessageSellerButton } from "./MessageSellerButton";
import { OwnerActions } from "./OwnerActions";
import {
  RelatedListings,
  RelatedListingsSkeleton,
} from "./RelatedListings";

// cache() dedupes the query between generateMetadata and the page render.
const getListing = cache((id: string) =>
  db.listing.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          createdAt: true,
          major: true,
          year: true,
        },
      },
      // Social proof at the decision point. The cards show this; the page
      // where it would actually create urgency did not.
      _count: { select: { favorites: true } },
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
  if (!listing || listing.status !== "ACTIVE") {
    return { title: "Listing", robots: { index: false, follow: false } };
  }

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  // `from` carries the browse view this listing was opened from. It is
  // attacker-controllable and lands in an href, so it is validated down to a
  // same-origin /browse path before use; anything else falls back to /browse.
  const { from } = await searchParams;
  const backTo = safeBrowseReturn(from);
  // Public page: anonymous visitors may view active listings. A signed-in user
  // unlocks owner controls, favorite state, and the participation actions.
  const user = await getSessionUser();
  // Anonymous visitors reach every protected control through sign-in, returning
  // here afterwards.
  const signInHref = user
    ? undefined
    : `/signin?callbackUrl=${encodeURIComponent(`/listing/${id}`)}`;

  const listing = await getListing(id);
  if (!listing) notFound();

  const isOwner = user ? listing.ownerId === user.id : false;
  // Only ACTIVE listings are publicly reachable by URL. The owner can still
  // open their own draft / sold / resolved listings; everyone else hits a
  // friendly dead end instead of the full page (which must not reveal the
  // exact non-active status).
  const outcome = viewOutcome({
    status: listing.status as ListingStatus,
    isOwner,
  });
  if (outcome === "notFound") notFound();
  if (outcome === "unavailable") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          This listing is no longer available.
        </h1>
        <p className="mt-2 text-sm text-faint">
          It may have been sold, claimed, or taken down.
        </p>
        <Link
          href={backTo ?? "/browse"}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          <ChevronLeftIcon className="h-4 w-4" />{" "}
          {backTo ? "Back to results" : "Back to browse"}
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

  const favorited =
    user && !isOwner
      ? (await db.favorite.findUnique({
          where: { userId_listingId: { userId: user.id, listingId: id } },
          select: { id: true },
        })) !== null
      : false;

  return (
    <div>
      <Link
        href={backTo ?? "/browse"}
        className="inline-flex items-center gap-1 text-sm text-faint hover:text-ink"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {backTo ? "Back to results" : "Back to browse"}
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <PhotoCarousel
            photos={photos}
            title={listing.title}
            category={listing.category}
          />
        </div>

        <div className="md:col-span-2">
          {/* Two badges at most: what it is, and (only if notable) its state.
              Category and course moved to the meta line below — they're
              reference data, not signals. */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={type === "LOST" || type === "DONATE" ? "accent" : "neutral"}>
              {TYPE_LABELS[type]}
            </Badge>
            {listing.status === "DRAFT" && <StatusBadge status="DRAFT" />}
            {done && <StatusBadge status={listing.status as ListingStatus} />}
          </div>

          {/* Price leads, as it does on the cards. It previously sat under the
              title at barely more than body weight, which is the wrong order
              for the page where someone decides whether to buy. */}
          {type === "SELL" && listing.price !== null && (
            <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
              {formatPrice(listing.price)}
            </p>
          )}
          {type === "DONATE" && (
            <p className="mt-3 text-4xl font-semibold tracking-tight text-success">
              Free
            </p>
          )}

          <h1 className="mt-2 text-xl font-medium leading-snug">
            {listing.title}
          </h1>

          {/* One meta line carries category, course, condition, age, and views —
              previously three separate "Label:" rows plus two pills. */}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-faint">
            <span>{listing.category}</span>
            {listing.courseCode && (
              <>
                <span aria-hidden="true">·</span>
                <span>{listing.courseCode}</span>
              </>
            )}
            {listing.condition && (
              <>
                <span aria-hidden="true">·</span>
                <span>{listing.condition}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{timeAgo(listing.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="h-4 w-4" />
              {listing.viewCount} {listing.viewCount === 1 ? "view" : "views"}
            </span>
          </p>

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

          {/* The trust panel. The product's whole promise is "verified
              classmates, not strangers", and this is the page where someone
              decides to message one and meet them in person — so the promise
              gets stated here, in one object, next to the action it gates. */}
          <div className="mt-6 rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              {isLostFound
                ? type === "LOST"
                  ? "Reported by"
                  : "Found by"
                : "Seller"}
            </p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {/* Initial in a circle — the same treatment the header uses for
                    the account menu. No schema change, no upload flow, and it
                    can never render as a broken image. */}
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-sm font-semibold uppercase"
                >
                  {(listing.owner.displayName ?? "?").charAt(0)}
                </span>
                <div className="min-w-0">
                  {/* A resting underline, not just a hover one: with hover-only
                      styling this read as a plain label, so the profile behind
                      it was effectively undiscoverable. */}
                  <Link
                    href={`/profile/${listing.owner.id}`}
                    className="font-medium underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    {listing.owner.displayName}
                  </Link>
                  {/* Precisely what the system checked: control of a UC email
                      address. Not "verified student" — enrolment was never
                      verified, and the university does not vouch for anyone. */}
                  {/* Not shown to the owner: telling you that you are
                      verified is noise. The mark exists to reassure the person
                      deciding whether to message a stranger. */}
                  {!isOwner && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-success-strong">
                      <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                      Verified @uc.edu
                    </p>
                  )}
                  {(listing.owner.major || listing.owner.year) && (
                    <p className="mt-1 text-xs text-faint">
                      {[listing.owner.major, listing.owner.year]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-faint">
                    Member since {monthYear(listing.owner.createdAt)} ·{" "}
                    {completedCount} completed{" "}
                    {completedCount === 1 ? "exchange" : "exchanges"}
                  </p>
                </div>
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

          {/* Primary action — non-owners only reach this page for ACTIVE
              listings (viewOutcome gates drafts/sold/resolved), so the old
              "already sold" branch is unreachable and was removed. */}
          <div className="mt-4 space-y-3">
            {isOwner ? (
              <OwnerActions
                listingId={listing.id}
                type={type}
                status={listing.status}
              />
            ) : (
              <>
                {type === "FOUND" && (
                  <ClaimButton listingId={listing.id} signInHref={signInHref} />
                )}
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
                  signInHref={signInHref}
                />
                <div className="flex items-center gap-2">
                  <FavoriteButton
                    listingId={listing.id}
                    initial={favorited}
                    variant="inline"
                    signInHref={signInHref}
                  />
                  <ListingMenu
                    listingId={listing.id}
                    ownerId={listing.owner.id}
                    ownerName={listing.owner.displayName ?? "this user"}
                    signInHref={signInHref}
                  />
                  {/* Only when there is some. A zero would advertise silence
                      at exactly the wrong moment. */}
                  {listing._count.favorites > 0 && (
                    <span className="ml-auto text-sm text-faint">
                      {listing._count.favorites} saved
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Safe meetup spots — selectable later, inside the chat */}
          {/* Borderless section under a rule — the seller card is the only frame
              in this column, so two stacked boxes don't compete. */}
          {showMeetup && (
            // Reassurance, not decision input, and the full list appears again
            // in the chat the moment a meetup is actually proposed. It was the
            // largest block on the page while answering a question nobody has
            // yet. A native <details> keeps it keyboard- and screen-reader-
            // accessible with no JS.
            <details className="group mt-8 border-t border-line pt-5">
              <summary className="tap-target flex cursor-pointer list-none items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-faint transition-colors hover:text-ink">
                <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
                Safe meetup spots ({MEETUP_SPOTS.length})
              </summary>
              <p className="mt-3 text-xs text-faint">
                Well-lit, staffed campus locations. You can propose one with a
                time inside the chat.
              </p>
              <ul className="mt-3 space-y-1.5">
                {MEETUP_SPOTS.map((spot) => (
                  <li
                    key={spot.name}
                    className="flex items-center gap-2 text-sm text-faint"
                  >
                    <PinIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {spot.name}
                      <span className="text-faint"> · {spot.blurb}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {/* Somewhere to go next. Suspended so two extra queries can never delay
          the listing itself. */}
      <Suspense fallback={<RelatedListingsSkeleton />}>
        <RelatedListings
          listingId={listing.id}
          ownerId={listing.owner.id}
          ownerName={listing.owner.displayName ?? "this seller"}
          category={listing.category}
        />
      </Suspense>
    </div>
  );
}
