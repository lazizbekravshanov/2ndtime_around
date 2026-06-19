import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TYPE_LABELS, type ListingType } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { getFunnelData, type TermCount, type FunnelStage } from "@/lib/funnel";
import { requireModerator } from "@/lib/session";
import { FunnelCharts } from "./FunnelCharts";

export const metadata = { title: "Funnel" };

export default async function FunnelPage() {
  // Moderator-only — 404s for everyone else (UI link is also hidden).
  await requireModerator();
  const data = await getFunnelData();

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Funnel</h1>
        <p className="mt-1 text-sm text-faint">
          Internal analytics — searches, demand, and the listing conversion
          funnel. Moderators only.
        </p>
      </header>

      {/* 1 — KPI row */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total users" value={data.kpis.totalUsers} />
        <Kpi label="Active listings" value={data.kpis.activeListings} />
        <Kpi label="Completed exchanges" value={data.kpis.completedExchanges} />
        <Kpi label="Searches logged" value={data.kpis.totalSearches} />
      </section>

      {/* 2 — Search insights */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Search insights</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Most searched terms">
            <RankedList items={data.topTerms} emptyHint="No searches yet." />
          </Card>
          <Card title="Zero-result searches" subtitle="Unmet demand">
            <RankedList
              items={data.zeroResultTerms}
              tone="accent"
              emptyHint="Every search found something."
            />
          </Card>
        </div>
        <Card title="Search volume — last 30 days" className="mt-4">
          <FunnelCharts volume={data.volume} />
        </Card>
      </section>

      {/* 3 — Category demand */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Category demand</h2>
        <p className="mt-1 text-sm text-faint">
          Listings per category split by intent — what&apos;s supplied vs wanted.
        </p>
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">For sale</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Wanted</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Donated</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Lost/Found</th>
              </tr>
            </thead>
            <tbody>
              {data.categoryDemand.map((c) => (
                <tr key={c.category} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    {c.category}
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums">{c.sell}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.wanted > 0 ? (
                      <span className="font-medium text-accent">{c.wanted}</span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.donate}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.lost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* 4 — Listing funnel */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Listing funnel</h2>
        <p className="mt-1 text-sm text-faint">
          Posted → viewed → conversation started → completed, with drop-off.
        </p>
        <Card className="mt-4">
          <FunnelBars stages={data.funnel} />
        </Card>
      </section>

      {/* 5 — Recent activity */}
      <section className="mt-8 mb-4">
        <h2 className="text-base font-semibold">Recent activity</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Latest listings" className="p-0">
            {data.recentListings.length === 0 ? (
              <p className="px-4 py-6 text-sm text-faint">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recentListings.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <Link
                      href={`/listing/${l.id}`}
                      className="min-w-0 flex-1 truncate text-sm hover:underline"
                    >
                      {l.title}
                    </Link>
                    <span className="shrink-0 text-xs text-faint">
                      {TYPE_LABELS[l.type as ListingType] ?? l.type}
                    </span>
                    <Badge
                      tone={
                        l.status === "ACTIVE"
                          ? "accent"
                          : l.status === "DRAFT"
                            ? "outline"
                            : "success"
                      }
                    >
                      {l.status[0] + l.status.slice(1).toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Latest searches" className="p-0">
            {data.recentSearches.length === 0 ? (
              <p className="px-4 py-6 text-sm text-faint">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recentSearches.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {s.query}
                    </span>
                    <span className="shrink-0 text-xs text-faint">
                      {s.resultCount === 0 ? (
                        <span className="text-accent">0 results</span>
                      ) : (
                        `${s.resultCount} results`
                      )}{" "}
                      · {timeAgo(new Date(s.createdAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="text-3xl font-semibold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-sm text-faint">{label}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  className = "",
  children,
}: {
  title?: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {title && (
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && (
            <span className="text-xs uppercase tracking-wide text-faint">
              {subtitle}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function RankedList({
  items,
  tone = "ink",
  emptyHint,
}: {
  items: TermCount[];
  tone?: "ink" | "accent";
  emptyHint: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-faint">{emptyHint}</p>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={`${item.query}-${i}`} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-right text-xs tabular-nums text-faint">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm">{item.query}</span>
              <span className="shrink-0 text-xs tabular-nums text-faint">
                {item.count}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
              <div
                className={tone === "accent" ? "h-full bg-accent" : "h-full bg-ink"}
                style={{ width: `${Math.round((item.count / max) * 100)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FunnelBars({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.count || 1;
  return (
    <ol className="space-y-3">
      {stages.map((s, i) => {
        const pctOfTop = Math.round((s.count / top) * 100);
        const prev = i > 0 ? stages[i - 1].count : null;
        const dropoff =
          prev && prev > 0
            ? Math.round(((prev - s.count) / prev) * 100)
            : null;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="tabular-nums">
                {s.count.toLocaleString()}
                {dropoff !== null && (
                  <span className="ml-2 text-xs text-faint">−{dropoff}%</span>
                )}
              </span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-md bg-paper">
              <div
                className="h-full rounded-md bg-accent"
                style={{ width: `${Math.max(pctOfTop, 2)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
