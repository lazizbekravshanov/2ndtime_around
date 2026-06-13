"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  BellIcon,
  ChatIcon,
  HeartIcon,
  PinIcon,
  TagIcon,
  CheckIcon,
} from "@/components/icons";
import { timeAgo } from "@/lib/format";
import { markNotificationRead } from "@/lib/actions/notifications";

const ICONS: Record<string, (p: { className?: string }) => React.ReactNode> = {
  MESSAGE: ChatIcon,
  CLAIM: CheckIcon,
  MEETUP: PinIcon,
  RATING: CheckIcon,
  SAVED_SEARCH_HIT: TagIcon,
  PRICE_DROP: TagIcon,
  FAVORITE_SOLD: HeartIcon,
  REPORT_RESOLVED: BellIcon,
};

export type NotificationRowData = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string;
  read: boolean;
  createdAt: Date;
};

export function NotificationRow({ n }: { n: NotificationRowData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const Icon = ICONS[n.kind] ?? BellIcon;

  function onClick() {
    startTransition(async () => {
      if (!n.read) await markNotificationRead(n.id);
      router.push(n.href);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        n.read
          ? "border-line bg-surface hover:bg-paper"
          : "border-line bg-paper"
      }`}
    >
      <span className="mt-0.5 text-faint">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{n.title}</span>
          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
        </span>
        {n.body && <span className="block truncate text-sm text-faint">{n.body}</span>}
        <span className="mt-0.5 block text-xs text-faint" suppressHydrationWarning>
          {timeAgo(n.createdAt)}
        </span>
      </span>
    </button>
  );
}
