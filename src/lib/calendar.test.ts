import { describe, expect, it } from "vitest";
import { toIcs } from "@/lib/calendar";

const ics = toIcs({
  spot: "Langsam Library lobby",
  datetime: "2026-06-20T15:30:00Z",
  uid: "abc",
  otherName: "Maya, C.",
});

describe("toIcs", () => {
  it("is a well-formed VCALENDAR with one VEVENT", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("uses CRLF line endings", () => {
    expect(ics).toContain("\r\n");
  });

  it("includes the uid and location", () => {
    expect(ics).toContain("UID:abc@2ndtimearound");
    expect(ics).toContain("LOCATION:Langsam Library lobby");
  });

  it("sets a 30-minute window in UTC", () => {
    expect(ics).toMatch(/DTSTART:20260620T153000Z/);
    expect(ics).toMatch(/DTEND:20260620T160000Z/);
  });

  it("escapes commas in text fields", () => {
    expect(ics).toContain("Maya\\, C.");
  });
});
