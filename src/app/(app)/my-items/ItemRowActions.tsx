"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { setListingStatus } from "@/lib/actions/listings";
import type { ListingType } from "@/lib/constants";

type Confirm = "done" | "delete" | null;

/** Quick actions per row: edit, complete, delete — both destructive actions
 *  are gated by a confirmation modal naming the item. */
export function ItemRowActions({
  listingId,
  title,
  type,
  status,
}: {
  listingId: string;
  title: string;
  type: ListingType;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pending, setPending] = useState(false);

  const isLostFound = type === "LOST" || type === "FOUND";
  const doneStatus = isLostFound ? "RESOLVED" : "SOLD";
  const doneLabel = isLostFound ? "Resolve" : type === "DONATE" ? "Given" : "Sold";
  // Past tense for the confirmation copy: "Mark … as sold/given/resolved?"
  const doneWord = isLostFound ? "resolved" : type === "DONATE" ? "given" : "sold";

  async function change(newStatus: string) {
    setPending(true);
    const result = await setListingStatus({ listingId, status: newStatus });
    setPending(false);
    if (!result.ok) {
      // Keep the modal open so the user can retry — a silent failure that
      // closes and refreshes would look like success.
      toast(result.error, { type: "error" });
      return;
    }
    setConfirm(null);
    toast(newStatus === "DELETED" ? "Listing deleted" : `Marked as ${doneWord}`);
    router.refresh();
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5">
        <ButtonLink
          variant="secondary"
          size="sm"
          href={`/listing/${listingId}/edit`}
        >
          Edit
        </ButtonLink>
        {status === "ACTIVE" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirm("done")}
            title={`Mark as ${doneWord}`}
          >
            {doneLabel}
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={() => setConfirm("delete")}>
          Delete
        </Button>
      </div>

      <Sheet
        open={confirm !== null}
        onClose={() => {
          if (!pending) setConfirm(null);
        }}
        title={confirm === "delete" ? "Delete listing" : `Mark as ${doneWord}`}
      >
        <p className="text-sm text-faint">
          {confirm === "delete" ? (
            <>
              Delete <span className="font-medium text-ink">{title}</span>? This
              cannot be undone.
            </>
          ) : (
            <>
              Mark <span className="font-medium text-ink">{title}</span> as{" "}
              {doneWord}? This will archive the listing.
            </>
          )}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setConfirm(null)}
            disabled={pending}
          >
            Cancel
          </Button>
          {confirm === "delete" ? (
            // Red (solid accent) confirm for the irreversible action.
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => change("DELETED")}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => change(doneStatus)}
            >
              {pending ? "Saving…" : `Mark as ${doneWord}`}
            </Button>
          )}
        </div>
      </Sheet>
    </>
  );
}
