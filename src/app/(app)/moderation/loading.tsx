/** Report-card skeletons matching the moderation queue — the page does real
 *  DB work (listOpenReports), so it gets a shape-matched skeleton like every
 *  other data route instead of a blank flash. */
export default function ModerationLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton mt-2 h-4 w-28" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
            <div className="skeleton h-3 w-3/4" />
            <div className="flex gap-2">
              <div className="skeleton h-8 w-24 rounded-lg" />
              <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
