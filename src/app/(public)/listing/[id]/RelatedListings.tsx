import { ListingCard, ListingCardSkeleton } from "@/components/ListingCard";
import { db } from "@/lib/db";
import { blockedUserIds } from "@/lib/actions/safety";
import { favoritedListingIds } from "@/lib/actions/favorites";
import { getSessionUser } from "@/lib/session";
import {
  moreFromSellerWhere,
  relatedOrderBy,
  RELATED_TAKE,
  similarItemsWhere,
} from "@/lib/related";

const SELECT = {
  include: { owner: { select: { displayName: true } } },
  orderBy: relatedOrderBy,
  take: RELATED_TAKE,
} as const;

/** One titled row of cards. Renders nothing when the rail is empty. */
function Rail({
  title,
  listings,
  favIds,
  showHearts,
}: {
  title: string;
  listings: Awaited<ReturnType<typeof fetchRelated>>["fromSeller"];
  favIds: Set<string>;
  /** False for anonymous viewers and for a seller looking at their own items. */
  showHearts: boolean;
}) {
  if (listings.length === 0) return null;
  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-faint">
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={{
              ...l,
              type: l.type as never,
              status: l.status as never,
            }}
            // undefined hides the heart entirely; a boolean shows its state.
            favorited={showHearts ? favIds.has(l.id) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

async function fetchRelated({
  listingId,
  ownerId,
  category,
  blockedIds,
}: {
  listingId: string;
  ownerId: string;
  category: string;
  blockedIds: string[];
}) {
  const [fromSeller, similar] = await Promise.all([
    db.listing.findMany({
      where: moreFromSellerWhere({ ownerId, excludeId: listingId, blockedIds }),
      ...SELECT,
    }),
    db.listing.findMany({
      where: similarItemsWhere({
        category,
        ownerId,
        excludeId: listingId,
        blockedIds,
      }),
      ...SELECT,
    }),
  ]);
  return { fromSeller, similar };
}

/**
 * The two related-item rails below a listing.
 *
 * Before this, the listing page was a dead end: the only way onward was a
 * single back-link. Both rails are best-effort — personalization or a failed
 * query degrades to fewer cards, never to a broken page — and neither is
 * padded with unrelated inventory to look fuller than the category is.
 */
export async function RelatedListings({
  listingId,
  ownerId,
  ownerName,
  category,
}: {
  listingId: string;
  ownerId: string;
  ownerName: string;
  category: string;
}) {
  const user = await getSessionUser();

  let blockedIds: string[] = [];
  let favIds = new Set<string>();
  if (user) {
    try {
      [blockedIds, favIds] = await Promise.all([
        blockedUserIds(user.id),
        favoritedListingIds(user.id),
      ]);
    } catch {
      // Soft-fail: show the rails without personalization.
    }
  }

  let related;
  try {
    related = await fetchRelated({ listingId, ownerId, category, blockedIds });
  } catch {
    // A rail is a nice-to-have; it must never take the listing down with it.
    return null;
  }

  const { fromSeller, similar } = related;
  if (fromSeller.length === 0 && similar.length === 0) return null;

  // Hearts need a signed-in viewer. A seller browsing their own shelf gets no
  // heart on the seller rail — you can't favorite your own listing.
  const isOwnShelf = user?.id === ownerId;

  return (
    <div className="mt-16 space-y-12 border-t border-line pt-10">
      <Rail
        title={`More from ${ownerName}`}
        listings={fromSeller}
        favIds={favIds}
        showHearts={Boolean(user) && !isOwnShelf}
      />
      <Rail
        title="Similar items"
        listings={similar}
        favIds={favIds}
        showHearts={Boolean(user)}
      />
    </div>
  );
}

/** Matches the rails' shape so the Suspense swap doesn't jump. */
export function RelatedListingsSkeleton() {
  return (
    <div className="mt-16 border-t border-line pt-10">
      <div className="skeleton h-3 w-40" />
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
