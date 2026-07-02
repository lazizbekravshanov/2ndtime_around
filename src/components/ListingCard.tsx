import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/StatusBadge";
import { PinIcon } from "@/components/icons";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatPrice, photoList, timeAgo } from "@/lib/format";
import type { ListingStatus, ListingType } from "@/lib/constants";

export type ListingCardData = {
  id: string;
  type: ListingType;
  title: string;
  category: string;
  price: number | null;
  status: ListingStatus;
  locationNote: string | null;
  photos: unknown;
  createdAt: Date;
  owner: { displayName: string | null };
};

export function ListingCard({
  listing,
  favorited,
}: {
  listing: ListingCardData;
  /** undefined hides the heart (e.g. own items); boolean shows its state. */
  favorited?: boolean;
}) {
  const photos = photoList(listing.photos);
  const isLostFound = listing.type === "LOST" || listing.type === "FOUND";
  const isWanted = listing.type === "WANTED";
  const done = listing.status === "SOLD" || listing.status === "RESOLVED";

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-colors duration-200 hover:border-faint/40"
    >
      {favorited !== undefined && (
        <FavoriteButton listingId={listing.id} initial={favorited} />
      )}
      <div className="relative aspect-[4/3] overflow-hidden bg-paper">
        {photos[0] ? (
          // Plain <img>: uploads land in /public at runtime, which
          // next/image's optimizer can't see in dev.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[0]}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-faint">
            {isWanted ? "Looking for this" : "No photo"}
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
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium">
            {listing.title}
          </h3>
          {listing.type === "SELL" && listing.price !== null && (
            <span className="shrink-0 whitespace-nowrap text-sm font-semibold">
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

        <p className="flex items-center justify-between gap-2 text-xs text-faint">
          <span className="truncate">
            {listing.category} · {timeAgo(listing.createdAt)}
          </span>
          <span className="truncate">
            {listing.owner.displayName ?? "UC student"}
          </span>
        </p>
      </div>
    </Link>
  );
}

/** Skeleton placeholder matching the card's exact shape — no layout shift. */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}
