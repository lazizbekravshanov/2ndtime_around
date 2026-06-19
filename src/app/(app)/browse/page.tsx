import Link from "next/link";
import { Suspense } from "react";
import { ListingCard, ListingCardSkeleton } from "@/components/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { blockedUserIds } from "@/lib/actions/safety";
import { favoritedListingIds } from "@/lib/actions/favorites";
import {
  BROWSE_TABS,
  buildListingWhere,
  buildOrderBy,
  parseTab,
  parsePage,
  activeFilterChips,
  PAGE_SIZE,
  type BrowseParams,
} from "@/lib/search";
import { logSearchEvent } from "@/lib/searchLog";
import { BrowseFilters } from "./BrowseFilters";
import { ActiveFilters } from "./ActiveFilters";
import { SaveSearchButton } from "./SaveSearchButton";

export const metadata = { title: "Browse" };

/** Build a /browse link for a given page, preserving the active filters. */
function pageHref(params: BrowseParams, p: number): string {
  const sp = new URLSearchParams();
  if (params.tab && params.tab !== "market") sp.set("tab", params.tab);
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.condition) sp.set("condition", params.condition);
  if (params.min) sp.set("min", params.min);
  if (params.max) sp.set("max", params.max);
  if (params.sort) sp.set("sort", params.sort);
  if (params.lf) sp.set("lf", params.lf);
  if (p > 1) sp.set("page", String(p));
  const qs = sp.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

async function Results({ params }: { params: BrowseParams }) {
  const tab = parseTab(params.tab);
  const user = await getSessionUser();
  const [blockedIds, favIds] = user
    ? await Promise.all([blockedUserIds(user.id), favoritedListingIds(user.id)])
    : [[], new Set<string>()];

  const where = buildListingWhere(params, { blockedIds });
  const page = parsePage(params.page);
  // Fetch one extra row to know whether a next page exists, without a count().
  const rows = await db.listing.findMany({
    where,
    include: { owner: { select: { displayName: true } } },
    orderBy: buildOrderBy(params.sort),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });
  const hasNext = rows.length > PAGE_SIZE;
  const listings = rows.slice(0, PAGE_SIZE);

  // Log the search once per query (page 1), fire-and-forget. Zero-result
  // searches are logged too — that's the unmet-demand signal.
  if (page === 1) logSearchEvent(params, listings.length, user?.id ?? null);

  if (listings.length === 0) {
    const hasFilters = Boolean(
      params.q || params.category || params.condition || params.min || params.max
    );
    return (
      <EmptyState
        title={hasFilters ? "Nothing matches those filters" : "Nothing here yet"}
        hint={
          hasFilters
            ? "Try a broader search or clear a filter — new items show up all day."
            : tab === "lostfound"
              ? "No lost or found items reported right now. Hopefully it stays that way!"
              : tab === "wanted"
                ? "No want ads yet. Post what you're looking for and let sellers find you."
                : "Be the first — posting takes under a minute."
        }
        action={
          hasFilters ? (
            <ButtonLink variant="secondary" href={`/browse?tab=${tab}`}>
              Clear filters
            </ButtonLink>
          ) : (
            <ButtonLink href={tab === "wanted" ? "/sell?type=WANTED" : "/sell"}>
              {tab === "wanted" ? "Post a want ad" : "Post the first item"}
            </ButtonLink>
          )
        }
      />
    );
  }

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = (page - 1) * PAGE_SIZE + listings.length;

  return (
    <>
      <p className="mb-3 text-xs text-faint">
        Items {start}–{end}
        {hasNext ? "+" : ""}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={{
              ...l,
              type: l.type as never,
              status: l.status as never,
            }}
            favorited={
              user && l.ownerId !== user.id ? favIds.has(l.id) : undefined
            }
          />
        ))}
      </div>

      {(page > 1 || hasNext) && (
        <nav
          aria-label="Pagination"
          className="mt-8 flex items-center justify-between"
        >
          {page > 1 ? (
            <ButtonLink variant="secondary" href={pageHref(params, page - 1)}>
              ← Previous
            </ButtonLink>
          ) : (
            <span />
          )}
          <span className="text-sm text-faint">Page {page}</span>
          {hasNext ? (
            <ButtonLink variant="secondary" href={pageHref(params, page + 1)}>
              Next →
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<BrowseParams>;
}) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const chips = activeFilterChips(params);

  return (
    <div>
      <h1 className="sr-only">Browse</h1>

      {/* Tab bar — minimal underline style; active marked with a UC-red
          indicator, inactive labels muted. */}
      <nav
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {BROWSE_TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "market" ? "/browse" : `/browse?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
              tab === t.key ? "text-ink" : "text-faint hover:text-ink"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        <BrowseFilters tab={tab} />
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <ActiveFilters chips={chips} />
          <SaveSearchButton params={params} />
        </div>
      )}

      <div className="mt-5">
        <Suspense
          key={JSON.stringify(params)}
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <Results params={params} />
        </Suspense>
      </div>
    </div>
  );
}
