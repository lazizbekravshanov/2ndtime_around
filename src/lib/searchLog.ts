import { db } from "@/lib/db";
import { parseTab, type BrowseParams, type TabKey } from "@/lib/search";

const TAB_LABEL: Record<TabKey, string> = {
  market: "Marketplace",
  donations: "Donations",
  lostfound: "LostFound",
  wanted: "Wanted",
};

/**
 * Fire-and-forget analytics: record a Browse search or category filter. Only
 * logged when there's an actual query or category (not bare tab browsing).
 * Never awaited by the page and swallows its own errors, so it can't slow or
 * break the search UX.
 */
export function logSearchEvent(
  params: BrowseParams,
  resultCount: number,
  userId: string | null
): void {
  const query = (params.q ?? "").trim().toLowerCase().slice(0, 100);
  const category = params.category ?? null;
  if (!query && !category) return;

  void db.searchEvent
    .create({
      data: {
        query,
        category,
        tab: TAB_LABEL[parseTab(params.tab)],
        resultCount,
        userId,
      },
    })
    .catch(() => {});
}
