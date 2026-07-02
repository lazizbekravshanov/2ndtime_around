import { ListingCardSkeleton } from "@/components/ListingCard";

/** Card-grid skeletons matching the Saved items view. */
export default function SavedLoading() {
  return (
    <div>
      <div className="skeleton h-7 w-24" />
      <div className="mt-4 flex gap-4 border-b border-line pb-2">
        <div className="skeleton h-4 w-16" />
        <div className="skeleton h-4 w-24" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
