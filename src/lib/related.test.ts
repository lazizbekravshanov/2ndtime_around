import { describe, expect, it } from "vitest";
import { moreFromSellerWhere, similarItemsWhere } from "@/lib/related";

describe("moreFromSellerWhere", () => {
  it("restricts to the seller's other active listings", () => {
    const where = moreFromSellerWhere({ ownerId: "u1", excludeId: "l1" });
    expect(where.status).toBe("ACTIVE");
    expect(where.ownerId).toBe("u1");
    expect(where.id).toEqual({ not: "l1" });
  });

  it("omits the block clause when nothing is blocked", () => {
    expect(moreFromSellerWhere({ ownerId: "u1", excludeId: "l1" })).not.toHaveProperty(
      "NOT"
    );
  });

  it("honors blocks so the rail is not a way around them", () => {
    const where = moreFromSellerWhere({
      ownerId: "u1",
      excludeId: "l1",
      blockedIds: ["u9"],
    });
    expect(where.NOT).toEqual({ ownerId: { in: ["u9"] } });
  });
});

describe("similarItemsWhere", () => {
  it("restricts to active listings in the same category", () => {
    const where = similarItemsWhere({
      category: "Furniture",
      ownerId: "u1",
      excludeId: "l1",
    });
    expect(where.status).toBe("ACTIVE");
    expect(where.category).toBe("Furniture");
    expect(where.id).toEqual({ not: "l1" });
  });

  it("excludes the seller, whose items already have their own rail", () => {
    const where = similarItemsWhere({
      category: "Furniture",
      ownerId: "u1",
      excludeId: "l1",
    });
    expect(where.NOT).toEqual({ ownerId: { in: ["u1"] } });
  });

  it("excludes blocked sellers alongside the owner", () => {
    const where = similarItemsWhere({
      category: "Furniture",
      ownerId: "u1",
      excludeId: "l1",
      blockedIds: ["u9", "u8"],
    });
    expect(where.NOT).toEqual({ ownerId: { in: ["u1", "u9", "u8"] } });
  });
});
