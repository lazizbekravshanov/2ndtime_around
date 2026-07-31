import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A listing without a photo must show its category, never an empty box.
 *
 * This was wrong in four separate places before anyone noticed it was one rule
 * rather than four bugs: browse cards, my-items rows, the listing-detail
 * carousel, and both Messages thumbnails. Each rendered some variation of a
 * blank panel or the words "No photo".
 *
 * The rule is enforced here rather than remembered, because the next surface
 * that renders a listing thumbnail will be written by someone who never saw
 * this discussion.
 *
 * The check is deliberately narrow: a file only has to import CategoryGlyph if
 * it both resolves listing photos *and* renders an <img> itself. Files that
 * merely pass photos to a component that handles the fallback (the landing
 * strip, listing detail) are correctly ignored.
 */

const SRC = join(process.cwd(), "src");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

describe("photoless listings show a category glyph", () => {
  const offenders = tsxFiles(SRC)
    .map((file) => ({ file, src: readFileSync(file, "utf8") }))
    .filter(({ src }) => src.includes("photoList(") && src.includes("<img"))
    .filter(({ src }) => !src.includes("CategoryGlyph"))
    .map(({ file }) => file.replace(SRC, "src"));

  it("every surface rendering a listing photo has a glyph fallback", () => {
    expect(offenders).toEqual([]);
  });

  it("no 'No photo' text stands on its own without a glyph beside it", () => {
    // Explaining the absence is fine — PhotoCarousel says "No photos yet"
    // under a glyph and the category name, and that reads well in a large
    // panel. What's banned is the text *instead of* the glyph.
    const bare = tsxFiles(SRC)
      .map((file) => ({ file, src: readFileSync(file, "utf8") }))
      .filter(({ src }) => {
        const code = src
          .replace(/\/\/[^\n]*/g, "")
          .replace(/\/\*[\s\S]*?\*\//g, "");
        return /No photos?\b/.test(code) && !code.includes("CategoryGlyph");
      })
      .map(({ file }) => file.replace(SRC, "src"));
    expect(bare).toEqual([]);
  });
});
