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
