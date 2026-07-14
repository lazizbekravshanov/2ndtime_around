import type { ListingStatus } from "@/lib/constants";

/**
 * What an unauthenticated-or-authenticated viewer is allowed to see for a
 * given listing, based purely on its status and whether the viewer owns it.
 *
 * - `notFound`    — deleted: indistinguishable from a non-existent listing.
 * - `unavailable` — a non-active listing viewed by anyone but its owner. The
 *                   generic "no longer available" state must NOT reveal whether
 *                   it is a draft, sold, or resolved.
 * - `ok`          — render the full page (active for anyone; any status for the
 *                   owner).
 */
export function viewOutcome({
  status,
  isOwner,
}: {
  status: ListingStatus;
  isOwner: boolean;
}): "notFound" | "unavailable" | "ok" {
  if (status === "DELETED") return "notFound";
  if (status !== "ACTIVE" && !isOwner) return "unavailable";
  return "ok";
}
