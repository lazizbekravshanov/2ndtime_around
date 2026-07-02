import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/constants";
import {
  activeFilterChips,
  buildListingWhere,
  buildOrderBy,
  parsePage,
  parseTab,
} from "@/lib/search";

describe("parseTab", () => {
  it("defaults to market", () => {
    expect(parseTab(undefined)).toBe("market");
    expect(parseTab("bogus")).toBe("market");
  });
  it("accepts known tabs", () => {
    expect(parseTab("donations")).toBe("donations");
    expect(parseTab("lostfound")).toBe("lostfound");
    expect(parseTab("wanted")).toBe("wanted");
  });
});

describe("parsePage", () => {
  it("defaults to 1 for missing/invalid", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
  });
  it("parses valid page numbers", () => {
    expect(parsePage("2")).toBe(2);
    expect(parsePage("10")).toBe(10);
  });
});

describe("buildListingWhere", () => {
  it("market tab → ACTIVE SELL", () => {
    const w = buildListingWhere({ tab: "market" });
    expect(w.status).toBe("ACTIVE");
    expect(w.type).toBe("SELL");
  });
  it("donations → DONATE", () => {
    expect(buildListingWhere({ tab: "donations" }).type).toBe("DONATE");
  });
  it("lostfound default → LOST or FOUND", () => {
    expect(buildListingWhere({ tab: "lostfound" }).type).toEqual({ in: ["LOST", "FOUND"] });
  });
  it("lostfound lost → LOST only", () => {
    expect(buildListingWhere({ tab: "lostfound", lf: "lost" }).type).toBe("LOST");
  });
  it("applies a valid category", () => {
    const cat = CATEGORIES[0];
    expect(buildListingWhere({ tab: "market", category: cat }).category).toBe(cat);
  });
  it("ignores an invalid category", () => {
    expect(buildListingWhere({ tab: "market", category: "nope" }).category).toBeUndefined();
  });
  it("builds a token AND of 4-field ORs on q (title/description/category/courseCode)", () => {
    const w = buildListingWhere({ tab: "market", q: "lamp" });
    expect(Array.isArray(w.AND)).toBe(true);
    expect(w.AND).toHaveLength(1);
    const first = (w.AND as { OR: unknown[] }[])[0];
    expect(first.OR).toHaveLength(4);
  });
  it("applies the course filter only with the Textbooks category", () => {
    expect(
      buildListingWhere({
        tab: "market",
        category: "Textbooks & Course Materials",
        course: "math",
      }).courseCode
    ).toBeDefined();
    expect(
      buildListingWhere({ tab: "market", course: "math" }).courseCode
    ).toBeUndefined();
  });
  it("requires every token to match (multi-word)", () => {
    const w = buildListingWhere({ tab: "market", q: "early calc" });
    expect(w.AND).toHaveLength(2);
  });
  it("applies a price range on market", () => {
    expect(buildListingWhere({ tab: "market", min: "10", max: "50" }).price).toEqual({
      gte: 10,
      lte: 50,
    });
  });
  it("does not apply price on non-market tabs", () => {
    expect(buildListingWhere({ tab: "donations", min: "10" }).price).toBeUndefined();
  });
  it("hides blocked owners", () => {
    const w = buildListingWhere({ tab: "market" }, { blockedIds: ["u1", "u2"] });
    expect(w.ownerId).toEqual({ notIn: ["u1", "u2"] });
  });
});

describe("buildOrderBy", () => {
  it("defaults to newest first", () => {
    expect(buildOrderBy(undefined)).toEqual({ createdAt: "desc" });
  });
  it("price ascending", () => {
    expect(buildOrderBy("price-asc")).toEqual([{ price: "asc" }, { createdAt: "desc" }]);
  });
  it("price descending", () => {
    expect(buildOrderBy("price-desc")).toEqual([{ price: "desc" }, { createdAt: "desc" }]);
  });
});

describe("activeFilterChips", () => {
  it("none for empty params", () => {
    expect(activeFilterChips({})).toEqual([]);
  });
  it("one chip per active filter, in order", () => {
    const chips = activeFilterChips({
      q: "lamp",
      category: CATEGORIES[0],
      min: "5",
      max: "20",
    });
    expect(chips.map((c) => c.key)).toEqual(["q", "category", "min", "max"]);
  });
});
