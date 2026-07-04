import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeafIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/session";
import { getLeaderboard } from "@/lib/leaderboard";

export const metadata = {
  title: "Sustainability Leaderboard",
  description:
    "See which Bearcats and which majors keep the most stuff in circulation at UC.",
};

type Board = "people" | "majors";

const TABS: { key: Board; label: string }[] = [
  { key: "people", label: "Top Bearcats" },
  { key: "majors", label: "By major" },
];

/** Small rank chip — top three get the accent fill, the rest a quiet hairline. */
function RankChip({ rank }: { rank: number }) {
  const top = rank <= 3;
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
        top ? "bg-accent text-white" : "border border-line text-faint"
      }`}
    >
      {rank}
    </span>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board: boardParam } = await searchParams;
  const board: Board = boardParam === "majors" ? "majors" : "people";

  const user = await getSessionUser();
  const data = await getLeaderboard(user?.id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2">
        <LeafIcon className="h-6 w-6 shrink-0 text-success" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Sustainability leaderboard
        </h1>
      </div>
      <p className="mt-1 text-sm text-faint">
        <span className="font-medium text-ink">{data.totalKept}</span> items kept
        in circulation by{" "}
        <span className="font-medium text-ink">{data.totalContributors}</span>{" "}
        Bearcats — every one a swap that didn&apos;t become trash.
      </p>

      {/* The signed-in student's own standing, tying personal impact to the whole. */}
      {data.me && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              You&apos;re #{data.me.rank} of {data.totalContributors}
            </p>
            <p className="text-xs text-faint">
              {data.me.itemsKept}{" "}
              {data.me.itemsKept === 1 ? "item" : "items"} kept in circulation
            </p>
          </div>
          <LeafIcon className="h-5 w-5 shrink-0 text-success" />
        </div>
      )}

      {/* Tabs — links so the board is shareable and back/forward works. */}
      <div
        role="tablist"
        aria-label="Leaderboard"
        className="mt-6 flex gap-5 border-b border-line"
      >
        {TABS.map((t) => {
          const active = board === t.key;
          return (
            <Link
              key={t.key}
              role="tab"
              aria-selected={active}
              href={t.key === "people" ? "/leaderboard" : "/leaderboard?board=majors"}
              className={`relative -mb-px pb-2.5 text-sm font-medium transition-colors ${
                active ? "text-ink" : "text-faint hover:text-ink"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-5">
        {data.totalKept === 0 ? (
          <EmptyState
            icon={<LeafIcon className="h-6 w-6" />}
            title="No completed swaps yet"
            hint="Once students start selling and donating, the leaderboard fills up here."
          />
        ) : board === "majors" ? (
          <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {data.majors.map((m) => (
              <li key={m.major} className="flex items-center gap-3 px-4 py-3">
                <RankChip rank={m.rank} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.major}</p>
                  <p className="text-xs text-faint">
                    {m.contributors}{" "}
                    {m.contributors === 1 ? "student" : "students"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {m.itemsKept}
                </span>
                <span className="shrink-0 text-xs text-faint">kept</span>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {data.contributors.map((c) => {
              const isMe = user?.id === c.userId;
              return (
                <li
                  key={c.userId}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isMe ? "bg-accent/5" : ""
                  }`}
                >
                  <RankChip rank={c.rank} />
                  <Link
                    href={`/profile/${c.userId}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {c.displayName}
                    {isMe && <span className="font-normal text-faint"> · you</span>}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {c.itemsKept}
                  </span>
                  <span className="shrink-0 text-xs text-faint">kept</span>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-3 text-center text-xs text-faint">
          &ldquo;Kept in circulation&rdquo; = a completed sale or donation. Updated all day.
        </p>
      </div>
    </div>
  );
}
