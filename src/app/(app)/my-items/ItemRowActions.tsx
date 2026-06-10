"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { setListingStatus } from "@/lib/actions/listings";
import type { ListingType } from "@/lib/constants";

/** Quick actions per row: edit, complete, delete (with confirmation). */
export function ItemRowActions({
  listingId,
  type,
  status,
}: {
  listingId: string;
  type: ListingType;
  status: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const isLostFound = type === "LOST" || type === "FOUND";
  const doneStatus = isLostFound ? "RESOLVED" : "SOLD";
  const doneLabel = isLostFound
    ? "Resolve"
    : type === "DONATE"
      ? "Given"
      : "Sold";

  async function change(newStatus: string) {
    setPending(true);
    await setListingStatus({ listingId, status: newStatus });
    setPending(false);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden text-xs text-faint sm:inline">Delete?</span>
        <Button variant="danger" size="sm" disabled={pending} onClick={() => change("DELETED")}>
          {pending ? "…" : "Yes"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          No
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <ButtonLink variant="secondary" size="sm" href={`/listing/${listingId}/edit`}>
        Edit
      </ButtonLink>
      {status === "ACTIVE" && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => change(doneStatus)}
          title={`Mark as ${doneLabel.toLowerCase()}`}
        >
          {pending ? "…" : doneLabel}
        </Button>
      )}
      <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    </div>
  );
}
