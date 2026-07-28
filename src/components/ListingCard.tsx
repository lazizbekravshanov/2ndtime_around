import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import { HeartIcon, PinIcon } from "@/components/icons";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatPrice, photoList, timeAgo } from "@/lib/format";
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
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-faint">
            <CategoryGlyph category={listing.category} className="h-7 w-7" />
            <span className="line-clamp-2 text-xs">
              {isWanted ? "Looking for this" : listing.category}
            </span>
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {listing.type === "DONATE" && !done && (
            <Badge tone="accent">Free</Badge>
          )}
          {listing.type === "LOST" && <Badge tone="accent">Lost</Badge>}
          {listing.type === "FOUND" && <Badge tone="neutral">Found</Badge>}
          {isWanted && !done && <Badge tone="outline">Looking for</Badge>}
          {done && <StatusBadge status={listing.status} />}
        </div>
      </div>

      <div className="space-y-1 p-3">
        {/* Two lines for the title, with the height reserved either way so
            cards stay a uniform height across the grid. Single-line truncation
            was cutting most real titles ("Sony noise-cancelling hea…") because
            the price was competing for the same row; the price now aligns to
            the first line instead of stealing width from it. */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-h-10 min-w-0 flex-1 text-sm font-medium leading-5">
            {listing.title}
          </h3>
          {listing.type === "SELL" && listing.price !== null && (
            <span className="shrink-0 whitespace-nowrap text-sm font-semibold leading-5">
              {formatPrice(listing.price)}
            </span>
          )}
        </div>

        {isLostFound && listing.locationNote ? (
          <p className="flex items-center gap-1 text-xs text-faint">
            <PinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{listing.locationNote}</span>
          </p>
        ) : null}

        {/* One calm line. Condition leads because it is what decides a used
            item; the seller stays on the detail page.

            When the card has no photo the glyph cell already names the
            category, so it is dropped here rather than printed twice. */}
        <p className="truncate text-xs text-faint">
          {[
            showCondition ? listing.condition : null,
            hasPhoto ? (listing.courseCode ?? listing.category) : null,
            timeAgo(listing.createdAt),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {/* Interest, only when there is some. A zero would advertise silence. */}
        {(listing.savedCount ?? 0) > 0 && (
          <p className="flex items-center gap-1 text-xs text-faint">
            <HeartIcon className="h-3.5 w-3.5 shrink-0" />
            {listing.savedCount} saved
          </p>
        )}
      </div>
    </article>
  );
}

/** Skeleton placeholder matching the card's exact shape — no layout shift. */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="skeleton aspect-[4/3] rounded-none" />
      {/* Mirrors the card's reserved two-line title block, so swapping the
          skeleton for real content shifts nothing. */}
      <div className="space-y-1 p-3">
        <div className="min-h-10 space-y-1.5">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}
