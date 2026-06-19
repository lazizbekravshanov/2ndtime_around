import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { parseRange, type RangeKey } from "@/lib/funnelRange";

// All aggregates are computed server-side with groupBy/count/aggregate — never
// by pulling full tables to the client. Every metric respects the active date
// range. Returned shapes are plain/serializable for the (client) charts.

const DAY_MS = 24 * 60 * 60 * 1000;

// Re-export range helpers so existing server-side importers keep working.
export { parseRange, RANGE_OPTIONS } from "@/lib/funnelRange";
export type { RangeKey, Range } from "@/lib/funnelRange";

const createdIn = (since: Date | null, until: Date | null = null) =>
  since ? { gte: since, ...(until ? { lt: until } : {}) } : undefined;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Kpi = { key: string; label: string; value: number; prev: number | null };
export type TermCount = { query: string; count: number };
export type VolumePoint = { label: string; date: string; count: number; avg: number | null };
export type CategoryDemand = {
  category: string;
  sell: number;
  wanted: number;
  donate: number;
  lost: number;
  supply: number;
  searches: number;
  demandIndex: number | null; // null = no supply to divide by
};
export type FunnelStage = { key: string; label: string; count: number };
export type CompletionByCategory = { category: string; completed: number; posted: number };
export type Exception = { label: string; detail: string; href: string };

