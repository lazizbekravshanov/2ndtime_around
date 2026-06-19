import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { TYPE_LABELS, type ListingType } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import {
  getDrilldown,
  getFunnelData,
  parseRange,
  type CategoryDemand,
  type FunnelStage,
  type Kpi,
  type RangeKey,
  type TermCount,
} from "@/lib/funnel";
import { requireModerator } from "@/lib/session";
import { Controls } from "./Controls";
import { FunnelCharts } from "./FunnelCharts";

export const metadata = { title: "Funnel" };

type SP = { range?: string; catsort?: string; drill?: string };

function hrefFor(range: RangeKey, catSort: string, drill?: string): string {
  const sp = new URLSearchParams();
  sp.set("range", range);
  if (catSort) sp.set("catsort", catSort);
  if (drill) sp.set("drill", drill);
  return `/funnel?${sp.toString()}${drill ? "#drill" : ""}`;
}

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireModerator();
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const catSort = sp.catsort === "demand" ? "demand" : "";
  const [data, drill] = await Promise.all([
    getFunnelData(range.key, catSort),
    getDrilldown(sp.drill, range.key),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Funnel</h1>
        <p className="mt-1 text-sm text-faint">
          Internal analytics — moderators only. Showing{" "}
          <span className="text-ink">{data.rangeLabel.toLowerCase()}</span>.
        </p>
      </header>

      {/* Global controls */}
      <div className="mt-4">
        <Controls range={range.key} catSort={catSort} refreshedAt={data.refreshedAt} />
      </div>

      {/* Needs attention */}
      {data.exceptions.length > 0 && (
        <section className="mt-5" aria-label="Needs attention">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
              Needs attention
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.exceptions.map((e, i) => {
                const href = e.href.startsWith("?drill=")
                  ? hrefFor(range.key, catSort, e.href.slice("?drill=".length))
                  : e.href;
                return (
                  <li key={i}>
                    <Link
                      href={href}
                      className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-faint"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>
                        <span className="font-medium">{e.label}.</span>{" "}
                        <span className="text-faint">{e.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* KPI row with period-over-period deltas */}
      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </section>

      {/* Search insights */}
      <section id="search-insights" className="mt-8 scroll-mt-20">
        <h2 className="text-base font-semibold">Search insights</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Most searched terms">
            <RankedList items={data.topTerms} emptyHint="No searches in this range yet." />
          </Card>
          <Card title="Zero-result searches" subtitle="Unmet demand">
            <RankedList
              items={data.zeroResultTerms}
              tone="accent"
              emptyHint="Every search found something."
            />
          </Card>
        </div>
        <Card title="Search volume" subtitle={data.volumeNote} className="mt-4">
          <FunnelCharts volume={data.volume} />
          <p className="mt-2 text-xs text-faint">
            Bars are raw searches per day; the red line is the 7-day moving
            average (smoothed trend).
          </p>
        </Card>
      </section>

      {/* Category demand */}
      <section id="category-demand" className="mt-8 scroll-mt-20">
        <h2 className="text-base font-semibold">Category demand</h2>
        <p className="mt-1 text-sm text-faint">
          Demand index = (wanted listings + searches) ÷ active supply. Higher =
          more unmet need. Click a category to see its active listings.
        </p>
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">For sale</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Wanted</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Searches</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Supply</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <Link
                    href={hrefFor(range.key, catSort === "demand" ? "" : "demand")}
                    className="inline-flex items-center gap-1 hover:text-ink"
                    aria-label="Sort by demand index"
                  >
                    Demand index
                    <span aria-hidden>{catSort === "demand" ? "▼" : "↕"}</span>
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.categoryDemand.map((c) => (
                <CategoryRow key={c.category} c={c} href={hrefFor(range.key, catSort, `cat:${c.category}`)} />
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Listing funnel */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Listing funnel</h2>
        <p className="mt-1 text-sm text-faint">
          Cohort of listings posted in range: posted → viewed → conversation →
          completed, with drop-off. Click a stage for the underlying listings.
        </p>
        <Card className="mt-4">
          <FunnelBars stages={data.funnel} range={range.key} catSort={catSort} />
        </Card>
      </section>

      {/* Marketplace health */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Marketplace health</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Time to completion" subtitle="post → sold/given/resolved">
            {data.health.completionDays.sample < 3 ? (
              <p className="text-sm text-faint">
                Not enough completed listings in this range yet
                {data.health.completionDays.sample > 0
                  ? ` (${data.health.completionDays.sample} so far)`
                  : ""}
                .
              </p>
            ) : (
              <div>
                <div className="flex items-baseline gap-6">
                  <Stat label="Median days" value={data.health.completionDays.median!} />
                  <Stat label="Average days" value={data.health.completionDays.average!} muted />
                </div>
                <p className="mt-3 text-xs text-faint">
                  Median over {data.health.completionDays.sample} completed
                  listings — it&apos;s the typical experience and resists skew
                  from a few very old items the average would distort.
                </p>
              </div>
            )}
          </Card>
          <Card title="Completion rate by category" subtitle="with denominators">
            {data.health.completionByCategory.length === 0 ? (
              <p className="text-sm text-faint">Not enough data yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.health.completionByCategory.map((c) => {
                  const pct = Math.round((c.completed / c.posted) * 100);
                  return (
                    <li key={c.category} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{c.category}</span>
                      <span className="shrink-0 text-faint">
                        {pct}% of {c.posted}
                      </span>
                      <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-paper">
                        <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Most-viewed active listings" className="mt-4 p-0">
          {data.health.mostViewed.length === 0 ? (
            <p className="px-4 py-6 text-sm text-faint">No active listings in range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                  <th scope="col" className="px-4 py-3 font-medium">Listing</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.health.mostViewed.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link href={`/listing/${l.id}`} className="hover:underline">
                        {l.title}
                      </Link>
                    </th>
                    <td className="px-4 py-3 text-faint">{l.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.viewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {/* Drilldown (only when requested) */}
      {drill && (
        <section id="drill" className="mt-8 scroll-mt-20">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{drill.title}</h2>
            <Link
              href={hrefFor(range.key, catSort)}
              className="text-sm text-faint hover:text-ink"
            >
              Close ✕
            </Link>
          </div>
          <p className="mt-1 text-sm text-faint">
            {drill.description} Showing {drill.rows.length}.
          </p>
          <Card className="mt-3 p-0">
            {drill.rows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-faint">No matching listings.</p>
            ) : (
              <ul className="divide-y divide-line">
                {drill.rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <Link href={`/listing/${r.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {r.title}
                    </Link>
                    <span className="shrink-0 text-xs text-faint">{r.category}</span>
                    <span className="shrink-0 text-xs tabular-nums text-faint">{r.viewCount} views</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      {/* Recent activity */}
      <section className="mt-8 mb-4">
        <h2 className="text-base font-semibold">Recent activity</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Latest listings" className="p-0">
            {data.recentListings.length === 0 ? (
              <p className="px-4 py-6 text-sm text-faint">Nothing in range.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recentListings.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <Link href={`/listing/${l.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
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
              <p className="px-4 py-6 text-sm text-faint">Nothing in range.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recentSearches.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{s.query}</span>
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

function KpiCard({ kpi }: { kpi: Kpi }) {
  let deltaNode: React.ReactNode = null;
  if (kpi.prev !== null) {
    const diff = kpi.value - kpi.prev;
    if (kpi.prev === 0 && kpi.value === 0) {
      deltaNode = <span className="text-faint">no change vs prior</span>;
    } else if (kpi.prev === 0) {
      deltaNode = <span className="text-faint">▲ new vs prior</span>;
    } else {
      const pct = Math.round((diff / kpi.prev) * 100);
      // Down is at-risk for all four KPIs → UC Red. Up/flat → neutral gray.
      const cls = diff < 0 ? "text-accent" : "text-faint";
      const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "■";
      deltaNode = (
        <span className={cls}>
          {arrow} {Math.abs(pct)}% vs prior
        </span>
      );
    }
  } else {
    deltaNode = <span className="text-faint">all time</span>;
  }
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="text-3xl font-semibold tracking-tight tabular-nums">
        {kpi.value.toLocaleString()}
      </div>
      <div className="mt-1 text-sm text-faint">{kpi.label}</div>
      <div className="mt-2 text-xs">{deltaNode}</div>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${muted ? "text-faint" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-faint">{label}</div>
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
            <span className="text-xs uppercase tracking-wide text-faint">{subtitle}</span>
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
  if (items.length === 0) return <p className="text-sm text-faint">{emptyHint}</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={`${item.query}-${i}`} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-right text-xs tabular-nums text-faint">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm">{item.query}</span>
              <span className="shrink-0 text-xs tabular-nums text-faint">{item.count}</span>
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

function CategoryRow({ c, href }: { c: CategoryDemand; href: string }) {
  return (
    <tr className="border-b border-line last:border-0">
      <th scope="row" className="px-4 py-3 text-left font-normal">
        <Link href={href} className="hover:underline">
          {c.category}
        </Link>
      </th>
      <td className="px-4 py-3 text-right tabular-nums">{c.sell}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {c.wanted > 0 ? <span className="font-medium text-accent">{c.wanted}</span> : 0}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{c.searches}</td>
      <td className="px-4 py-3 text-right tabular-nums">{c.supply}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {c.demandIndex === null ? (
          <span className="text-faint" title="No active supply to compare against">
            —
          </span>
        ) : (
          <span className={c.demandIndex > 1 ? "font-medium text-accent" : ""}>
            {c.demandIndex.toFixed(2)}
          </span>
        )}
      </td>
    </tr>
  );
}

function FunnelBars({
  stages,
  range,
  catSort,
}: {
  stages: FunnelStage[];
  range: RangeKey;
  catSort: string;
}) {
  const top = stages[0]?.count || 1;
  return (
    <ol className="space-y-3">
      {stages.map((s, i) => {
        const pctOfTop = Math.round((s.count / top) * 100);
        const prev = i > 0 ? stages[i - 1].count : null;
        // Change vs the previous stage. Usually a drop ("−12%"); some later
        // stages can exceed an earlier one (e.g. completions that never logged
        // an in-app conversation), shown as a neutral "+N%".
        const change = prev && prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : null;
        const drillKey = i === 1 ? "viewed" : s.key; // "viewed" stage links to its list
        const href = hrefFor(range, catSort, `funnel:${drillKey}`);
        return (
          <li key={s.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <Link href={href} className="font-medium hover:underline">
                {s.label}
              </Link>
              <span className="tabular-nums">
                {s.count.toLocaleString()}
                {change !== null && (
                  <span className="ml-2 text-xs text-faint">
                    {change >= 0 ? `−${change}%` : `+${-change}%`}
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-md bg-paper">
              <div className="h-full rounded-md bg-accent" style={{ width: `${Math.max(pctOfTop, 2)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
