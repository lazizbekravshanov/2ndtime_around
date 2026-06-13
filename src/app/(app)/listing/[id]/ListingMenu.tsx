"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { BanIcon, DotsIcon, FlagIcon } from "@/components/icons";
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
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  // Reset the confirm step whenever the sheet is closed.
  function closeMenu() {
    setMenuOpen(false);
    setConfirmingBlock(false);
  }

  function onBlock() {
    startTransition(async () => {
      const res = await blockUser(ownerId);
      if (!res.ok) {
        toast(res.error, { type: "error" });
        return;
      }
      closeMenu();
      toast("You won't hear from them again");
    });
  }

  return (
    <>
      <IconButton aria-label="More options" onClick={() => setMenuOpen(true)}>
        <DotsIcon className="h-5 w-5" />
      </IconButton>

      <Sheet open={menuOpen} onClose={closeMenu} title="Options">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              closeMenu();
              setReportOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-paper"
          >
            <FlagIcon className="h-5 w-5 text-faint" />
            Report this listing
          </button>
          {confirmingBlock ? (
            // Blocking severs every conversation with this person, so confirm
            // first — matching the two-step protection we give Delete.
            <div className="rounded-lg border border-line p-3">
              <p className="flex items-center gap-2 text-sm">
                <BanIcon className="h-5 w-5 shrink-0 text-faint" />
                Block {ownerName}? You won&apos;t see their listings or messages.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={pending}
                  onClick={onBlock}
                >
                  {pending ? "Blocking…" : `Yes, block`}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingBlock(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingBlock(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-paper"
            >
              <BanIcon className="h-5 w-5 text-faint" />
              Block {ownerName}
            </button>
          )}
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
