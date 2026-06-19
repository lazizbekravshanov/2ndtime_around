import { describe, expect, it } from "vitest";
import { computeBadges, type UserStats } from "@/lib/badges";

const base: UserStats = {
  itemsRehomed: 0,
  donations: 0,
  foundReturned: 0,
  purchases: 0,
  avgRating: 0,
  ratingCount: 0,
  avgFirstReplyMins: null,
  replyThreads: 0,
};

describe("computeBadges", () => {
  it("returns every badge locked for an empty profile", () => {
    const badges = computeBadges(base);
    expect(badges.length).toBeGreaterThanOrEqual(5);
    expect(badges.every((b) => !b.earned)).toBe(true);
  });

  it("earns Trusted Trader at 5 ratings averaging 4.5+", () => {
    const b = computeBadges({ ...base, ratingCount: 5, avgRating: 4.6 }).find(
      (x) => x.key === "trusted_trader"
    );
    expect(b!.earned).toBe(true);
  });

  it("does not earn Trusted Trader below the rating threshold", () => {
    const b = computeBadges({ ...base, ratingCount: 5, avgRating: 4.0 }).find(
      (x) => x.key === "trusted_trader"
    );
    expect(b!.earned).toBe(false);
  });

  it("earns Good Samaritan after returning a found item", () => {
    const b = computeBadges({ ...base, foundReturned: 1 }).find(
      (x) => x.key === "good_samaritan"
    );
    expect(b!.earned).toBe(true);
  });

  it("clamps progress to the 0..1 range", () => {
    const b = computeBadges({ ...base, itemsRehomed: 100 }).find(
      (x) => x.key === "sustainability_star"
    );
    expect(b!.progress).toBe(1);
    expect(b!.earned).toBe(true);
  });
});
