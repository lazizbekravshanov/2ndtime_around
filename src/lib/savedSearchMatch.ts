import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { blockedUserIds } from "@/lib/actions/safety";

type MatchableListing = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  type: string;
  price: number | null;
};

function textMatches(q: string, listing: MatchableListing): boolean {
  const needle = q.toLowerCase();
  return (
    listing.title.toLowerCase().includes(needle) ||
    listing.description.toLowerCase().includes(needle) ||
    listing.category.toLowerCase().includes(needle)
  );
}

/**
 * Runs at listing-create time (post-commit, best effort). Notifies users whose
 * notify-on saved searches match the new listing. Never the listing's owner.
 */
export async function matchSavedSearches(
  listing: MatchableListing
): Promise<void> {
  // Never notify the owner, nor anyone in a block relationship with them —
  // a blocked user shouldn't get pinged about (or a link to) this seller.
  const blocked = await blockedUserIds(listing.ownerId);
  const searches = await db.savedSearch.findMany({
    where: { notify: true, userId: { notIn: [listing.ownerId, ...blocked] } },
    take: 500,
  });

  for (const s of searches) {
    if (s.type && s.type !== listing.type) continue;
    if (s.category && s.category !== listing.category) continue;
    if (s.minPrice != null && (listing.price ?? 0) < s.minPrice) continue;
    if (s.maxPrice != null && (listing.price ?? Infinity) > s.maxPrice) continue;
    if (s.q && !textMatches(s.q, listing)) continue;

    void notify({
      userId: s.userId,
      kind: "SAVED_SEARCH_HIT",
      title: `New match: ${listing.title}`,
      body: `Matches your saved search “${s.label}”.`,
      href: `/listing/${listing.id}`,
    });
  }
}
