import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/**
 * Items kept out of landfills = completed sales + completed donations.
 * (Resolved lost & found items are recoveries, not landfill diversions,
 * so they don't count here.)
 *
 * Cached for 5 minutes: it renders in the footer on every page and on the
 * landing page, but it's a slow-moving vanity metric — no need to run a
 * full-table count on every navigation.
 */
export const getImpactCount = unstable_cache(
  async (): Promise<number> =>
    db.listing.count({
      where: {
        type: { in: ["SELL", "DONATE"] },
        status: { in: ["SOLD", "RESOLVED"] },
      },
    }),
  ["impact-count"],
  { revalidate: 300 }
);

export type ImpactStats = {
  itemsKept: number; // completed sales + donations — diverted from landfill
  soldValue: number; // total $ of completed sales — money kept among students
  donated: number; // completed donations — items given away free
};

/**
 * Headline campus-impact numbers for the landing page — all derived from real
 * completed listings. Cached 5 min (slow-moving, runs on a public page).
 */
export const getImpactStats = unstable_cache(
  async (): Promise<ImpactStats> => {
    const [itemsKept, soldAgg, donated] = await Promise.all([
      db.listing.count({
        where: {
          type: { in: ["SELL", "DONATE"] },
          status: { in: ["SOLD", "RESOLVED"] },
        },
      }),
      db.listing.aggregate({
        where: { type: "SELL", status: "SOLD" },
        _sum: { price: true },
      }),
      db.listing.count({
        where: { type: "DONATE", status: { in: ["SOLD", "RESOLVED"] } },
      }),
    ]);
    return { itemsKept, soldValue: soldAgg._sum.price ?? 0, donated };
  },
  ["impact-stats"],
  { revalidate: 300 }
);
