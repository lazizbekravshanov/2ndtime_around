"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { DotsIcon, FlagIcon } from "@/components/icons";
import { ReportSheet } from "@/components/ReportSheet";
import { useToast } from "@/components/ui/Toast";
import { blockUser, unblockUser } from "@/lib/actions/safety";

export function ProfileMenu({
  userId,
  name,
  initialBlocked,
}: {
  userId: string;
  name: string;
  initialBlocked: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggleBlock() {
    const next = !blocked;
    setConfirmingBlock(false);
    startTransition(async () => {
      const res = next ? await blockUser(userId) : await unblockUser(userId);
      if (!res.ok) {
        toast(res.error, { type: "error" });
        return;
      }
      setBlocked(next);
      setMenuOpen(false);
      toast(next ? "You won't hear from them again" : "Unblocked");
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
            Report {name}
          </button>
          {/* Blocking is disruptive, so it takes a two-step confirm —
              matching ListingMenu. Unblocking is benign and acts at once. */}
          {!blocked && confirmingBlock ? (
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="text-sm">
                Block {name}? You won&apos;t see each other&apos;s listings or
                messages.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingBlock(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={toggleBlock}
                  disabled={pending}
                >
                  {pending ? "Blocking…" : "Yes, block"}
                </Button>
              </div>
            </div>
          ) : (
            // Neutral either way: this opens the block confirm, and unblocking
            // is restorative rather than destructive.
            <Button
              variant="secondary"
              onClick={blocked ? toggleBlock : () => setConfirmingBlock(true)}
              disabled={pending}
              className="w-full"
            >
              {blocked ? `Unblock ${name}` : `Block ${name}`}
            </Button>
          )}
        </div>
      </Sheet>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        target={{ kind: "user", userId }}
      />
    </>
  );
}
