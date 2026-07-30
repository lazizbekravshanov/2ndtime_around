import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatPrice,
  meetupTime,
  monthYear,
  photoList,
  priceSlot,
  timeAgo,
} from "@/lib/format";

describe("formatPrice", () => {
  it("formats whole dollars", () => expect(formatPrice(25)).toBe("$25"));
  it("adds thousands separators", () => expect(formatPrice(1234)).toBe("$1,234"));
  it("keeps two decimals for non-integers", () => expect(formatPrice(25.5)).toBe("$25.50"));
  it("handles zero", () => expect(formatPrice(0)).toBe("$0"));
});

describe("photoList", () => {
  it("passes through a string array", () => expect(photoList(["a", "b"])).toEqual(["a", "b"]));
  it("filters out non-strings", () => expect(photoList(["a", 1, null, "b"])).toEqual(["a", "b"]));
  it("parses a JSON-encoded array", () => expect(photoList('["x","y"]')).toEqual(["x", "y"]));
  it("returns [] for non-array / garbage", () => {
    expect(photoList(null)).toEqual([]);
    expect(photoList("not json")).toEqual([]);
    expect(photoList(42)).toEqual([]);
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const ago = (ms: number) => new Date(Date.now() - ms);

  it("'just now' under a minute", () => expect(timeAgo(ago(30_000))).toBe("just now"));
  it("minutes", () => expect(timeAgo(ago(5 * 60_000))).toBe("5m ago"));
  it("hours", () => expect(timeAgo(ago(3 * 60 * 60_000))).toBe("3h ago"));
  it("days", () => expect(timeAgo(ago(2 * 24 * 60 * 60_000))).toBe("2d ago"));
  it("falls back to a date after a week", () => {
    expect(timeAgo(ago(10 * 24 * 60 * 60_000))).not.toMatch(/ago|just now/);
  });
});

describe("monthYear", () => {
  it("formats as full month + year", () => {
    expect(monthYear(new Date("2025-09-15T00:00:00Z"))).toMatch(/September 2025/);
  });
});

describe("meetupTime", () => {
  it("renders a weekday-and-time string", () => {
    expect(meetupTime("2026-06-20T15:30:00")).toContain("at");
  });
});

describe("priceSlot", () => {
  it("shows the price for a sale", () => {
    expect(priceSlot("SELL", 35)).toEqual({ text: "$35", muted: false });
    expect(priceSlot("SELL", 12.5)).toEqual({ text: "$12.50", muted: false });
  });

  it("shows Free for a donation, at full weight", () => {
    expect(priceSlot("DONATE", null)).toEqual({ text: "Free", muted: false });
    // A donation with a stray price is still free.
    expect(priceSlot("DONATE", 20)).toEqual({ text: "Free", muted: false });
  });

  it("shows the type for listings that have no price, muted", () => {
    expect(priceSlot("LOST", null)).toEqual({ text: "Lost", muted: true });
    expect(priceSlot("FOUND", null)).toEqual({ text: "Found", muted: true });
    expect(priceSlot("WANTED", null)).toEqual({
      text: "Looking for",
      muted: true,
    });
  });

  it("never returns an empty slot, so the grid rhythm holds", () => {
    for (const t of ["SELL", "DONATE", "LOST", "FOUND", "WANTED", "ODD"]) {
      expect(priceSlot(t, null).text.trim()).not.toBe("");
    }
  });

  it("falls back rather than rendering blank for a priceless sale", () => {
    expect(priceSlot("SELL", null)).toEqual({ text: "—", muted: true });
  });
});
