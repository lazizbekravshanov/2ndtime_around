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
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggleBlock() {
    const next = !blocked;
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
          <Button
            variant="danger"
            onClick={toggleBlock}
            disabled={pending}
            className="w-full"
          >
            {blocked ? `Unblock ${name}` : `Block ${name}`}
          </Button>
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
