/** Row skeletons matching the My items list. */
export default function MyItemsLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="skeleton h-7 w-32" />
      <div className="mt-4 flex gap-4 border-b border-line pb-2">
        <div className="skeleton h-4 w-14" />
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-14" />
      </div>
      <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="skeleton h-14 w-14 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-1/3" />
            </div>
            <div className="skeleton h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
