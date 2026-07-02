/** Skeleton matching a conversation: header card + a few message bubbles. */
export default function ThreadLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <div className="skeleton h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div className="flex justify-start">
          <div className="skeleton h-12 w-3/5 rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <div className="skeleton h-10 w-1/2 rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <div className="skeleton h-16 w-2/3 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
