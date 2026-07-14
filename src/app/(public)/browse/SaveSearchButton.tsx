"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createSavedSearch } from "@/lib/actions/savedSearches";
import type { BrowseParams } from "@/lib/search";
import type { ListingType } from "@/lib/constants";

function tabToType(tab?: string): ListingType | undefined {
  if (tab === "donations") return "DONATE";
  if (tab === "wanted") return "WANTED";
  if (tab === "market" || tab === undefined) return "SELL";
  return undefined; // lost & found = any
}

function defaultLabel(params: BrowseParams): string {
  const parts: string[] = [];
  if (params.q) parts.push(params.q);
  if (params.category) parts.push(params.category);
  if (params.max) parts.push(`under $${params.max}`);
  return parts.join(" · ") || "My saved search";
}

export function SaveSearchButton({
  params,
  signInHref,
}: {
  params: BrowseParams;
  /** When set, the viewer is anonymous: saving a search requires sign-in. */
  signInHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [notify, setNotify] = useState(true);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  // Anonymous visitors sign in before saving a search.
  if (signInHref) {
    return (
      <Link
        href={signInHref}
        className="shrink-0 whitespace-nowrap text-sm font-medium text-faint transition-colors hover:text-ink"
      >
        Sign in to save this search
      </Link>
    );
  }

  function onOpen() {
    setLabel(defaultLabel(params));
    setOpen(true);
  }

  function onSave() {
    startTransition(async () => {
      const res = await createSavedSearch({
        label: label.trim(),
        q: params.q || undefined,
        category: params.category || undefined,
        type: tabToType(params.tab),
        minPrice: params.min ? Number(params.min) : undefined,
        maxPrice: params.max ? Number(params.max) : undefined,
        notify,
      });
      if (!res.ok) {
        toast(res.error, { type: "error" });
        return;
      }
      setOpen(false);
      toast("Search saved");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 whitespace-nowrap text-sm font-medium text-faint transition-colors hover:text-ink"
      >
        Save this search
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Save this search">
        <div className="space-y-4">
          <div>
            <label htmlFor="search-label" className="mb-1.5 block text-sm font-medium">
              Name
            </label>
            <input
              id="search-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              className={inputClasses}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Notify me about new matches</span>
            <Toggle
              checked={notify}
              onChange={setNotify}
              label="Notify me about new matches"
            />
          </div>
          <Button onClick={onSave} disabled={pending || !label.trim()} className="w-full">
            {pending ? "Saving…" : "Save search"}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
