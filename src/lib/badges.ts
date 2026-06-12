import { db } from "@/lib/db";
import { median } from "@/lib/stats";

export type UserStats = {
  itemsRehomed: number; // completed SELL + DONATE they posted
  donations: number; // completed DONATE they posted
  foundReturned: number; // RESOLVED FOUND they posted
  purchases: number; // completed listings they started a thread on (not owner)
  avgRating: number;
  ratingCount: number;
  avgFirstReplyMins: number | null;
  replyThreads: number;
};

/** All derived from existing rows — nothing extra is stored. Bounded queries. */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [
    itemsRehomed,
    donations,
    foundReturned,
    ratingAgg,
    purchases,
    ownedConversations,
  ] = await Promise.all([
    db.listing.count({
      where: {
        ownerId: userId,
        type: { in: ["SELL", "DONATE"] },
        status: { in: ["SOLD", "RESOLVED"] },
      },
    }),
    db.listing.count({
      where: { ownerId: userId, type: "DONATE", status: { in: ["SOLD", "RESOLVED"] } },
    }),
    db.listing.count({
      where: { ownerId: userId, type: "FOUND", status: "RESOLVED" },
    }),
    db.rating.aggregate({
      where: { toUserId: userId },
      _avg: { stars: true },
      _count: true,
    }),
    db.conversation.count({
      where: {
        starterId: userId,
        listing: { status: { in: ["SOLD", "RESOLVED"] }, ownerId: { not: userId } },
      },
    }),
    // Threads on this user's listings, to estimate first-reply speed.
    db.conversation.findMany({
      where: { listing: { ownerId: userId } },
      select: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { senderId: true, createdAt: true },
        },
      },
      take: 50,
    }),
  ]);

  const replyTimes: number[] = [];
  for (const convo of ownedConversations) {
    const firstInbound = convo.messages.find((m) => m.senderId !== userId);
    if (!firstInbound) continue;
    const firstReply = convo.messages.find(
      (m) => m.senderId === userId && m.createdAt > firstInbound.createdAt
    );
    if (!firstReply) continue;
    const mins =
      (firstReply.createdAt.getTime() - firstInbound.createdAt.getTime()) / 60000;
    replyTimes.push(mins);
  }

  return {
    itemsRehomed,
    donations,
    foundReturned,
    purchases,
    avgRating: ratingAgg._avg.stars ?? 0,
    ratingCount: ratingAgg._count,
    avgFirstReplyMins: median(replyTimes),
    replyThreads: replyTimes.length,
  };
}

export type Badge = {
  key: string;
  label: string;
  hint: string;
  earned: boolean;
  /** 0..1 toward earning it, for the locked-state progress line. */
  progress: number;
  progressLabel?: string;
};

export function computeBadges(stats: UserStats): Badge[] {
  return [
    {
      key: "trusted_trader",
      label: "Trusted Trader",
      hint: "5+ ratings averaging 4.5★",
      earned: stats.ratingCount >= 5 && stats.avgRating >= 4.5,
      progress: Math.min(stats.ratingCount / 5, 1),
      progressLabel: `${stats.ratingCount}/5 ratings`,
    },
    {
      key: "quick_replier",
      label: "Quick Replier",
      hint: "Replies within 30 min",
      earned:
        stats.avgFirstReplyMins !== null &&
        stats.avgFirstReplyMins <= 30 &&
        stats.replyThreads >= 3,
      progress: Math.min(stats.replyThreads / 3, 1),
      progressLabel: `${stats.replyThreads}/3 threads`,
    },
    {
      key: "good_samaritan",
      label: "Good Samaritan",
      hint: "Returned a found item",
      earned: stats.foundReturned >= 1,
      progress: Math.min(stats.foundReturned, 1),
      progressLabel: `${stats.foundReturned}/1 returned`,
    },
    {
      key: "sustainability_star",
      label: "Sustainability Star",
      hint: "Re-homed 10+ items",
      earned: stats.itemsRehomed >= 10,
      progress: Math.min(stats.itemsRehomed / 10, 1),
      progressLabel: `${stats.itemsRehomed}/10 re-homed`,
    },
    {
      key: "generous",
      label: "Generous",
      hint: "5+ completed donations",
      earned: stats.donations >= 5,
      progress: Math.min(stats.donations / 5, 1),
      progressLabel: `${stats.donations}/5 donated`,
    },
  ];
}
