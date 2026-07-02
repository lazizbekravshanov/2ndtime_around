/** Skeleton matching the listing detail layout: photo area + right rail. */
export default function ListingLoading() {
  return (
    <div>
      <div className="skeleton h-5 w-28" />
      <div className="mt-4 grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <div className="skeleton aspect-[4/3] w-full rounded-xl" />
        </div>
        <div className="space-y-4 md:col-span-2">
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-7 w-24" />
          <div className="space-y-2 pt-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-2/3" />
          </div>
          <div className="skeleton h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
