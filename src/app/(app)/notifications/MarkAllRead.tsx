"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { markAllNotificationsRead } from "@/lib/actions/notifications";

export function MarkAllRead() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead();
          toast("All caught up");
        })
      }
      className="text-sm font-medium text-faint transition-colors hover:text-ink disabled:opacity-50"
    >
      Mark all read
    </button>
  );
}
