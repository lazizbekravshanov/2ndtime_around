import { describe, expect, it } from "vitest";
import { meterPercent, formatDelta } from "@/lib/dataviz";

describe("meterPercent", () => {
  it("returns the ratio as a percentage", () => {
    expect(meterPercent(1, 4)).toBe(25);
    expect(meterPercent(3, 4)).toBe(75);
    expect(meterPercent(4, 4)).toBe(100);
  });

  it("returns 0 for an empty or invalid max (no divide-by-zero)", () => {
    expect(meterPercent(5, 0)).toBe(0);
    expect(meterPercent(5, -2)).toBe(0);
  });

  it("clamps out-of-range values to 0..100", () => {
    expect(meterPercent(9, 4)).toBe(100);
    expect(meterPercent(-3, 4)).toBe(0);
  });

  it("handles a zero value", () => {
    expect(meterPercent(0, 10)).toBe(0);
  });
});

describe("formatDelta", () => {
  it("formats a rise", () => {
    expect(formatDelta(12)).toEqual({ text: "12%", direction: "up" });
  });

  it("formats a fall as a magnitude plus a direction (no sign, no color)", () => {
    expect(formatDelta(-8)).toEqual({ text: "8%", direction: "down" });
  });

  it("treats zero and missing values as flat", () => {
    expect(formatDelta(0)).toEqual({ text: "0%", direction: "flat" });
    expect(formatDelta(null)).toEqual({ text: "0%", direction: "flat" });
    expect(formatDelta(undefined)).toEqual({ text: "0%", direction: "flat" });
  });

  it("rounds fractional deltas", () => {
    expect(formatDelta(12.4)).toEqual({ text: "12%", direction: "up" });
    expect(formatDelta(-0.6)).toEqual({ text: "1%", direction: "down" });
  });
});
