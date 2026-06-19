import { db } from "@/lib/db";

// All aggregates are computed server-side with groupBy/count — never by
// pulling full tables to the client. The returned shape is plain/serializable
// so it can be handed straight to the (client) charts.

const DAY_MS = 24 * 60 * 60 * 1000;

export type TermCount = { query: string; count: number };
export type CategoryDemand = {
  category: string;
  sell: number;
  wanted: number;
  donate: number;
  lost: number;
};
export type FunnelStage = { label: string; count: number };
export type VolumePoint = { label: string; date: string; count: number };

export type FunnelData = {
  kpis: {
    totalUsers: number;
    activeListings: number;
    completedExchanges: number;
    totalSearches: number;
  };
  topTerms: TermCount[];
  zeroResultTerms: TermCount[];
  volume: VolumePoint[];
  categoryDemand: CategoryDemand[];
  funnel: FunnelStage[];
  recentListings: {
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
  }[];
  recentSearches: {
    query: string;
    tab: string;
    resultCount: number;
    createdAt: string;
  }[];
};

function bucketByDay(dates: Date[], days = 30): VolumePoint[] {
  const counts = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Pre-seed every day so gaps render as zero, not missing.
  const points: VolumePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    counts.set(key, 0);
    points.push({
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: 0,
    });
  }
  for (const d of dates) {
    const key = new Date(d).toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const p of points) p.count = counts.get(p.date) ?? 0;
  return points;
}

export async function getFunnelData(): Promise<FunnelData> {
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const [
    totalUsers,
    activeListings,
    completedExchanges,
    totalSearches,
    topTermsRaw,
    zeroTermsRaw,
    recentDates,
    catGroups,
    posted,
    viewed,
    withConversations,
    completed,
    recentListings,
    recentSearches,
  ] = await Promise.all([
    db.user.count(),
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.listing.count({ where: { status: { in: ["SOLD", "RESOLVED"] } } }),
    db.searchEvent.count(),
    db.searchEvent.groupBy({
      by: ["query"],
      where: { query: { not: "" } },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
    db.searchEvent.groupBy({
      by: ["query"],
      where: { resultCount: 0, query: { not: "" } },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
    db.searchEvent.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
    db.listing.groupBy({
      by: ["category", "type"],
      where: { status: { not: "DELETED" } },
      _count: { _all: true },
    }),
    db.listing.count({ where: { status: { not: "DELETED" } } }),
    db.listing.count({ where: { status: { not: "DELETED" }, viewCount: { gt: 0 } } }),
    db.listing.count({ where: { status: { not: "DELETED" }, conversations: { some: {} } } }),
    db.listing.count({ where: { status: { in: ["SOLD", "RESOLVED"] } } }),
    db.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, type: true, status: true, createdAt: true },
    }),
    db.searchEvent.findMany({
      where: { query: { not: "" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { query: true, tab: true, resultCount: true, createdAt: true },
    }),
  ]);

  // Pivot category × type into one row per category.
  const byCategory = new Map<string, CategoryDemand>();
  for (const g of catGroups) {
    const row =
      byCategory.get(g.category) ??
      { category: g.category, sell: 0, wanted: 0, donate: 0, lost: 0 };
    const n = g._count._all;
    if (g.type === "SELL") row.sell += n;
    else if (g.type === "WANTED") row.wanted += n;
    else if (g.type === "DONATE") row.donate += n;
    else if (g.type === "LOST" || g.type === "FOUND") row.lost += n;
    byCategory.set(g.category, row);
  }
  const categoryDemand = [...byCategory.values()].sort(
    (a, b) =>
      b.sell + b.wanted + b.donate + b.lost - (a.sell + a.wanted + a.donate + a.lost)
  );

  return {
    kpis: { totalUsers, activeListings, completedExchanges, totalSearches },
    topTerms: topTermsRaw.map((t) => ({ query: t.query, count: t._count.query })),
    zeroResultTerms: zeroTermsRaw.map((t) => ({
      query: t.query,
      count: t._count.query,
    })),
    volume: bucketByDay(recentDates.map((r) => r.createdAt)),
    categoryDemand,
    funnel: [
      { label: "Posted", count: posted },
      { label: "Viewed", count: viewed },
      { label: "Conversations", count: withConversations },
      { label: "Completed", count: completed },
    ],
    recentListings: recentListings.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    recentSearches: recentSearches.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}
