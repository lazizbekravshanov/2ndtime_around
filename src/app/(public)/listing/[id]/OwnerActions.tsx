"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { setListingStatus } from "@/lib/actions/listings";
import type { ListingType } from "@/lib/constants";

/**
 * Owner controls: Edit, Mark as sold/given/resolved, Delete.
 * Deleting is destructive, so it requires an explicit inline confirmation —
 * the button swaps to "Are you sure?" instead of acting immediately.
 */
export function OwnerActions({
  listingId,
  type,
  status,
}: {
  listingId: string;
  type: ListingType;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLostFound = type === "LOST" || type === "FOUND";
  const doneStatus = isLostFound ? "RESOLVED" : "SOLD";
  const doneLabel = isLostFound
    ? "Mark as resolved"
    : type === "DONATE"
      ? "Mark as given"
      : "Mark as sold";

  async function changeStatus(newStatus: string) {
    setPending(newStatus);
    setError(null);
    const result = await setListingStatus({ listingId, status: newStatus });
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (newStatus === "DELETED") {
      toast("Listing deleted");
      router.push("/my-items");
      return;
    }
    toast(
      newStatus === "ACTIVE"
        ? "Relisted as active"
        : `Marked as ${doneLabel.replace("Mark as ", "")}`
    );
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-faint">
        This is your listing
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink variant="secondary" size="sm" href={`/listing/${listingId}/edit`}>
          Edit
        </ButtonLink>

        {status === "ACTIVE" && (
          <Button
            variant="secondary"
            size="sm"
            disabled={pending !== null}
            onClick={() => changeStatus(doneStatus)}
          >
            {pending === doneStatus ? "Saving…" : doneLabel}
          </Button>
        )}
        {(status === "SOLD" || status === "RESOLVED") && (
          <Button
            variant="secondary"
            size="sm"
            disabled={pending !== null}
            onClick={() => changeStatus("ACTIVE")}
          >
            {pending === "ACTIVE" ? "Saving…" : "Relist as active"}
          </Button>
        )}

        {confirmingDelete ? (
          <span className="inline-flex items-center gap-2">
            <span className="text-sm text-faint">Delete for good?</span>
            <Button
              variant="danger"
              size="sm"
              disabled={pending !== null}
              onClick={() => changeStatus("DELETED")}
            >
              {pending === "DELETED" ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </span>
        ) : (
          // Neutral until confirmed — the red lives on "Yes, delete" above.
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
