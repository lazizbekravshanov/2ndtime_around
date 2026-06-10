import type { Prisma } from "@prisma/client";
import { LeafIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Campus impact" };

// Rough UC semester boundaries — enough for "this semester vs all time".
function currentSemester(): { name: string; start: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const spring = new Date(year, 0, 1);
  const summer = new Date(year, 4, 10);
  const fall = new Date(year, 7, 15);
  if (now >= fall) return { name: `Fall ${year}`, start: fall };
  if (now >= summer) return { name: `Summer ${year}`, start: summer };
  return { name: `Spring ${year}`, start: spring };
}

const REUSED_WHERE: Prisma.ListingWhereInput = {
  type: { in: ["SELL", "DONATE"] },
  status: { in: ["SOLD", "RESOLVED"] },
};

export default async function ImpactPage() {
  await requireUser();
  const semester = currentSemester();

  const [reusedAllTime, reusedThisSemester, returnedCount, byCategory] =
    await Promise.all([
      db.listing.count({ where: REUSED_WHERE }),
      db.listing.count({
        where: { ...REUSED_WHERE, updatedAt: { gte: semester.start } },
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
    ]);

  const maxCategory = Math.max(1, ...byCategory.map((c) => c._count._all));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Campus impact</h1>
      <p className="mt-1 text-sm text-faint">
        Every completed sale or donation is one less thing in a dumpster at
        move-out.
      </p>

      {/* Headline numbers — plain and honest, no chart library */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-5">
          <LeafIcon className="h-5 w-5 text-success" />
          <p className="mt-3 text-2xl font-semibold">{reusedAllTime}</p>
          <p className="text-sm text-faint">items kept out of landfills</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-2xl font-semibold">{reusedThisSemester}</p>
          <p className="text-sm text-faint">
            reused in {semester.name}
            <span className="block text-xs">vs {reusedAllTime} all time</span>
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-2xl font-semibold">{returnedCount}</p>
          <p className="text-sm text-faint">lost items back with owners</p>
        </div>
      </div>

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
