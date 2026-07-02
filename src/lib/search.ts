import type { Prisma } from "@prisma/client";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";

/**
 * Case-insensitive `contains` filter that works on both providers. Postgres
 * needs the explicit `mode`; SQLite's LIKE is already case-insensitive and the
 * SQLite client doesn't type `mode`. The single source of truth for search.
 */
export function likeFilter(q: string): Prisma.StringFilter {
  const onPostgres = process.env.DATABASE_URL?.startsWith("postgres");
  return (
    onPostgres ? { contains: q, mode: "insensitive" } : { contains: q }
  ) as unknown as Prisma.StringFilter;
}

export const BROWSE_TABS = [
  { key: "market", label: "Marketplace" },
  { key: "donations", label: "Donations" },
  { key: "lostfound", label: "Lost & Found" },
  { key: "wanted", label: "Wanted" },
] as const;

export type TabKey = (typeof BROWSE_TABS)[number]["key"];

export function parseTab(value?: string): TabKey {
  return BROWSE_TABS.some((t) => t.key === value)
    ? (value as TabKey)
    : "market";
}

export type BrowseParams = {
  tab?: string;
  q?: string;
  category?: string;
  /** Course-code filter — only meaningful with the Textbooks category. */
  course?: string;
  condition?: string;
  min?: string;
  max?: string;
  sort?: string;
  lf?: string;
  page?: string;
};

/** Listings shown per browse page. */
export const PAGE_SIZE = 48;

/** Parse the 1-based page number from params, clamped to a sane minimum. */
export function parsePage(value?: string): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Tabs where a price range / condition / sort make sense. */
export const PRICED_TABS: TabKey[] = ["market"];

/**
 * Centralizes the browse `where` construction so search behaves identically
 * everywhere. `blockedIds` hides listings owned by users the viewer blocked
 * (or who blocked the viewer).
 */
export function buildListingWhere(
  params: BrowseParams,
  opts: { blockedIds?: string[] } = {}
): Prisma.ListingWhereInput {
  const tab = parseTab(params.tab);
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };

  if (tab === "market") where.type = "SELL";
  else if (tab === "donations") where.type = "DONATE";
  else if (tab === "wanted") where.type = "WANTED";
  else if (tab === "lostfound") {
    where.type =
      params.lf === "lost"
        ? "LOST"
        : params.lf === "found"
          ? "FOUND"
          : { in: ["LOST", "FOUND"] };
  }

  if (params.q) {
    // Tokenize so multi-word queries match regardless of order or adjacency:
    // every token must appear in the title, description, or category. A single
    // token still does a case-insensitive substring match (so "calc" finds
    // "Calculus…" and "headph" finds "…headphones"), but "early calc" now also
    // matches "Calculus: Early Transcendentals". Capped to bound query size.
    const tokens = params.q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
    if (tokens.length > 0) {
      where.AND = tokens.map((t) => {
        const match = likeFilter(t);
        return {
          OR: [
            { title: match },
            { description: match },
            { category: match },
            // "phys 2001" should find the textbook listed for that course.
            { courseCode: match },
          ],
        };
      }) as Prisma.ListingWhereInput[];
    }
  }

  if (
    params.category &&
    (CATEGORIES as readonly string[]).includes(params.category)
  ) {
    where.category = params.category;
  }

  if (
    params.condition &&
    (CONDITIONS as readonly string[]).includes(params.condition)
  ) {
    where.condition = params.condition;
  }

  // Course filter rides along with the Textbooks category (bounded input).
  if (params.course && params.category === "Textbooks & Course Materials") {
    where.courseCode = likeFilter(params.course.trim().slice(0, 12));
  }

  if (tab === "market") {
    const min = Number(params.min);
    const max = Number(params.max);
    const price: { gte?: number; lte?: number } = {};
    if (params.min && !Number.isNaN(min)) price.gte = min;
    if (params.max && !Number.isNaN(max)) price.lte = max;
    if (price.gte !== undefined || price.lte !== undefined) where.price = price;
  }

  if (opts.blockedIds && opts.blockedIds.length > 0) {
    where.ownerId = { notIn: opts.blockedIds };
  }

  return where;
}

export function buildOrderBy(
  sort?: string
): Prisma.ListingOrderByWithRelationInput | Prisma.ListingOrderByWithRelationInput[] {
  if (sort === "price-asc") return [{ price: "asc" }, { createdAt: "desc" }];
  if (sort === "price-desc") return [{ price: "desc" }, { createdAt: "desc" }];
  return { createdAt: "desc" };
}

/** Active filters as labeled chips, for the dismissible filter row. */
export function activeFilterChips(
  params: BrowseParams
): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  if (params.q) chips.push({ key: "q", label: `“${params.q}”` });
  if (params.category) chips.push({ key: "category", label: params.category });
  if (params.course)
    chips.push({ key: "course", label: params.course.toUpperCase() });
  if (params.condition) chips.push({ key: "condition", label: params.condition });
  if (params.min) chips.push({ key: "min", label: `min $${params.min}` });
  if (params.max) chips.push({ key: "max", label: `max $${params.max}` });
  return chips;
}
