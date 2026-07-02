/** Row skeletons matching the conversation list — no spinners, no shift. */
export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="skeleton h-7 w-32" />
      <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="skeleton h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
