import { db } from "@/lib/db";

/**
 * Items kept out of landfills = completed sales + completed donations.
 * (Resolved lost & found items are recoveries, not landfill diversions,
 * so they don't count here.)
 */
export async function getImpactCount(): Promise<number> {
  return db.listing.count({
    where: {
      type: { in: ["SELL", "DONATE"] },
      status: { in: ["SOLD", "RESOLVED"] },
    },
  });
}
