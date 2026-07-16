import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/ui/StatTile";
import { Meter } from "@/components/ui/Meter";
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  XIcon,
} from "@/components/icons";
import { TYPE_LABELS, type ListingStatus, type ListingType } from "@/lib/constants";
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
        <h1 className="text-2xl font-semibold tracking-tight">Funnel</h1>
        <p className="mt-1 text-sm text-faint">
          Internal analytics — moderators only. Showing{" "}
          <span className="text-ink">{data.rangeLabel.toLowerCase()}</span>.
        </p>
      </header>

      {/* Global controls */}
      <div className="mt-4">
        <Controls range={range.key} catSort={catSort} refreshedAt={data.refreshedAt} />
      </div>

      {/* KPI row with period-over-period deltas — the one place tiles are boxed. */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.kpis.map((k) => {
          const { delta, hint } = kpiDelta(k);
          return (
            <StatTile
              key={k.key}
              label={k.label}
              value={k.value.toLocaleString()}
              delta={delta}
              hint={hint}
            />
          );
        })}
      </section>

      {/* Needs attention */}
      {data.exceptions.length > 0 && (
        <Section eyebrow="Needs attention">
          <ul className="grid gap-2 sm:grid-cols-2">
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
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                    <span>
                      <span className="font-medium">{e.label}.</span>{" "}
                      <span className="text-faint">{e.detail}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Search insights */}
      <Section id="search-insights" eyebrow="Search insights">
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Most searched terms">
            <RankedList items={data.topTerms} emptyHint="No searches in this range yet." />
          </Block>
          <Block title="Zero-result searches" subtitle="Unmet demand">
            <RankedList
              items={data.zeroResultTerms}
              emptyHint="Every search found something."
            />
          </Block>
        </div>
        <Block title="Search volume" subtitle={data.volumeNote} className="mt-8">
          <FunnelCharts volume={data.volume} />
          <p className="mt-2 text-xs text-faint">
            Bars are raw searches per day; the line is the 7-day moving average
            (smoothed trend).
          </p>
        </Block>
      </Section>

      {/* Category demand */}
      <Section
        id="category-demand"
        eyebrow="Category demand"
        description="Demand index = (wanted listings + searches) ÷ active supply. Higher = more unmet need. Click a category to see its active listings."
      >
        {/* Tables keep their border — they're the one place a frame earns itself. */}
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
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
                    {catSort === "demand" ? (
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronUpDownIcon className="h-3.5 w-3.5" />
                    )}
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
        </div>
      </Section>

      {/* Listing funnel */}
      <Section
        eyebrow="Listing funnel"
        description="Cohort of listings posted in range: posted → viewed → conversation → completed, with drop-off. Click a stage for the underlying listings."
      >
        <FunnelBars stages={data.funnel} range={range.key} catSort={catSort} />
      </Section>

      {/* Marketplace health */}
      <Section eyebrow="Marketplace health">
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Time to completion" subtitle="post → sold/given/resolved">
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
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Median days"
                    value={data.health.completionDays.median!}
                  />
                  <StatTile
                    label="Average days"
                    value={data.health.completionDays.average!}
                  />
                </div>
                <p className="mt-3 text-xs text-faint">
                  Median over {data.health.completionDays.sample} completed
                  listings — it&apos;s the typical experience and resists skew
                  from a few very old items the average would distort.
                </p>
              </div>
            )}
          </Block>
          <Block title="Completion rate by category" subtitle="with denominators">
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
                      <Meter
                        value={c.completed}
                        max={c.posted}
                        className="w-20 shrink-0"
                        label={`${c.category} completion rate`}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Block>
        </div>
        <Block title="Most-viewed active listings" className="mt-8">
          {data.health.mostViewed.length === 0 ? (
            <p className="text-sm text-faint">No active listings in range.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
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
            </div>
          )}
        </Block>
      </Section>

      {/* Drilldown (only when requested) */}
      {drill && (
        <Section id="drill" eyebrow={drill.title} action={
          <Link
            href={hrefFor(range.key, catSort)}
            className="inline-flex items-center gap-1 text-sm text-faint hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
            Close
          </Link>
        }>
          <p className="-mt-2 mb-4 text-sm text-faint">
            {drill.description} Showing {drill.rows.length}.
          </p>
          {drill.rows.length === 0 ? (
            <p className="text-sm text-faint">No matching listings.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {drill.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/listing/${r.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                    {r.title}
                  </Link>
                  <span className="shrink-0 text-xs text-faint">{r.category}</span>
                  <span className="shrink-0 text-xs tabular-nums text-faint">{r.viewCount} views</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* Recent activity */}
      <Section eyebrow="Recent activity" className="mb-4">
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Latest listings">
            {data.recentListings.length === 0 ? (
              <p className="text-sm text-faint">Nothing in range.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {data.recentListings.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/listing/${l.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {l.title}
                    </Link>
                    <span className="shrink-0 text-xs text-faint">
                      {TYPE_LABELS[l.type as ListingType] ?? l.type}
                    </span>
                    <StatusBadge status={l.status as ListingStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Block>
          <Block title="Latest searches">
            {data.recentSearches.length === 0 ? (
              <p className="text-sm text-faint">Nothing in range.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {data.recentSearches.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{s.query}</span>
                    <span className="shrink-0 text-xs text-faint">
                      {s.resultCount === 0 ? (
                        <span className="font-medium text-ink">0 results</span>
                      ) : (
                        `${s.resultCount} results`
                      )}{" "}
                      · {timeAgo(new Date(s.createdAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </Section>
    </div>
  );
}

/** KPI delta vs. the prior period. Returns no color — StatTile shows direction. */
function kpiDelta(kpi: Kpi): { delta?: number; hint: string } {
  if (kpi.prev === null) return { hint: "all time" };
  if (kpi.prev === 0 && kpi.value === 0) return { hint: "no change vs prior" };
  if (kpi.prev === 0) return { hint: "new vs prior" };
  return { delta: ((kpi.value - kpi.prev) / kpi.prev) * 100, hint: "vs prior" };
}

/**
 * A dashboard section: a small uppercase eyebrow over a hairline rule, then the
 * content. Borders are earned — only tiles and tables get a frame, so the page
 * reads as content rather than a stack of boxes.
 */
function Section({
  eyebrow,
  description,
  action,
  id,
  className = "",
  children,
}: {
  eyebrow: string;
  description?: string;
  action?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`mt-12 scroll-mt-20 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-faint">
          {eyebrow}
        </h2>
        {action}
      </div>
      {description && <p className="mt-3 text-sm text-faint">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A borderless block inside a Section. */
function Block({
  title,
  subtitle,
  className = "",
  children,
}: {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
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

function RankedList({ items, emptyHint }: { items: TermCount[]; emptyHint: string }) {
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
            <Meter value={item.count} max={max} className="mt-1" label={item.query} />
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
        {/* Emphasis via weight, not color — accent is not a data signal. */}
        {c.wanted > 0 ? <span className="font-medium text-ink">{c.wanted}</span> : 0}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{c.searches}</td>
      <td className="px-4 py-3 text-right tabular-nums">{c.supply}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {c.demandIndex === null ? (
          <span className="text-faint" title="No active supply to compare against">
            —
          </span>
        ) : (
          <span className={c.demandIndex > 1 ? "font-medium text-ink" : ""}>
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
            <Meter value={s.count} max={top} className="mt-1" label={s.label} />
          </li>
        );
      })}
    </ol>
  );
}
