import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SavedSearchRow } from "./SavedSearchRow";

export const metadata = { title: "Saved" };

const SEGMENTS = [
  { key: "items", label: "Items" },
  { key: "searches", label: "Searches" },
] as const;

/** Reconstruct a shareable browse URL from saved-search criteria. */
function searchHref(s: {
  q: string | null;
  category: string | null;
  type: string | null;
  minPrice: number | null;
  maxPrice: number | null;
}): string {
  const params = new URLSearchParams();
  const tab =
    s.type === "DONATE"
      ? "donations"
      : s.type === "WANTED"
        ? "wanted"
        : s.type === "LOST" || s.type === "FOUND"
          ? "lostfound"
          : "market";
  if (tab !== "market") params.set("tab", tab);
  if (s.q) params.set("q", s.q);
  if (s.category) params.set("category", s.category);
  if (s.minPrice != null) params.set("min", String(s.minPrice));
  if (s.maxPrice != null) params.set("max", String(s.maxPrice));
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  const { view } = await searchParams;
  const segment = view === "searches" ? "searches" : "items";

  const [favorites, searches] = await Promise.all([
    db.favorite.findMany({
      // Don't surface listings that have since been removed (owner- or
      // moderator-deleted) — they'd link to a 404.
      where: { userId: user.id, listing: { status: { not: "DELETED" } } },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { include: { owner: { select: { displayName: true } } } },
      },
    }),
    db.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold">Saved</h1>

      <nav aria-label="Saved sections" className="mt-3 flex gap-1 border-b border-line">
        {SEGMENTS.map((s) => (
          <Link
            key={s.key}
            href={s.key === "items" ? "/saved" : `/saved?view=${s.key}`}
            aria-current={segment === s.key ? "page" : undefined}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
              segment === s.key ? "text-ink" : "text-faint hover:text-ink"
            }`}
          >
            {s.label}
            {segment === s.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 bg-accent" />
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-5">
        {segment === "items" ? (
          favorites.length === 0 ? (
            <EmptyState
              title="Nothing saved yet"
              hint="Tap the heart on anything to keep an eye on it — we'll tell you about price drops."
              action={<ButtonLink href="/browse">Browse items</ButtonLink>}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {favorites.map((f) => (
                <ListingCard
                  key={f.id}
                  listing={{
                    ...f.listing,
                    type: f.listing.type as never,
                    status: f.listing.status as never,
                  }}
                  favorited={true}
                />
              ))}
            </div>
          )
        ) : searches.length === 0 ? (
          <EmptyState
            title="No saved searches"
            hint="Search and filter on Browse, then tap “Save this search” to get notified about new matches."
            action={<ButtonLink href="/browse">Go to Browse</ButtonLink>}
          />
        ) : (
          <div className="space-y-2">
            {searches.map((s) => (
              <SavedSearchRow
                key={s.id}
                search={{
                  id: s.id,
                  label: s.label,
                  href: searchHref(s),
                  notify: s.notify,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
