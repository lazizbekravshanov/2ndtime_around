"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, textareaClasses } from "@/components/ui/Field";
import { submitClaim } from "@/lib/actions/conversations";

/**
 * Lost & found claim flow, step 1: "This is mine" expands into a small
 * form asking for a detail only the true owner would know. The claim is
 * sent as a special message the finder can approve or deny in chat.
 */
export function ClaimButton({
  listingId,
  signInHref,
}: {
  listingId: string;
  /** When set, the viewer is anonymous: render a sign-in call to action. */
  signInHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Anonymous visitors sign in before claiming a found item.
  if (signInHref) {
    return (
      <ButtonLink href={signInHref} className="w-full">
        Sign in to claim
      </ButtonLink>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await submitClaim({ listingId, detail });
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push(`/messages/${result.data.conversationId}`);
  }

  if (!open) {
    return (
      <Button type="button" className="w-full" onClick={() => setOpen(true)}>
        This is mine
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-line bg-surface p-4"
    >
      <p className="text-sm font-medium">Prove it&apos;s yours</p>
      <p className="mb-3 mt-0.5 text-xs text-faint">
        Describe something about this item only its owner would know — a
        scratch, a sticker, what&apos;s in the side pocket. The finder will
        review your claim.
      </p>
      <Field label="Identifying detail" htmlFor="claim-detail" error={error ?? undefined}>
        <textarea
          id="claim-detail"
          rows={3}
          autoFocus
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="e.g. There's a Cincinnati Zoo sticker on the back and a dent on the top-left corner."
          aria-invalid={error ? true : undefined}
          className={textareaClasses}
        />
      </Field>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending claim…" : "Send claim"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
