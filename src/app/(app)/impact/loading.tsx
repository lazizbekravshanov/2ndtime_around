/** Skeleton matching the impact page: headline stats + category bars. */
export default function ImpactLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="skeleton h-7 w-48" />
      <div className="mt-2 skeleton h-4 w-72" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-5">
            <div className="skeleton h-9 w-16" />
            <div className="mt-2 skeleton h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
