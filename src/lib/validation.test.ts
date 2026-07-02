import { describe, expect, it } from "vitest";
import { CATEGORIES, CONDITIONS, MEETUP_SPOT_NAMES } from "@/lib/constants";
import {
  listingSchema,
  messageSchema,
  meetupProposalSchema,
  ratingSchema,
} from "@/lib/validation";

const baseListing = {
  type: "SELL" as const,
  title: "Desk lamp",
  description: "A nice desk lamp in good shape.",
  category: CATEGORIES[0],
  condition: CONDITIONS[0],
  price: 25,
  photos: [] as string[],
};

describe("listingSchema", () => {
  it("accepts a valid SELL listing", () => {
    expect(listingSchema.safeParse(baseListing).success).toBe(true);
  });
  it("rejects a SELL listing with no price", () => {
    expect(listingSchema.safeParse({ ...baseListing, price: undefined }).success).toBe(false);
  });
  it("rejects a too-short title", () => {
    expect(listingSchema.safeParse({ ...baseListing, title: "x" }).success).toBe(false);
  });
  it("accepts and normalizes a course code", () => {
    const r = listingSchema.safeParse({
      ...baseListing,
      courseCode: "  math 1061 ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.courseCode).toBe("MATH 1061");
  });
  it("accepts the compact course-code form", () => {
    const r = listingSchema.safeParse({ ...baseListing, courseCode: "CS2028C" });
    expect(r.success).toBe(true);
  });
  it("rejects a malformed course code", () => {
    expect(
      listingSchema.safeParse({ ...baseListing, courseCode: "not a course" })
        .success
    ).toBe(false);
    expect(
      listingSchema.safeParse({ ...baseListing, courseCode: "1061 MATH" })
        .success
    ).toBe(false);
  });
  it("allows omitting the course code", () => {
    expect(listingSchema.safeParse(baseListing).success).toBe(true);
  });
  it("requires a locationNote for LOST", () => {
    expect(
      listingSchema.safeParse({ ...baseListing, type: "LOST", price: undefined }).success
    ).toBe(false);
  });
  it("accepts LOST with a locationNote", () => {
    const r = listingSchema.safeParse({
      type: "LOST",
      title: "Black backpack",
      description: "Lost near the library yesterday afternoon.",
      category: CATEGORIES[0],
      locationNote: "Langsam 4th floor",
      photos: [],
    });
    expect(r.success).toBe(true);
  });
});

describe("messageSchema", () => {
  it("accepts a normal message", () => {
    expect(messageSchema.safeParse({ conversationId: "c1", body: "hi there" }).success).toBe(true);
  });
  it("rejects a whitespace-only body", () => {
    expect(messageSchema.safeParse({ conversationId: "c1", body: "   " }).success).toBe(false);
  });
  it("rejects an over-long body", () => {
    expect(
      messageSchema.safeParse({ conversationId: "c1", body: "x".repeat(2001) }).success
    ).toBe(false);
  });
});

describe("meetupProposalSchema", () => {
  it("rejects a past datetime", () => {
    expect(
      meetupProposalSchema.safeParse({
        conversationId: "c1",
        spot: MEETUP_SPOT_NAMES[0],
        datetime: "2000-01-01T00:00:00Z",
      }).success
    ).toBe(false);
  });
  it("accepts a future datetime at a known spot", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      meetupProposalSchema.safeParse({
        conversationId: "c1",
        spot: MEETUP_SPOT_NAMES[0],
        datetime: future,
      }).success
    ).toBe(true);
  });
});

describe("ratingSchema", () => {
  it("accepts 1–5 stars", () => {
    expect(ratingSchema.safeParse({ listingId: "l1", toUserId: "u1", stars: 5 }).success).toBe(true);
  });
  it("rejects out-of-range stars", () => {
    expect(ratingSchema.safeParse({ listingId: "l1", toUserId: "u1", stars: 6 }).success).toBe(false);
  });
});
