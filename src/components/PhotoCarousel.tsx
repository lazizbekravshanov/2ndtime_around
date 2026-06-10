"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/** Simple, keyboard-friendly photo carousel: arrows + dot indicators. */
export function PhotoCarousel({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-line bg-surface text-sm text-faint">
        No photos for this listing
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
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface/90 p-1.5 hover:bg-surface"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface/90 p-1.5 hover:bg-surface"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex justify-center gap-2" role="tablist">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === index ? "bg-accent" : "bg-line hover:bg-faint"
              }`}
            />
          ))}
        </div>
      )}
    </figure>
  );
}
