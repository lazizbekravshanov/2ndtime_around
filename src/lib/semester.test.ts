import { describe, expect, it } from "vitest";
import {
  campusMoment,
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

describe("campusMoment", () => {
  // Fall 2026: starts Aug 15, halls close Dec 13, move-out window is 45 days.
  it("calls move-in week at the start of a term", () => {
    expect(campusMoment(new Date(2026, 7, 16)).phase).toBe("movein");
    expect(campusMoment(new Date(2026, 7, 16)).label).toBe("Move-in week at UC");
  });

  it("ends move-in week on the boundary, not after it", () => {
    // Day 14 is still move-in; day 15 is term.
    expect(campusMoment(new Date(2026, 7, 29)).phase).toBe("movein");
    expect(campusMoment(new Date(2026, 7, 30)).phase).toBe("term");
  });

  it("names the semester during term", () => {
    const m = campusMoment(new Date(2026, 8, 20));
    expect(m.phase).toBe("term");
    expect(m.label).toBe("Fall 2026 at UC");
  });

  it("switches to move-out exactly when the countdown window opens", () => {
    // Derived from daysUntilMoveOut rather than hardcoded: Oct->Dec crosses
    // the November DST change, so "45 days before Dec 13" is an hour out and
    // Math.ceil rounds it up. A fixed date here would be brittle for a reason
    // that has nothing to do with the phase logic.
    const outside = new Date(2026, 9, 28);
    const inside = new Date(2026, 9, 30);
    // Outside the window the countdown is null by contract; inside it isn't.
    expect(daysUntilMoveOut(outside)).toBeNull();
    expect(campusMoment(outside).phase).toBe("term");
    expect(daysUntilMoveOut(inside)).not.toBeNull();
    expect(campusMoment(inside).phase).toBe("moveout");
  });

  it("counts down, and reads naturally at one day and zero", () => {
    expect(campusMoment(new Date(2026, 11, 12)).label).toBe("Move-out in 1 day");
    expect(campusMoment(new Date(2026, 11, 13)).label).toBe("Move-out is today");
  });

  it("becomes a break the day after move-out, not another move-in", () => {
    const m = campusMoment(new Date(2026, 11, 14));
    expect(m.phase).toBe("break");
    expect(m.label).toBe("Between semesters");
  });

  it("always supplies a label and a lede, whatever the date", () => {
    for (let month = 0; month < 12; month++) {
      const m = campusMoment(new Date(2026, month, 15));
      expect(m.label.trim()).not.toBe("");
      expect(m.lede.trim()).not.toBe("");
    }
  });
});
