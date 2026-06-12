"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { XIcon, PlusIcon } from "@/components/icons";
import { inputClasses, selectClasses } from "@/components/ui/Field";
import { CATEGORIES } from "@/lib/constants";
import { createMoveoutBatch } from "@/lib/actions/moveout";

type Row = {
  key: number;
  title: string;
  category: string;
  free: boolean;
  price: string;
};

const blankRow = (key: number): Row => ({
  key,
  title: "",
  category: CATEGORIES[0],
  free: false,
  price: "",
});

export function MoveoutForm() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([blankRow(0), blankRow(1), blankRow(2)]);
  const [locationNote, setLocationNote] = useState("");
  const [nextKey, setNextKey] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, blankRow(nextKey)]);
    setNextKey((k) => k + 1);
  }
  function removeRow(key: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  const filled = rows.filter((r) => r.title.trim().length >= 3);

  async function submit() {
    setError(null);
    if (filled.length === 0) {
      setError("Add at least one item with a title.");
      return;
    }
    setSubmitting(true);
    const res = await createMoveoutBatch({
      locationNote: locationNote.trim() || undefined,
      items: filled.map((r) => ({
        title: r.title.trim(),
        category: r.category,
        free: r.free,
        price: r.free || !r.price ? undefined : Number(r.price),
        photos: [],
      })),
    });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.error);
      return;
    }
    router.push(`/moveout/${res.data.batchId}`);
  }

  return (
    <div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.key}
            className="rounded-xl border border-line bg-surface p-3"
          >
            <div className="flex items-start gap-2">
              <input
                aria-label="Item title"
                placeholder="What is it? e.g. Desk lamp"
                value={r.title}
                onChange={(e) => update(r.key, { title: e.target.value })}
                className={`${inputClasses} flex-1`}
              />
              <IconButton
                aria-label="Remove item"
                onClick={() => removeRow(r.key)}
              >
                <XIcon className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                aria-label="Category"
                value={r.category}
                onChange={(e) => update(r.key, { category: e.target.value })}
                className={`${selectClasses} w-auto flex-1`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {!r.free && (
                <div className="relative w-24">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">
                    $
                  </span>
                  <input
                    aria-label="Price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="0"
                    value={r.price}
                    onChange={(e) => update(r.key, { price: e.target.value })}
                    className={`${inputClasses} pl-7`}
                  />
                </div>
              )}
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={r.free}
                  onChange={(e) => update(r.key, { free: e.target.checked })}
                  className="accent-[var(--color-ink)]"
                />
                Free
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-faint transition-colors hover:text-ink"
      >
        <PlusIcon className="h-4 w-4" />
        Add another item
      </button>

      <div className="mt-5">
        <label htmlFor="moveout-location" className="mb-1.5 block text-sm font-medium">
          Pickup area <span className="font-normal text-faint">optional</span>
        </label>
        <input
          id="moveout-location"
          placeholder="e.g. Calhoun Hall, near the lobby"
          value={locationNote}
          onChange={(e) => setLocationNote(e.target.value)}
          className={inputClasses}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-faint">
          {filled.length} {filled.length === 1 ? "item" : "items"} ready
        </p>
        <Button onClick={submit} disabled={submitting || filled.length === 0}>
          {submitting ? "Posting…" : `Post ${filled.length || ""} ${filled.length === 1 ? "item" : "items"}`}
        </Button>
      </div>
    </div>
  );
}
