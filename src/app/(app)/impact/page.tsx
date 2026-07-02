import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { LeafIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getUserStats, computeBadges } from "@/lib/badges";
import { currentSemester } from "@/lib/semester";
import { BadgeShelf } from "@/components/BadgeShelf";

export const metadata = { title: "Campus impact" };

const REUSED_WHERE: Prisma.ListingWhereInput = {
  type: { in: ["SELL", "DONATE"] },
  status: { in: ["SOLD", "RESOLVED"] },
};

// These four aggregates are campus-wide (user-independent) and slow-moving —
// cache them like lib/impact.ts does, keyed by semester so the boundary flip
// invalidates naturally. Only getUserStats below stays per-request.
const getGlobalImpact = unstable_cache(
  async (semesterStartIso: string) =>
    Promise.all([
      db.listing.count({ where: REUSED_WHERE }),
      db.listing.count({
        where: { ...REUSED_WHERE, updatedAt: { gte: new Date(semesterStartIso) } },
      }),
      db.listing.count({
        where: { type: { in: ["LOST", "FOUND"] }, status: "RESOLVED" },
      }),
      db.listing.groupBy({
        by: ["category"],
        where: REUSED_WHERE,
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]),
  ["impact-page-globals"],
  { revalidate: 300 }
);

export default async function ImpactPage() {
  const user = await requireUser();
  const semester = currentSemester();
  const myStats = await getUserStats(user.id);
  const myBadges = computeBadges(myStats);

  const [reusedAllTime, reusedThisSemester, returnedCount, byCategory] =
    await getGlobalImpact(semester.start.toISOString());

  const maxCategory = Math.max(1, ...byCategory.map((c) => c._count._all));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Campus impact</h1>
      <p className="mt-1 text-sm text-faint">
        Every completed sale or donation is one less thing in a dumpster at
        move-out.
      </p>

      {/* Headline numbers — plain and honest, no chart library */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-5">
          <LeafIcon className="h-5 w-5 text-success" />
          <p className="mt-3 text-4xl font-semibold tracking-tight">
            {reusedAllTime}
          </p>
          <p className="text-sm text-faint">items kept out of landfills</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-4xl font-semibold tracking-tight">
            {reusedThisSemester}
          </p>
          <p className="text-sm text-faint">
            reused in {semester.name}
            <span className="block text-xs">vs {reusedAllTime} all time</span>
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-4xl font-semibold tracking-tight">
            {returnedCount}
          </p>
          <p className="text-sm text-faint">lost items back with owners</p>
        </div>
      </div>

      {/* Your impact + badges */}
      <section className="mt-10">
        <h2 className="text-base font-semibold">Your impact</h2>
        <p className="mt-1 text-sm text-faint">
          You&apos;ve kept{" "}
          <span className="font-medium text-ink">{myStats.itemsRehomed}</span>{" "}
          {myStats.itemsRehomed === 1 ? "item" : "items"} in use and made{" "}
          <span className="font-medium text-ink">{myStats.donations}</span>{" "}
          {myStats.donations === 1 ? "donation" : "donations"}.
        </p>
        <div className="mt-4">
          <BadgeShelf badges={myBadges} showLocked />
        </div>
      </section>

      {/* Reuse by category — simple proportional bars */}
      <section className="mt-10">
        <h2 className="text-base font-semibold">Items reused, by category</h2>
        {byCategory.length === 0 ? (
          <p className="mt-3 text-sm text-faint">
            No completed exchanges yet — this chart fills in as items find new
            homes.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {byCategory.map((c) => (
              <li key={c.category}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{c.category}</span>
                  <span className="font-medium">{c._count._all}</span>
                </div>
                <div
                  className="mt-1 h-2 rounded-full bg-line"
                  role="img"
                  aria-label={`${c.category}: ${c._count._all} of ${reusedAllTime} items`}
                >
                  <div
                    className="h-2 rounded-full bg-success"
                    style={{ width: `${(c._count._all / maxCategory) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 rounded-xl border border-line bg-surface p-4 text-sm text-faint">
        Counting method: completed sales and donations count as reuse.
        Resolved lost &amp; found items are tracked separately — returning
        something isn&apos;t recycling, but it sure beats rebuying it.
      </p>
    </div>
  );
}
