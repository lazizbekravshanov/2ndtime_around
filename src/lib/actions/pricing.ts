"use server";

import { db } from "@/lib/db";
import { quantiles } from "@/lib/stats";

const MS_180_DAYS = 180 * 24 * 60 * 60 * 1000;

export type PriceSuggestion = {
  count: number;
  median?: number;
  p25?: number;
  p75?: number;
};

/**
 * Suggest a fair price from recent comparable SELL listings in the same
 * category. Returns just a count when there's too little data — never
 * fabricates a suggestion from fewer than 3 comparables.
 */
export async function suggestPrice(input: {
  category: string;
}): Promise<PriceSuggestion> {
  const since = new Date(Date.now() - MS_180_DAYS);
  const listings = await db.listing.findMany({
    where: {
      type: "SELL",
      status: { in: ["ACTIVE", "SOLD"] },
      category: input.category,
      price: { not: null },
      createdAt: { gte: since },
    },
    select: { price: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const prices = listings
    .map((l) => l.price)
    .filter((p): p is number => p !== null);

  if (prices.length < 3) return { count: prices.length };

  const q = quantiles(prices)!;
  return {
    count: prices.length,
    median: Math.round(q.median),
    p25: Math.round(q.p25),
    p75: Math.round(q.p75),
  };
}
