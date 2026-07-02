import { ListingCardSkeleton } from "@/components/ListingCard";

/** Skeleton matching the profile page: identity header, listings, ratings. */
export default function ProfileLoading() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="skeleton h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-4 w-56" />
        </div>
      </div>
      <div className="mt-8 skeleton h-5 w-32" />
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
