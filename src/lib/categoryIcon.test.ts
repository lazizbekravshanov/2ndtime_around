import { describe, expect, it } from "vitest";
import { categoryIconKey, ICON_KEYS } from "@/lib/categoryIcon";
import { CATEGORIES } from "@/lib/constants";

describe("categoryIconKey", () => {
  it("resolves every real category to a known icon key", () => {
    for (const category of CATEGORIES) {
      expect(ICON_KEYS).toContain(categoryIconKey(category));
    }
  });

  it("falls back for unknown categories instead of throwing", () => {
    expect(categoryIconKey("Not a category")).toBe("box");
    expect(categoryIconKey("")).toBe("box");
  });

  it("gives mapped categories a key distinct from the fallback", () => {
    // If these ever collapse the map has silently broken.
    expect(categoryIconKey("Electronics")).toBe("monitor");
    expect(categoryIconKey("Textbooks & Course Materials")).toBe("book");
    expect(categoryIconKey("Electronics")).not.toBe(
      categoryIconKey("Not a category")
    );
  });
});
