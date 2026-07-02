import { describe, expect, it } from "vitest";
import {
  currentSemester,
  daysUntilMoveOut,
  MOVEOUT_WINDOW_DAYS,
} from "./semester";

describe("currentSemester", () => {
  it("maps dates to the right semester", () => {
    expect(currentSemester(new Date(2026, 1, 10)).name).toBe("Spring 2026");
    expect(currentSemester(new Date(2026, 4, 10)).name).toBe("Summer 2026");
    expect(currentSemester(new Date(2026, 6, 2)).name).toBe("Summer 2026");
    expect(currentSemester(new Date(2026, 7, 15)).name).toBe("Fall 2026");
    expect(currentSemester(new Date(2026, 11, 31)).name).toBe("Fall 2026");
  });

  it("produces a stable per-semester key", () => {
    expect(currentSemester(new Date(2026, 6, 2)).key).toBe("summer-2026");
    expect(currentSemester(new Date(2026, 9, 1)).key).toBe("fall-2026");
  });

  it("move-out lands inside its own semester", () => {
    for (const d of [new Date(2026, 1, 1), new Date(2026, 5, 1), new Date(2026, 8, 1)]) {
      const s = currentSemester(d);
      expect(s.moveOut.getTime()).toBeGreaterThan(s.start.getTime());
    }
  });
});

describe("daysUntilMoveOut", () => {
  it("returns the countdown inside the window", () => {
    // Apr 10 → Apr 30 move-out = 20 days
    expect(daysUntilMoveOut(new Date(2026, 3, 10))).toBe(20);
    // move-out day itself still shows (0 days)
    expect(daysUntilMoveOut(new Date(2026, 3, 30))).toBe(0);
  });

  it("returns null outside the window or after move-out", () => {
    // early February — way more than the window before Apr 30
    expect(daysUntilMoveOut(new Date(2026, 1, 1))).toBeNull();
    // May 1 is past spring move-out AND >window before summer's Aug 14
    expect(daysUntilMoveOut(new Date(2026, 4, 1))).toBeNull();
  });

  it("never exceeds the window", () => {
    const d = daysUntilMoveOut(new Date(2026, 6, 2));
    if (d !== null) expect(d).toBeLessThanOrEqual(MOVEOUT_WINDOW_DAYS);
  });
});
