import { describe, expect, it } from "vitest";
import { quickMeetupSlots, toLocalInputValue } from "./meetupSlots";

describe("toLocalInputValue", () => {
  it("formats local datetime-local values with zero padding", () => {
    expect(toLocalInputValue(new Date(2026, 6, 2, 9, 5))).toBe(
      "2026-07-02T09:05"
    );
  });
});

describe("quickMeetupSlots", () => {
  it("offers today's lunch and afternoon slots in the morning", () => {
    const slots = quickMeetupSlots(new Date(2026, 6, 2, 9, 0));
    expect(slots.map((s) => s.label)).toEqual([
      "Today 12 pm",
      "Today 3 pm",
      "Today 5 pm",
      "Tomorrow 10 am",
    ]);
    expect(slots[0].value).toBe("2026-07-02T12:00");
  });

  it("drops today's slots that are under the 45-minute lead", () => {
    // 4:30 pm — 5 pm is only 30 min away, so today is exhausted
    const slots = quickMeetupSlots(new Date(2026, 6, 2, 16, 30));
    expect(slots.map((s) => s.label)).toEqual([
      "Tomorrow 10 am",
      "Tomorrow 12 pm",
      "Tomorrow 3 pm",
    ]);
    expect(slots[0].value).toBe("2026-07-03T10:00");
  });

  it("keeps a slot exactly 45 minutes out", () => {
    const slots = quickMeetupSlots(new Date(2026, 6, 2, 11, 15));
    expect(slots[0].label).toBe("Today 12 pm");
  });

  it("rolls the date correctly across month boundaries", () => {
    const slots = quickMeetupSlots(new Date(2026, 6, 31, 20, 0));
    expect(slots[0].value).toBe("2026-08-01T10:00");
  });

  it("never returns more than 4 slots and all parse as future dates", () => {
    const now = new Date(2026, 6, 2, 8, 0);
    const slots = quickMeetupSlots(now);
    expect(slots.length).toBeLessThanOrEqual(4);
    for (const s of slots) {
      expect(new Date(s.value).getTime()).toBeGreaterThan(now.getTime());
    }
  });
});