export type FunnelData = {
  rangeKey: RangeKey;
  rangeLabel: string;
  refreshedAt: string;
  kpis: Kpi[];
  topTerms: TermCount[];
  zeroResultTerms: TermCount[];
  volume: VolumePoint[];
  volumeNote: string;
  categoryDemand: CategoryDemand[];
  funnel: FunnelStage[];
  health: {
    completionDays: { median: number | null; average: number | null; sample: number };
    completionByCategory: CompletionByCategory[];
    mostViewed: { id: string; title: string; category: string; viewCount: number }[];
  };
  exceptions: Exception[];
  recentListings: { id: string; title: string; type: string; status: string; createdAt: string }[];
  recentSearches: { query: string; tab: string; resultCount: number; createdAt: string }[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function movingAverage(points: VolumePoint[], window = 7): void {
  for (let i = 0; i < points.length; i++) {
    if (i < window - 1) {
      points[i].avg = null;
      continue;
    }
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += points[j].count;
    points[i].avg = Math.round((sum / window) * 10) / 10;
  }
}

function bucketByDay(dates: Date[], days: number): VolumePoint[] {
  const counts = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points: VolumePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    counts.set(key, 0);
    points.push({
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: 0,
      avg: null,
    });
  }
  for (const d of dates) {
    const key = new Date(d).toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const p of points) p.count = counts.get(p.date) ?? 0;
  movingAverage(points);
  return points;
}

// ---------------------------------------------------------------------------
// Main aggregate
// ---------------------------------------------------------------------------

async function computeFunnelData(rangeKey: RangeKey, catSort: string): Promise<FunnelData> {
  const range = parseRange(rangeKey);
  const created = createdIn(range.since);
  const prevCreated = createdIn(range.prevSince, range.prevUntil);
  const cutoff21 = new Date(Date.now() - 21 * DAY_MS);
  const volumeSince = new Date(Date.now() - range.volumeDays * DAY_MS);

  const [
    // KPIs (current)
    newUsers,
    listingsPosted,
    completedExchanges,
    searches,
    // KPIs (prev) — null windows resolve to 0 and we hide the delta for all-time
    prevUsers,
    prevListings,
    prevCompleted,
    prevSearches,
    // search insights
    topTermsRaw,
    zeroTermsRaw,
    volumeDates,
    // category demand
    supplyGroups,
    typeGroups,
    searchCatGroups,
    // funnel cohort (listings created in window)
    posted,
    viewed,
    withConversations,
    completedCohort,
    // health
    completionRows,
    completionPostedGroups,
    completionDoneGroups,
    mostViewed,
    // exceptions
    staleActive,
    highViewsNoMsg,
    // recent
    recentListings,
    recentSearches,
  ] = await Promise.all([
    db.user.count({ where: { createdAt: created } }),
    db.listing.count({ where: { createdAt: created, status: { not: "DELETED" } } }),
    db.listing.count({ where: { completedAt: created ?? { not: null } } }),
    db.searchEvent.count({ where: { createdAt: created } }),
    range.prevSince ? db.user.count({ where: { createdAt: prevCreated } }) : Promise.resolve(0),
    range.prevSince
      ? db.listing.count({ where: { createdAt: prevCreated, status: { not: "DELETED" } } })
      : Promise.resolve(0),
    range.prevSince
      ? db.listing.count({ where: { completedAt: prevCreated } })
      : Promise.resolve(0),
    range.prevSince ? db.searchEvent.count({ where: { createdAt: prevCreated } }) : Promise.resolve(0),
    db.searchEvent.groupBy({
      by: ["query"],
      where: { query: { not: "" }, createdAt: created },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
    db.searchEvent.groupBy({
      by: ["query"],
      where: { resultCount: 0, query: { not: "" }, createdAt: created },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
    db.searchEvent.findMany({
      where: { createdAt: { gte: volumeSince } },
      select: { createdAt: true },
    }),
    // supply = currently-active SELL/DONATE per category
    db.listing.groupBy({
      by: ["category"],
      where: { status: "ACTIVE", type: { in: ["SELL", "DONATE"] } },
      _count: { _all: true },
    }),
    db.listing.groupBy({
      by: ["category", "type"],
      where: { status: { not: "DELETED" }, ...(created ? { createdAt: created } : {}) },
      _count: { _all: true },
    }),
    db.searchEvent.groupBy({
      by: ["category"],
      where: { category: { not: null }, createdAt: created },
      _count: { _all: true },
    }),
    db.listing.count({ where: { createdAt: created, status: { not: "DELETED" } } }),
    db.listing.count({ where: { createdAt: created, status: { not: "DELETED" }, viewCount: { gt: 0 } } }),
    db.listing.count({ where: { createdAt: created, conversations: { some: {} } } }),
    db.listing.count({ where: { createdAt: created, status: { in: ["SOLD", "RESOLVED"] } } }),
    db.listing.findMany({
      where: { completedAt: created ?? { not: null } },
      select: { createdAt: true, completedAt: true },
    }),
    db.listing.groupBy({
      by: ["category"],
      where: { type: { in: ["SELL", "DONATE"] }, ...(created ? { createdAt: created } : {}) },
      _count: { _all: true },
    }),
    db.listing.groupBy({
      by: ["category"],
      where: { status: { in: ["SOLD", "RESOLVED"] }, type: { in: ["SELL", "DONATE"] }, ...(created ? { createdAt: created } : {}) },
      _count: { _all: true },
    }),
    db.listing.findMany({
      where: { status: "ACTIVE", ...(created ? { createdAt: created } : {}) },
      orderBy: { viewCount: "desc" },
      take: 8,
      select: { id: true, title: true, category: true, viewCount: true },
    }),
    db.listing.count({ where: { status: "ACTIVE", createdAt: { lt: cutoff21 } } }),
    db.listing.count({ where: { status: "ACTIVE", viewCount: { gte: 8 }, conversations: { none: {} } } }),
    db.listing.findMany({
      where: created ? { createdAt: created } : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, type: true, status: true, createdAt: true },
    }),
    db.searchEvent.findMany({
      where: { query: { not: "" }, ...(created ? { createdAt: created } : {}) },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { query: true, tab: true, resultCount: true, createdAt: true },
    }),
  ]);

  // ---- category demand pivot ----
  const supplyByCat = new Map(supplyGroups.map((g) => [g.category, g._count._all]));
  const searchesByCat = new Map(searchCatGroups.map((g) => [g.category as string, g._count._all]));
  const byCat = new Map<string, CategoryDemand>();
  for (const g of typeGroups) {
    const row =
      byCat.get(g.category) ??
      {
        category: g.category,
        sell: 0,
        wanted: 0,
        donate: 0,
        lost: 0,
        supply: supplyByCat.get(g.category) ?? 0,
        searches: searchesByCat.get(g.category) ?? 0,
        demandIndex: null as number | null,
      };
    const n = g._count._all;
    if (g.type === "SELL") row.sell += n;
    else if (g.type === "WANTED") row.wanted += n;
    else if (g.type === "DONATE") row.donate += n;
    else if (g.type === "LOST" || g.type === "FOUND") row.lost += n;
    byCat.set(g.category, row);
  }
  // categories that only show up via searches (no listings yet) still matter
  for (const [cat, count] of searchesByCat) {
    if (!byCat.has(cat)) {
      byCat.set(cat, {
        category: cat,
        sell: 0,
        wanted: 0,
        donate: 0,
        lost: 0,
        supply: supplyByCat.get(cat) ?? 0,
        searches: count,
        demandIndex: null,
      });
    }
  }
  const categoryDemand = [...byCat.values()].map((c) => ({
    ...c,
    demandIndex: c.supply > 0 ? Math.round(((c.wanted + c.searches) / c.supply) * 100) / 100 : null,
  }));
  categoryDemand.sort((a, b) => {
    if (catSort === "demand") {
      // null demand (no supply) sorts last
      const ai = a.demandIndex ?? -1;
      const bi = b.demandIndex ?? -1;
      if (bi !== ai) return bi - ai;
    }
    const at = a.sell + a.wanted + a.donate + a.lost;
    const bt = b.sell + b.wanted + b.donate + b.lost;
    return bt - at;
  });

  // ---- time to completion ----
  const durations = completionRows
    .filter((r) => r.completedAt)
    .map((r) => (new Date(r.completedAt as Date).getTime() - new Date(r.createdAt).getTime()) / DAY_MS)
    .filter((d) => d >= 0);
  const med = median(durations);
  const avg =
    durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : null;

  // ---- completion rate by category ----
  const postedByCat = new Map(completionPostedGroups.map((g) => [g.category, g._count._all]));
  const doneByCat = new Map(completionDoneGroups.map((g) => [g.category, g._count._all]));
  const completionByCategory: CompletionByCategory[] = [...postedByCat.entries()]
    .map(([category, posted]) => ({ category, posted, completed: doneByCat.get(category) ?? 0 }))
    .filter((c) => c.posted > 0)
    .sort((a, b) => b.completed / b.posted - a.completed / a.posted);

  // ---- exceptions ----
  const exceptions: Exception[] = [];
  if (zeroTermsRaw.length > 0) {
    const top = zeroTermsRaw[0];
    exceptions.push({
      label: "Zero-result searches",
      detail: `"${top.query}" returned nothing (${top._count.query}×) — unmet demand.`,
      href: "#search-insights",
    });
  }
  if (staleActive > 0) {
    exceptions.push({
      label: "Stale listings",
      detail: `${staleActive} active listing${staleActive === 1 ? "" : "s"} older than 21 days.`,
      href: "?drill=older-21",
    });
  }
  if (highViewsNoMsg > 0) {
    exceptions.push({
      label: "Interest, no contact",
      detail: `${highViewsNoMsg} active listing${highViewsNoMsg === 1 ? "" : "s"} with 8+ views but no messages.`,
      href: "?drill=high-views-no-msg",
    });
  }
  const underSupplied = categoryDemand
    .filter((c) => c.demandIndex !== null && c.demandIndex > 1)
    .slice(0, 1);
  if (underSupplied.length > 0) {
    const c = underSupplied[0];
    exceptions.push({
      label: "Demand outpaces supply",
      detail: `${c.category}: demand index ${c.demandIndex} (${c.wanted + c.searches} wanted/searches vs ${c.supply} supply).`,
      href: "#category-demand",
    });
  }

  return {
    rangeKey: range.key,
    rangeLabel: range.label,
    refreshedAt: new Date().toISOString(),
    kpis: [
      { key: "users", label: "New users", value: newUsers, prev: range.prevSince ? prevUsers : null },
      { key: "posted", label: "Listings posted", value: listingsPosted, prev: range.prevSince ? prevListings : null },
      { key: "completed", label: "Completed exchanges", value: completedExchanges, prev: range.prevSince ? prevCompleted : null },
      { key: "searches", label: "Searches", value: searches, prev: range.prevSince ? prevSearches : null },
    ],
    topTerms: topTermsRaw.map((t) => ({ query: t.query, count: t._count.query })),
    zeroResultTerms: zeroTermsRaw.map((t) => ({ query: t.query, count: t._count.query })),
    volume: bucketByDay(volumeDates.map((r) => r.createdAt), range.volumeDays),
    volumeNote: range.key === "all" ? "Showing the last 90 days." : range.label,
    categoryDemand,
    funnel: [
      { key: "posted", label: "Posted", count: posted },
      { key: "viewed", label: "Viewed", count: viewed },
      { key: "conversations", label: "Conversations", count: withConversations },
      { key: "completed", label: "Completed", count: completedCohort },
    ],
    health: {
      completionDays: {
        median: med === null ? null : Math.round(med * 10) / 10,
        average: avg === null ? null : Math.round(avg * 10) / 10,
        sample: durations.length,
      },
      completionByCategory,
      mostViewed,
    },
    exceptions,
    recentListings: recentListings.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    recentSearches: recentSearches.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
  };
}

// Briefly cached per (range, sort) so repeated loads stay fast; the manual
// Refresh action busts it via revalidateTag("funnel").
export function getFunnelData(rangeKey: RangeKey, catSort: string): Promise<FunnelData> {
  return unstable_cache(
    () => computeFunnelData(rangeKey, catSort),
    ["funnel", rangeKey, catSort],
    { revalidate: 60, tags: ["funnel"] }
  )();
}

// ---------------------------------------------------------------------------
// Drilldown (progressive disclosure) — filtered listing lists on demand
// ---------------------------------------------------------------------------

export type DrillRow = { id: string; title: string; category: string; status: string; viewCount: number };
export type Drilldown = { title: string; description: string; rows: DrillRow[] } | null;

export async function getDrilldown(key: string | undefined, rangeKey: RangeKey): Promise<Drilldown> {
  if (!key) return null;
  const created = createdIn(parseRange(rangeKey).since);
  const select = { id: true, title: true, category: true, status: true, viewCount: true } as const;
  const take = 50;

  let where: Prisma.ListingWhereInput | null = null;
  let title = "";
  let description = "";

  if (key === "older-21") {
    title = "Active listings older than 21 days";
    description = "Consider nudging the owner or archiving.";
    where = { status: "ACTIVE", createdAt: { lt: new Date(Date.now() - 21 * DAY_MS) } };
  } else if (key === "high-views-no-msg" || key === "funnel:viewed-no-msg") {
    title = "Viewed but no messages";
    description = "Listings drawing views that never converted to a conversation.";
    where = { status: "ACTIVE", viewCount: { gte: 8 }, conversations: { none: {} } };
  } else if (key.startsWith("funnel:")) {
    const stage = key.slice("funnel:".length);
    const base = { ...(created ? { createdAt: created } : {}), status: { not: "DELETED" } };
    if (stage === "posted") { title = "Posted"; where = base; }
    else if (stage === "viewed") { title = "Viewed"; where = { ...base, viewCount: { gt: 0 } }; }
    else if (stage === "conversations") { title = "With conversations"; where = { ...base, conversations: { some: {} } }; }
    else if (stage === "completed") { title = "Completed"; where = { ...base, status: { in: ["SOLD", "RESOLVED"] } }; }
    description = "Listings in this funnel stage for the selected range.";
  } else if (key.startsWith("cat:")) {
    const category = key.slice("cat:".length);
    title = `Active listings — ${category}`;
    description = "Currently-available listings in this category.";
    where = { status: "ACTIVE", category };
  }

  if (!where) return null;
  const rows = await db.listing.findMany({
    where,
    orderBy: { viewCount: "desc" },
    take,
    select,
  });
  return { title, description, rows };
}
