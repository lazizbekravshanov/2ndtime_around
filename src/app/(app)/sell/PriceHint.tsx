"use client";

import { useEffect, useState } from "react";
import { suggestPrice, type PriceSuggestion } from "@/lib/actions/pricing";

/** Quiet pricing helper under the price input. Never blocks submission. */
export function PriceHint({
  category,
  onUse,
}: {
  category?: string;
  onUse: (value: number) => void;
}) {
  const [data, setData] = useState<PriceSuggestion | null>(null);

  useEffect(() => {
    if (!category) {
      setData(null);
      return;
    }
    let active = true;
    suggestPrice({ category })
      .then((r) => {
        if (active) setData(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [category]);

  if (!data) return null;

  if (data.count < 3 || data.median === undefined) {
    return (
      <p className="mt-1.5 text-xs text-faint">
        Not enough recent data — price it your way.
      </p>
    );
  }

  return (
    <p className="mt-1.5 text-xs text-faint">
      Similar items recently: ${data.p25}–${data.p75} (median ${data.median}).{" "}
      <button
        type="button"
        onClick={() => onUse(data.median!)}
        className="font-medium text-ink underline"
      >
        Use ${data.median}
      </button>
    </p>
  );
}
