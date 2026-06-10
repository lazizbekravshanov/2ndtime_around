import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { ListingCard, ListingCardSkeleton } from "@/components/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { BrowseFilters } from "./BrowseFilters";

export const metadata = { title: "Browse" };

const TABS = [
  { key: "market", label: "Marketplace" },
  { key: "donations", label: "Donations" },
  { key: "lostfound", label: "Lost & Found" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type SearchParams = {
  tab?: string;
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  sort?: string;
  lf?: string;
};

function parseTab(value?: string): TabKey {
  return TABS.some((t) => t.key === value) ? (value as TabKey) : "market";
}

async function Results({ params }: { params: SearchParams }) {
  const tab = parseTab(params.tab);

  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  if (tab === "market") where.type = "SELL";
  if (tab === "donations") where.type = "DONATE";
  if (tab === "lostfound") {
    where.type =
      params.lf === "lost"
        ? "LOST"
        : params.lf === "found"
          ? "FOUND"
          : { in: ["LOST", "FOUND"] };
  }
  if (params.q) {
    // SQLite's LIKE is already case-insensitive; Postgres needs the
    // explicit mode (which the SQLite client doesn't type, hence the cast).
    const onPostgres = process.env.DATABASE_URL?.startsWith("postgres");
    const match = onPostgres
      ? { contains: params.q, mode: "insensitive" }
      : { contains: params.q };
    where.OR = [
      { title: match },
      { description: match },
    ] as Prisma.ListingWhereInput[];
  }
  if (params.category && (CATEGORIES as readonly string[]).includes(params.category)) {
    where.category = params.category;
  }
  if (tab === "market") {
    const min = Number(params.min);
    const max = Number(params.max);
    if (params.min && !Number.isNaN(min)) where.price = { gte: min };
    if (params.max && !Number.isNaN(max)) {
      where.price = {
        ...(typeof where.price === "object" ? where.price : {}),
        lte: max,
      };
    }
  }

  const listings = await db.listing.findMany({
    where,
    include: { owner: { select: { displayName: true } } },
    orderBy:
      params.sort === "price-asc"
        ? [{ price: "asc" }, { createdAt: "desc" }]
        : { createdAt: "desc" },
    take: 60,
  });

  if (listings.length === 0) {
    const hasFilters = Boolean(params.q || params.category || params.min || params.max);
    return (
      <EmptyState
        title={hasFilters ? "Nothing matches those filters" : "Nothing here yet"}
        hint={
          hasFilters
            ? "Try a broader search or clear a filter — new items show up all day."
            : tab === "lostfound"
              ? "No lost or found items reported right now. Hopefully it stays that way!"
              : "Be the first — posting takes under a minute."
        }
        action={
          hasFilters ? (
            <ButtonLink variant="secondary" href={`/browse?tab=${tab}`}>
              Clear filters
            </ButtonLink>
          ) : (
            <ButtonLink href="/sell">Post the first item</ButtonLink>
          )
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((l) => (
        <ListingCard
          key={l.id}
          listing={{
            ...l,
            type: l.type as never,
            status: l.status as never,
          }}
        />
      ))}
    </div>
  );
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tab = parseTab(params.tab);

  return (
    <div>
      <h1 className="sr-only">Browse</h1>

      {/* Tab bar — the three worlds of the app */}
      <nav aria-label="Sections" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "market" ? "/browse" : `/browse?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? "text-ink" : "text-faint hover:text-ink"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 bg-accent" />
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        <BrowseFilters tab={tab} />
      </div>

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
