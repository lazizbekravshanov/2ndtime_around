import { describe, expect, it } from "vitest";
import {
  isDiversionWindowOpen,
  MARKET_FACTS,
  UC_DIVERSION,
} from "@/lib/marketFacts";

describe("isDiversionWindowOpen", () => {
  it("is open on the first and last day of the window", () => {
    expect(isDiversionWindowOpen(new Date("2026-07-24T00:00:00Z"))).toBe(true);
    expect(isDiversionWindowOpen(new Date("2026-08-02T23:59:00Z"))).toBe(true);
  });

  it("is open mid-window", () => {
    expect(isDiversionWindowOpen(new Date("2026-07-28T12:00:00Z"))).toBe(true);
  });

  it("is closed the day after — the case that made the old copy false", () => {
    expect(isDiversionWindowOpen(new Date("2026-08-03T00:00:00Z"))).toBe(false);
  });

  it("is closed before the window opens", () => {
    expect(isDiversionWindowOpen(new Date("2026-07-23T23:00:00Z"))).toBe(false);
  });

  it("is closed in a later year, so the claim cannot go stale silently", () => {
    expect(isDiversionWindowOpen(new Date("2027-07-28T12:00:00Z"))).toBe(false);
  });
});

describe("market facts integrity", () => {
  it("every opportunity figure carries a source and a link", () => {
    expect(MARKET_FACTS.length).toBeGreaterThan(0);
    for (const f of MARKET_FACTS) {
      expect(f.source.trim()).not.toBe("");
      expect(f.href).toMatch(/^https:\/\//);
      expect(f.label.trim()).not.toBe("");
    }
  });

  it("keeps the window label undated so it survives the window closing", () => {
    expect(UC_DIVERSION.windowLabel).not.toMatch(/\d{4}/);
  });
});
