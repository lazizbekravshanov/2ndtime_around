import { describe, expect, it } from "vitest";
import { viewOutcome } from "@/lib/listingVisibility";
import type { ListingStatus } from "@/lib/constants";

const NON_ACTIVE: ListingStatus[] = ["DRAFT", "SOLD", "RESOLVED"];

describe("viewOutcome", () => {
  it("renders active listings for anyone", () => {
    expect(viewOutcome({ status: "ACTIVE", isOwner: false })).toBe("ok");
    expect(viewOutcome({ status: "ACTIVE", isOwner: true })).toBe("ok");
  });

  it("treats deleted listings as not found for everyone", () => {
    expect(viewOutcome({ status: "DELETED", isOwner: false })).toBe("notFound");
    expect(viewOutcome({ status: "DELETED", isOwner: true })).toBe("notFound");
  });

  it("hides non-active listings from non-owners as generically unavailable", () => {
    for (const status of NON_ACTIVE) {
      expect(viewOutcome({ status, isOwner: false })).toBe("unavailable");
    }
  });

  it("lets the owner view their own draft / sold / resolved listings", () => {
    for (const status of NON_ACTIVE) {
      expect(viewOutcome({ status, isOwner: true })).toBe("ok");
    }
  });
});
