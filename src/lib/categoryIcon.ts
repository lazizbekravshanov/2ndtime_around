/**
 * Category → icon *key*, used to give a photoless listing card something to say.
 *
 * This returns a key rather than a component so the mapping stays plain data
 * and can be unit-tested without pulling JSX through the test runner. The
 * key→component lookup lives in `src/components/CategoryGlyph.tsx`.
 *
 * Categories without a dedicated glyph fall back to the neutral box rather
 * than borrowing a nearby-but-wrong one: a generic mark reads as "no photo",
 * a wrong one reads as a mislabeled item.
 */

export const ICON_KEYS = [
  "book",
  "monitor",
  "lamp",
  "bike",
  "music",
  "brush",
  "tag",
  "box",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

const BY_CATEGORY: Record<string, IconKey> = {
  "Textbooks & Course Materials": "book",
  Electronics: "monitor",
  "Dorm & Apartment Essentials": "lamp",
  "Bikes & Transit": "bike",
  "Music & Instruments": "music",
  "Art & Design Supplies": "brush",
  "Tickets & Events": "tag",
};

/** The icon key for a category, or the neutral fallback for unmapped ones. */
export function categoryIconKey(category: string): IconKey {
  return BY_CATEGORY[category] ?? "box";
}
