"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { textareaClasses } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { reportListing, reportUser } from "@/lib/actions/safety";

const REASONS = [
  { value: "SPAM", label: "Spam or fake listing" },
  { value: "PROHIBITED", label: "Prohibited item" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SCAM", label: "Scam or fraud" },
  { value: "OTHER", label: "Something else" },
] as const;

export type ReportTarget =
  | { kind: "listing"; listingId: string }
  | { kind: "user"; userId: string };

export function ReportSheet({
  open,
  onClose,
  target,
}: {
  open: boolean;
  onClose: () => void;
  target: ReportTarget;
}) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit() {
    if (!reason) return;
    startTransition(async () => {
      const res =
        target.kind === "listing"
          ? await reportListing({ listingId: target.listingId, reason, detail })
          : await reportUser({ reportedUserId: target.userId, reason, detail });
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setReason("");
      setDetail("");
      onClose();
      toast("Thanks — our team will take a look");
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={target.kind === "listing" ? "Report listing" : "Report user"}
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">Reason</legend>
        {REASONS.map((r) => (
          <label
            key={r.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              reason === r.value ? "border-ink" : "border-line hover:bg-paper"
            }`}
          >
            <input
              type="radio"
              name="report-reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="accent-[var(--color-ink)]"
            />
            {r.label}
          </label>
        ))}
      </fieldset>
      <textarea
        rows={3}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        maxLength={500}
        placeholder="Add any detail (optional)"
        className={`${textareaClasses} mt-3`}
      />
      <Button
        onClick={submit}
        disabled={!reason || pending}
        className="mt-4 w-full"
      >
        {pending ? "Submitting…" : "Submit report"}
      </Button>
    </Sheet>
  );
}
