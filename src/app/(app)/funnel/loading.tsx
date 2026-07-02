/** Skeleton matching the funnel dashboard: controls, stat cards, panels. */
export default function FunnelLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="skeleton h-7 w-28" />
      <div className="mt-2 skeleton h-4 w-64" />
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="skeleton h-9 w-72 rounded-lg" />
        <div className="skeleton h-9 w-48 rounded-lg" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-5">
            <div className="skeleton h-9 w-16" />
            <div className="mt-2 skeleton h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    </div>
  );
}
