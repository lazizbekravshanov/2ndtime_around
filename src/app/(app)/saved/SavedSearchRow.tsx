"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { IconButton } from "@/components/ui/IconButton";
import { XIcon } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";
import {
  deleteSavedSearch,
  toggleSavedSearchNotify,
} from "@/lib/actions/savedSearches";

export type SavedSearchRowData = {
  id: string;
  label: string;
  href: string;
  notify: boolean;
};

export function SavedSearchRow({ search }: { search: SavedSearchRowData }) {
  const [notify, setNotify] = useState(search.notify);
  const [removed, setRemoved] = useState(false);
  const [, startTransition] = useTransition();
  const toast = useToast();

  if (removed) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
      <Link href={search.href} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{search.label}</p>
        <p className="text-xs text-faint">Tap to run this search</p>
      </Link>
      <div className="flex items-center gap-1.5">
        <Toggle
          checked={notify}
          label="Notify me about new matches"
          onChange={(next) => {
            setNotify(next); // optimistic
            startTransition(async () => {
              const res = await toggleSavedSearchNotify(search.id);
              if (!res.ok) {
                setNotify(!next);
                toast(res.error, { type: "error" });
              }
            });
          }}
        />
        <IconButton
          aria-label="Delete saved search"
          onClick={() => {
            setRemoved(true); // optimistic
            startTransition(async () => {
              const res = await deleteSavedSearch(search.id);
              if (!res.ok) {
                setRemoved(false);
                toast(res.error, { type: "error" });
              } else {
                toast("Deleted");
              }
            });
          }}
        >
          <XIcon className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
