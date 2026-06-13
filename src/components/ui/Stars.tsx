"use client";

import { useRef, useState } from "react";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-4 w-4 ${filled ? "fill-ink" : "fill-line"}`}
    >
      <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8L10 1.5z" />
    </svg>
  );
}

/** Read-only star row, e.g. "★★★★☆ 4.2 (8)". */
export function StarRating({
  value,
  count,
}: {
  value: number;
  count?: number;
}) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex gap-0.5"
        role="img"
        aria-label={`${value.toFixed(1)} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= rounded} />
        ))}
      </span>
      <span className="text-sm text-faint">
        {value.toFixed(1)}
        {count !== undefined && ` (${count})`}
      </span>
    </span>
  );
}

/** Interactive 1–5 star picker, keyboard accessible (radio group). */
export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (stars: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys raise/lower the rating; only the active star is tab-focusable
  // (roving tabindex) per the WAI-ARIA radiogroup pattern.
  function onKey(e: React.KeyboardEvent, n: number) {
    let next = n;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(5, n + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      next = Math.max(1, n - 1);
    else return;
    e.preventDefault();
    onChange(next);
    starRefs.current[next - 1]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      className="inline-flex gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          ref={(el) => {
            starRefs.current[n - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          onKeyDown={(e) => onKey(e, n)}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded p-1 hover:bg-line/50"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`h-6 w-6 transition-colors ${
              n <= shown ? "fill-ink" : "fill-line"
            }`}
          >
            <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.8L10 1.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
