"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { textareaClasses } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { reportListing, reportUser } from "@/lib/actions/safety";

const REASONS = [
  { value: "SCAM", label: "Scam or fraud" },
  { value: "PROHIBITED", label: "Prohibited item" },
  { value: "SPAM", label: "Spam or duplicate" },
  { value: "INAPPROPRIATE", label: "Inappropriate content" },
  { value: "HARASSMENT", label: "Harassment or abuse" },
  { value: "OTHER", label: "Other" },
] as const;

const DETAIL_MAX = 300;

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
        toast(res.error, { type: "error" });
        return;
      }
      setReason("");
      setDetail("");
      onClose();
      toast("Report submitted. We'll review it shortly.");
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
        onChange={(e) => setDetail(e.target.value.slice(0, DETAIL_MAX))}
        maxLength={DETAIL_MAX}
        placeholder={
          reason === "OTHER"
            ? "Tell us what's wrong"
            : "Add any detail (optional)"
        }
        className={`${textareaClasses} mt-3`}
      />
      <p className="mt-1 text-right text-xs text-faint">
        {detail.length}/{DETAIL_MAX}
      </p>
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
