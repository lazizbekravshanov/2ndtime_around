"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { IconButton } from "@/components/ui/IconButton";
import { DotsIcon, FlagIcon } from "@/components/icons";
import { ReportSheet } from "@/components/ReportSheet";
import { useToast } from "@/components/ui/Toast";
import { blockUser } from "@/lib/actions/safety";

/** Overflow menu on the listing detail: report the listing, or block the owner. */
export function ListingMenu({
  listingId,
  ownerId,
  ownerName,
}: {
  listingId: string;
  ownerId: string;
  ownerName: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function onBlock() {
    startTransition(async () => {
      const res = await blockUser(ownerId);
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setMenuOpen(false);
      toast("You won't hear from them again");
    });
  }

  return (
    <>
      <IconButton aria-label="More options" onClick={() => setMenuOpen(true)}>
        <DotsIcon className="h-5 w-5" />
      </IconButton>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Options">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-paper"
          >
            <FlagIcon className="h-5 w-5 text-faint" />
            Report this listing
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onBlock}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-paper disabled:opacity-50"
          >
            <span className="flex h-5 w-5 items-center justify-center text-faint">
              ⃠
            </span>
            Block {ownerName}
          </button>
        </div>
      </Sheet>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        target={{ kind: "listing", listingId }}
      />
    </>
  );
}
