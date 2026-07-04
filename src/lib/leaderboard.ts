import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/**
 * Sustainability leaderboard — who (and which major) keeps the most stuff in
 * circulation. "Kept in circulation" is the same definition the landing page's
 * impact numbers use: a completed SELL or DONATE (status SOLD/RESOLVED). Nothing
 * extra is stored — every board is derived from existing listing rows.
 *
 * The pure builders below take one row per completed item and are unit-tested
 * in isolation; the DB layer just fetches those rows and hands them over.
 */

/** One completed (kept-in-circulation) item, flattened with its owner's identity. */
export type CompletedItem = {
  ownerId: string;
  displayName: string | null;
  major: string | null;
};

export type ContributorRank = {
  userId: string;
  displayName: string;
  itemsKept: number;
  rank: number;
};

export type MajorRank = {
  major: string;
  itemsKept: number;
  contributors: number;
  rank: number;
};

const DEFAULT_LIMIT = 10;

/**
 * Competition ranking (1, 2, 2, 4): equal scores share a rank, and the next
 * distinct score jumps past the tie. `sorted` must already be in descending
 * score order; `score` reads the ranked value off each row.
 */
function withRanks<T>(sorted: T[], score: (t: T) => number): (T & { rank: number })[] {
  let prevScore = Number.POSITIVE_INFINITY;
  let prevRank = 0;
  return sorted.map((t, i) => {
    const s = score(t);
    const rank = s === prevScore ? prevRank : i + 1;
    prevScore = s;
    prevRank = rank;
    return { ...t, rank };
  });
}

/**
 * Rank students by items kept in circulation, highest first. Owners without a
 * display name are excluded (nothing to show, and it's the only field we'd
 * surface — already public on every listing). Ties break alphabetically.
 */
export function buildContributorBoard(
  items: CompletedItem[],
  limit = DEFAULT_LIMIT
): ContributorRank[] {
  const byOwner = new Map<string, { displayName: string; itemsKept: number }>();
  for (const it of items) {
    if (!it.displayName) continue;
    const cur = byOwner.get(it.ownerId);
    if (cur) cur.itemsKept += 1;
    else byOwner.set(it.ownerId, { displayName: it.displayName, itemsKept: 1 });
  }
  const sorted = [...byOwner.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort(
      (a, b) =>
        b.itemsKept - a.itemsKept || a.displayName.localeCompare(b.displayName)
    );
  return withRanks(sorted, (r) => r.itemsKept).slice(0, limit);
}

/**
 * Rank majors by total items kept in circulation, with a distinct-contributor
 * count so a single prolific student doesn't masquerade as a whole department.
 * Items whose owner has no major set are excluded.
 */
export function buildMajorBoard(items: CompletedItem[]): MajorRank[] {
  const byMajor = new Map<string, { itemsKept: number; owners: Set<string> }>();
  for (const it of items) {
    if (!it.major) continue;
    const cur = byMajor.get(it.major);
    if (cur) {
      cur.itemsKept += 1;
      cur.owners.add(it.ownerId);
    } else {
      byMajor.set(it.major, { itemsKept: 1, owners: new Set([it.ownerId]) });
    }
  }
  const sorted = [...byMajor.entries()]
    .map(([major, v]) => ({
      major,
      itemsKept: v.itemsKept,
      contributors: v.owners.size,
    }))
    .sort((a, b) => b.itemsKept - a.itemsKept || a.major.localeCompare(b.major));
  return withRanks(sorted, (r) => r.itemsKept);
}

/** A user's competition rank across the full people board, or null if they've kept nothing. */
export function rankOfUser(items: CompletedItem[], userId: string): number | null {
  const full = buildContributorBoard(items, Number.POSITIVE_INFINITY);
  return full.find((r) => r.userId === userId)?.rank ?? null;
}

// One completed-item fetch feeds every board. Slow-moving vanity data on a
// public page — cache it for 5 minutes like the impact stats.
const getCompletedItems = unstable_cache(
  async (): Promise<CompletedItem[]> => {
    const rows = await db.listing.findMany({
      where: {
        type: { in: ["SELL", "DONATE"] },
        status: { in: ["SOLD", "RESOLVED"] },
      },
      select: {
        ownerId: true,
        owner: { select: { displayName: true, major: true } },
      },
    });
    return rows.map((r) => ({
      ownerId: r.ownerId,
      displayName: r.owner.displayName,
      major: r.owner.major,
    }));
  },
  ["leaderboard-completed-items"],
  { revalidate: 300 }
);

export type LeaderboardData = {
  contributors: ContributorRank[];
  majors: MajorRank[];
  totalKept: number;
  totalContributors: number;
  /** The signed-in user's standing, if they've kept anything in circulation. */
  me: { rank: number; itemsKept: number } | null;
};

export async function getLeaderboard(
  currentUserId?: string,
  limit = DEFAULT_LIMIT
): Promise<LeaderboardData> {
  const items = await getCompletedItems();
  const fullBoard = buildContributorBoard(items, Number.POSITIVE_INFINITY);
  const me = currentUserId
    ? fullBoard.find((r) => r.userId === currentUserId)
    : undefined;
  return {
    contributors: fullBoard.slice(0, limit),
    majors: buildMajorBoard(items),
    totalKept: items.length,
    totalContributors: fullBoard.length,
    me: me ? { rank: me.rank, itemsKept: me.itemsKept } : null,
  };
}
