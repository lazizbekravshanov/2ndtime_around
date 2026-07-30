"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { CategoryGlyph } from "@/components/CategoryGlyph";

/** Simple, keyboard-friendly photo carousel: arrows + dot indicators. */
export function PhotoCarousel({
  photos,
  title,
  category,
}: {
  photos: string[];
  title: string;
  /** Names the empty state, so a photoless listing still says something. */
  category: string;
}) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      // Matches the photoless treatment on cards and my-items rows. A full 4:3
      // box saying "No photos" cost an entire phone screen before the price —
      // this states the same fact in a fraction of the height, and names the
      // category so the space says something.
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-line bg-line/25 px-4 py-14 text-center text-faint sm:aspect-[4/3] sm:py-0">
        <CategoryGlyph category={category} className="h-10 w-10" />
        <span className="text-sm">{category}</span>
        <span className="text-xs">No photos yet</span>
      </div>
    );
  }

  return (
    <figure>
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[index]}
          alt={`${title} — photo ${index + 1} of ${photos.length}`}
          className="aspect-[4/3] w-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() =>
                setIndex((i) => (i - 1 + photos.length) % photos.length)
              }
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/90 hover:bg-surface"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/90 hover:bg-surface"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {/* Plain dot buttons, not a tablist — there's no tabpanel relationship
          or arrow-key roving here, so tab roles would over-promise to AT. */}
      {photos.length > 1 && (
        <div className="mt-1 flex justify-center gap-1">
          {photos.map((_, i) => (
            // The visible dot stays small, but the tap target is a full
            // 44px-tall hit area (WCAG 2.5.5) so it's thumb-reachable.
            <button
              key={i}
              type="button"
              aria-current={i === index}
              aria-label={`Photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className="flex h-11 w-8 items-center justify-center"
            >
              <span
                className={`block h-2 w-2 rounded-full transition-colors ${
                  i === index ? "bg-accent" : "bg-line"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
