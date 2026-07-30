import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import { HeartIcon, PinIcon } from "@/components/icons";
import { FavoriteButton } from "@/components/FavoriteButton";
import { photoList, priceSlot, timeAgo } from "@/lib/format";
import type { ListingStatus, ListingType } from "@/lib/constants";

export type ListingCardData = {
  id: string;
  type: ListingType;
  title: string;
  category: string;
  courseCode?: string | null;
  /** Shown for sale/donation items — the deciding attribute for used goods. */
  condition?: string | null;
  price: number | null;
  status: ListingStatus;
  locationNote: string | null;
  photos: unknown;
  createdAt: Date;
  owner: { displayName: string | null };
  /** Favourites on this listing. Optional: only browse opts into the count. */
  savedCount?: number;
};

export function ListingCard({
  listing,
  favorited,
  signInHref,
  backTo,
}: {
  listing: ListingCardData;
  /** undefined hides the heart (e.g. own items); boolean shows its state. */
  favorited?: boolean;
  /** When set, the viewer is anonymous: the heart becomes a sign-in CTA. */
  signInHref?: string;
  /**
   * The browse view this card was clicked from (path + query). Threaded into
   * the listing URL so its back-link can return to these exact results instead
   * of dumping the user at an unfiltered grid.
   */
  backTo?: string;
}) {
  const photos = photoList(listing.photos);
  const isLostFound = listing.type === "LOST" || listing.type === "FOUND";
  const isWanted = listing.type === "WANTED";
  const done = listing.status === "SOLD" || listing.status === "RESOLVED";
  const hasPhoto = Boolean(photos[0]);
  // Condition is only meaningful for things being handed over. A lost phone
  // or a want-ad has no condition worth stating.
  const showCondition =
    Boolean(listing.condition) &&
    (listing.type === "SELL" || listing.type === "DONATE");
  const slot = priceSlot(listing.type, listing.price);
  const href = backTo
    ? `/listing/${listing.id}?from=${encodeURIComponent(backTo)}`
    : `/listing/${listing.id}`;

  return (
    // Card is a plain container, not an anchor: a stretched link overlays the
    // whole card for navigation, while the favorite button is a *sibling* (not a
    // descendant) so we never nest a <button> inside an <a> (invalid HTML / AT hazard).
    <article className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-colors duration-200 hover:border-faint/40">
      <Link href={href} className="absolute inset-0 z-10 rounded-xl">
        <span className="sr-only">{listing.title}</span>
      </Link>
      {signInHref ? (
        <FavoriteButton listingId={listing.id} signInHref={signInHref} />
      ) : (
        favorited !== undefined && (
          <FavoriteButton listingId={listing.id} initial={favorited} />
        )
      )}
      <div className="relative aspect-[4/3] overflow-hidden bg-paper">
        {hasPhoto ? (
          // Plain <img>: uploads land in /public at runtime, which
          // next/image's optimizer can't see in dev.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[0]}
            alt={listing.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          // No photo: a monochrome category glyph reads as "we know what this
          // is, there's just no picture" — the old bare "No photo" label left
          // the largest area of the card saying nothing at all.
          <div className="flex h-full flex-col items-center justify-center gap-2.5 bg-line/25 px-3 text-center text-faint">
            <CategoryGlyph category={listing.category} className="h-9 w-9" />
            <span className="line-clamp-2 text-xs">
              {isWanted ? "Looking for this" : listing.category}
            </span>
          </div>
        )}
        {/* Only badges the body doesn't already carry. Lost / Found /
            Looking-for moved into the price slot, so keeping them here too was
            saying the same thing twice and crowding the picture. "Free" stays
            because it's the strongest draw on a donation. */}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {listing.type === "DONATE" && !done && (
            <Badge tone="accent">Free</Badge>
          )}
          {done && <StatusBadge status={listing.status} />}
        </div>

        {/* Social proof sits on the image, which is both where marketplaces
            put it and what keeps the body to exactly three rows. */}
        {(listing.savedCount ?? 0) > 0 && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-xs text-faint">
            <HeartIcon className="h-3 w-3 shrink-0" />
            {listing.savedCount}
          </span>
        )}
      </div>

      {/* Exactly three rows on every card — price, title, meta — so a grid row
          shares one rhythm no matter which fields a listing happens to have. */}
      <div className="space-y-1 p-4">
        {/* Price leads. People scan a marketplace grid for price, and it used
            to share a row with the title at the same size, so neither won. */}
        <p
          className={`text-base font-semibold leading-6 ${
            slot.muted ? "text-faint" : "text-ink"
          }`}
        >
          {slot.text}
        </p>

        <h3 className="line-clamp-2 min-h-10 text-sm leading-5 text-ink">
          {listing.title}
        </h3>

        {/* One calm line. Condition leads because it is what decides a used
            item; the seller stays on the detail page. For lost and found the
            location matters more than either, so it takes the slot.

            When the card has no photo the glyph cell already names the
            category, so it is dropped here rather than printed twice. */}
        <p className="flex items-center gap-1 truncate text-xs text-faint">
          {isLostFound && listing.locationNote ? (
            <>
              <PinIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{listing.locationNote}</span>
            </>
          ) : (
            [
              showCondition ? listing.condition : null,
              hasPhoto ? (listing.courseCode ?? listing.category) : null,
              timeAgo(listing.createdAt),
            ]
              .filter(Boolean)
              .join(" · ")
          )}
        </p>
      </div>
    </article>
  );
}

/** Skeleton placeholder matching the card's exact shape — no layout shift. */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="skeleton aspect-[4/3] rounded-none" />
      {/* Mirrors the card's three-row body - price, two-line title, meta -
          so swapping the skeleton for real content shifts nothing. */}
      <div className="space-y-1 p-4">
        <div className="skeleton h-6 w-16" />
        <div className="min-h-10 space-y-1.5">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}
