"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { StarPicker } from "@/components/ui/Stars";
import { CheckIcon } from "@/components/icons";
import { submitRating } from "@/lib/actions/ratings";

/**
 * One-tap rating prompt shown to both parties once an exchange completes:
 * tap a star count, optionally add a short note, done.
 */
export function RatingPrompt({
  listingId,
  toUserId,
  otherName,
}: {
  listingId: string;
  toUserId: string;
  otherName: string;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="mt-3 rounded-xl border border-line bg-surface p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckIcon className="h-4 w-4" />
          Thanks — your rating helps other Bearcats trade with confidence.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stars === 0) {
      setError("Tap a star to rate the exchange.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await submitRating({
      listingId,
      toUserId,
      stars,
      comment: comment || undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-xl border border-line bg-surface p-4"
    >
      <p className="text-sm font-medium">How was your exchange with {otherName}?</p>
      <div className="mt-2">
        <StarPicker value={stars} onChange={setStars} />
      </div>
      {stars > 0 && (
        <div className="mt-2 flex gap-2">
          <input
            aria-label="Optional comment"
            placeholder="Optional: a short note…"
            maxLength={300}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={inputClasses}
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Rate"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {error}
        </p>
      )}
    </form>
  );
}
