/**
 * Query builders for the two related-item rails on a listing page.
 *
 * These are pure `where` objects so the relevance rules are unit-testable
 * without a database, following the same split as `src/lib/search.ts`.
 *
 * The only relevance signal claimed is "same category". There is no scoring
 * model here, and a rail is never padded with unrelated inventory to reach a
 * target count — a short rail is honest, a padded one is noise.
 */

/** How many cards each rail shows. One row at every breakpoint. */
export const RELATED_TAKE = 4;

/**
 * Other active listings by the same seller.
 *
 * `blockedIds` is threaded through for symmetry with the similar-items rail;
 * in practice a viewer who blocked this seller would not be reading their
 * listing, but the rail must not become a side channel that ignores blocks.
 */
export function moreFromSellerWhere({
  ownerId,
  excludeId,
  blockedIds = [],
}: {
  ownerId: string;
  excludeId: string;
  blockedIds?: string[];
}) {
  return {
    status: "ACTIVE",
    ownerId,
    id: { not: excludeId },
    ...(blockedIds.length > 0 ? { NOT: { ownerId: { in: blockedIds } } } : {}),
  };
}

/**
 * Active listings in the same category by *other* sellers.
 *
 * The owner is excluded rather than merely deprioritized: their items already
 * have their own rail directly above, and showing them twice would make a thin
 * category look thinner.
 */
export function similarItemsWhere({
  category,
  ownerId,
  excludeId,
  blockedIds = [],
}: {
  category: string;
  ownerId: string;
  excludeId: string;
  blockedIds?: string[];
}) {
  return {
    status: "ACTIVE",
    category,
    id: { not: excludeId },
    NOT: { ownerId: { in: [ownerId, ...blockedIds] } },
  };
}

/** Newest first — the same ordering browse defaults to. */
export const relatedOrderBy = { createdAt: "desc" } as const;
