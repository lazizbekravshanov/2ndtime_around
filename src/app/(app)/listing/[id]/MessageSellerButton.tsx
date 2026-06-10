"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChatIcon } from "@/components/icons";
import { startConversation } from "@/lib/actions/conversations";

/** Opens (or creates) the conversation with the listing owner. */
export function MessageSellerButton({
  listingId,
  label,
  secondary = false,
}: {
  listingId: string;
  label: string;
  secondary?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
