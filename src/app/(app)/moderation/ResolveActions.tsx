"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { resolveReport } from "@/lib/actions/moderation";

export function ResolveActions({ reportId }: { reportId: string }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (done) return <p className="text-xs text-faint">Resolved.</p>;

  function resolve(status: "DISMISSED" | "ACTIONED") {
    startTransition(async () => {
      const res = await resolveReport({ reportId, status });
      if (!res.ok) {
        toast(res.error);
        return;
      }
      setDone(true);
      toast(status === "ACTIONED" ? "Listing removed" : "Dismissed");
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => resolve("DISMISSED")}
      >
        Dismiss
      </Button>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => resolve("ACTIONED")}
      >
        Remove listing
      </Button>
    </div>
  );
}
