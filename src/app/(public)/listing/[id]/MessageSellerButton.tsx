"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChatIcon } from "@/components/icons";
import { startConversation } from "@/lib/actions/conversations";

/** Opens (or creates) the conversation with the listing owner. */
export function MessageSellerButton({
  listingId,
  label,
  secondary = false,
  signInHref,
}: {
  listingId: string;
  label: string;
  secondary?: boolean;
  /** When set, the viewer is anonymous: render a sign-in call to action. */
  signInHref?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Anonymous visitors can't start a conversation — send them to sign-in first.
  if (signInHref) {
    return (
      <ButtonLink
        href={signInHref}
        variant={secondary ? "secondary" : "primary"}
        className="w-full"
      >
        <ChatIcon className="h-4 w-4" />
        Sign in to message
      </ButtonLink>
    );
  }

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await startConversation(listingId);
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push(`/messages/${result.data.conversationId}`);
  }

  return (
    <div>
      <Button
        type="button"
        variant={secondary ? "secondary" : "primary"}
        onClick={handleClick}
        disabled={pending}
        className="w-full"
      >
        <ChatIcon className="h-4 w-4" />
        {pending ? "Opening chat…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
