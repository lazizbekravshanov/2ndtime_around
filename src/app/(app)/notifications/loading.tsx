/** Row skeletons matching the notifications list. */
export default function NotificationsLoading() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="skeleton h-7 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4"
          >
            <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
