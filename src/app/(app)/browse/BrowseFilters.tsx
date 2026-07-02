"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { inputClasses, selectClasses } from "@/components/ui/Field";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";

/**
 * Filter row — every control writes to the URL, so filtered views are
 * shareable and the back button works. Search debounces 300ms so results
 * update as you type without a request per keystroke.
 */
export function BrowseFilters({ tab }: { tab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  // One timer PER field — a shared timer would let a keystroke in one field
  // silently cancel another field's pending URL update.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setParamDebounced(key: string, value: string, ms: number) {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => setParam(key, value), ms);
  }

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  // Keep the search box in sync when the URL changes underneath us
  // (back/forward, chip removal, Clear all) — the newest query always wins.
  const urlQ = searchParams.get("q") ?? "";
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  const lf = searchParams.get("lf") ?? "";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            aria-label="Search listings"
            placeholder={
              tab === "lostfound" ? "Search lost & found…" : "Search listings…"
            }
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setParamDebounced("q", e.target.value.trim(), 300);
            }}
            className={`${inputClasses} pl-9`}
          />
        </div>

        {/* On phones the selects stack into full-width tap targets (Fitts's
            Law); they collapse to inline auto-width from sm: up. */}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            aria-label="Category"
            value={searchParams.get("category") ?? ""}
            onChange={(e) => setParam("category", e.target.value)}
            className={`${selectClasses} sm:w-auto`}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(tab === "market" || tab === "donations") && (
            <select
              aria-label="Condition"
              value={searchParams.get("condition") ?? ""}
              onChange={(e) => setParam("condition", e.target.value)}
              className={`${selectClasses} sm:w-auto`}
            >
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {tab === "market" && (
            <select
              aria-label="Sort"
              value={searchParams.get("sort") ?? ""}
              onChange={(e) => setParam("sort", e.target.value)}
              className={`${selectClasses} sm:w-auto`}
            >
              <option value="">Newest</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
            </select>
          )}
        </div>
      </div>

      {tab === "market" && (
        <div className="flex items-center gap-2">
          <label htmlFor="min-price" className="text-sm text-faint">
            Price
          </label>
          <input
            id="min-price"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            aria-label="Minimum price"
            defaultValue={searchParams.get("min") ?? ""}
            onChange={(e) => setParamDebounced("min", e.target.value, 400)}
            className={`${inputClasses} w-24`}
          />
          <span className="text-faint">–</span>
          <input
            id="max-price"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            aria-label="Maximum price"
            defaultValue={searchParams.get("max") ?? ""}
            onChange={(e) => setParamDebounced("max", e.target.value, 400)}
            className={`${inputClasses} w-24`}
          />
        </div>
      )}

      {tab === "lostfound" && (
        <div
          role="group"
          aria-label="Lost or found"
          className="flex gap-2"
        >
          {[
            { value: "", label: "All" },
            { value: "lost", label: "Lost items" },
            { value: "found", label: "Found items" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={lf === opt.value}
              onClick={() => setParam("lf", opt.value)}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                lf === opt.value
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-faint hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
