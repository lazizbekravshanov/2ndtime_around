import { Badge } from "@/components/ui/Badge";
import type { ListingStatus } from "@/lib/constants";

/**
 * Single source of truth for how a listing status renders as a badge —
 * one tone + label per status, used everywhere a status appears
 * (My items, listing detail, cards, funnel).
 */
const STATUS: Record<ListingStatus, { tone: "neutral" | "outline" | "success"; label: string }> = {
  // Neutral, not accent: "Active" is state, and UC Red is reserved for the one
  // primary action. A solid red badge on every row of the Active tab spent the
  // loudest color in the system on the least surprising fact on the page.
  ACTIVE: { tone: "neutral", label: "Active" },
  DRAFT: { tone: "outline", label: "Draft" },
  SOLD: { tone: "success", label: "Sold" },
  RESOLVED: { tone: "success", label: "Resolved" },
  // Soft-deleted listings are filtered out of every view; label just in case.
  DELETED: { tone: "outline", label: "Removed" },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const s = STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
