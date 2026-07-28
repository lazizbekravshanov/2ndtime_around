import Link from "next/link";
import { MoveoutBanner } from "@/components/MoveoutBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryGlyph } from "@/components/CategoryGlyph";
import { currentSemester, daysUntilMoveOut } from "@/lib/semester";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EyeIcon, TagIcon } from "@/components/icons";
import { TYPE_LABELS, type ListingStatus, type ListingType } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatPrice, photoList, timeAgo } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { ItemRowActions } from "./ItemRowActions";

export const metadata = { title: "My items" };

const TABS = [
  { key: "active", label: "Active" },
  { key: "done", label: "Sold / Resolved" },
  { key: "drafts", label: "Drafts" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_BY_TAB: Record<TabKey, string[]> = {
  active: ["ACTIVE"],
  done: ["SOLD", "RESOLVED"],
  drafts: ["DRAFT"],
};

const EMPTY_COPY: Record<TabKey, { title: string; hint: string }> = {
  active: {
    title: "Nothing listed right now",
    hint: "Post something you no longer need — it takes under a minute.",
  },
  done: {
    title: "No completed exchanges yet",
    hint: "Items you mark as sold or resolved will live here.",
  },
  drafts: {
    title: "No drafts",
    hint: "Posts you save while drafting show up here, ready to finish.",
  },
};

export default async function MyItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === params.tab)
    ? (params.tab as TabKey)
    : "active";
  const user = await requireUser();

  const listings = await db.listing.findMany({
    where: { ownerId: user.id, status: { in: STATUS_BY_TAB[tab] } },
    orderBy: { createdAt: "desc" },
    // Views alone don't tell a seller whether to hold or drop the price.
    // Saves and inquiries are the demand signal, and _count rides along on
    // this query rather than costing another round trip.
    include: { _count: { select: { favorites: true, conversations: true } } },
  });

  // Counts per tab, so a forgotten draft is visible without clicking into it.
  // One grouped query over this user's own listings.
  const grouped = await db.listing.groupBy({
    by: ["status"],
    where: { ownerId: user.id, status: { in: ["ACTIVE", "SOLD", "RESOLVED", "DRAFT"] } },
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(
    grouped.map((g) => [g.status, g._count._all])
  ) as Record<string, number>;
  const tabCounts: Record<TabKey, number> = {
    active: byStatus.ACTIVE ?? 0,
    done: (byStatus.SOLD ?? 0) + (byStatus.RESOLVED ?? 0),
    drafts: byStatus.DRAFT ?? 0,
  };

  const moveoutDays = daysUntilMoveOut();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">My items</h1>

      {moveoutDays !== null && (
        <div className="mt-4">
          <MoveoutBanner
            days={moveoutDays}
            semesterKey={currentSemester().key}
          />
        </div>
      )}

      <nav aria-label="Item status" className="mt-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "active" ? "/my-items" : `/my-items?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? "text-ink" : "text-faint hover:text-ink"
            }`}
          >
            {t.label}
            {tabCounts[t.key] > 0 && (
              <span className="ml-1.5 text-xs tabular-nums text-faint">
                {tabCounts[t.key]}
              </span>
            )}
            {tab === t.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 bg-accent" />
            )}
          </Link>
        ))}
      </nav>

      {listings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<TagIcon className="h-6 w-6" />}
            title={EMPTY_COPY[tab].title}
            hint={EMPTY_COPY[tab].hint}
            action={
              tab !== "done" ? (
                <ButtonLink href="/sell">Post an item</ButtonLink>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {listings.map((l) => {
            const cover = photoList(l.photos)[0];
            const type = l.type as ListingType;
            return (
              <li key={l.id} className="flex items-center gap-3 p-3">
                <Link
                  href={`/listing/${l.id}`}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-paper"
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // Matches the browse card's photoless treatment — this row
                    // was still showing an empty grey box after the cards
                    // gained a glyph.
                    <div className="flex h-full items-center justify-center text-faint">
                      <CategoryGlyph category={l.category} className="h-5 w-5" />
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/listing/${l.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {l.title}
                    </Link>
                    {/* On the Active tab every row is active, so the badge
                        says nothing. It stays where it distinguishes. */}
                    {tab !== "active" && (
                      <StatusBadge status={l.status as ListingStatus} />
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-faint">
                    <span>
                      {TYPE_LABELS[type]}
                      {type === "SELL" && l.price !== null
                        ? ` · ${formatPrice(l.price)}`
                        : ""}
                    </span>
                    <span>· {timeAgo(l.createdAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      · <EyeIcon className="h-3.5 w-3.5" />
                      {l.viewCount}
                    </span>
                    {/* Zeros are omitted rather than shown — a quiet listing
                        should read as quiet, not as a row of failures. */}
                    {l._count.favorites > 0 && (
                      <span>· {l._count.favorites} saved</span>
                    )}
                    {l._count.conversations > 0 && (
                      <span>· {l._count.conversations} asked</span>
                    )}
                  </p>
                </div>
                <ItemRowActions
                  listingId={l.id}
                  title={l.title}
                  type={type}
                  status={l.status}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
