import { describe, expect, it } from "vitest";
import { median, quantiles } from "@/lib/stats";

describe("quantiles", () => {
  it("returns null for empty input", () => {
    expect(quantiles([])).toBeNull();
  });

  it("computes quartiles for a simple set", () => {
    const q = quantiles([1, 2, 3, 4, 5]);
    expect(q).not.toBeNull();
    expect(q!.p25).toBe(2);
    expect(q!.median).toBe(3);
    expect(q!.p75).toBe(4);
  });

  it("interpolates between values", () => {
    expect(quantiles([10, 20])!.median).toBe(15);
  });

  it("is order-independent", () => {
    expect(quantiles([5, 1, 3, 2, 4])!.median).toBe(3);
  });
});

describe("median", () => {
  it("returns null for empty", () => {
    expect(median([])).toBeNull();
  });

  it("returns the middle value", () => {
    expect(median([2, 4, 6])).toBe(4);
  });
});
