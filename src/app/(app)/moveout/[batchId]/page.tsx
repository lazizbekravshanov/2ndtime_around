import { notFound } from "next/navigation";
import { ListingCard } from "@/components/ListingCard";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { favoritedListingIds } from "@/lib/actions/favorites";

export const metadata = { title: "Move-out sale" };

export default async function MoveoutBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const user = await requireUser();

  const listings = await db.listing.findMany({
    where: { moveoutBatchId: batchId, status: { in: ["ACTIVE", "SOLD", "RESOLVED"] } },
    include: { owner: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (listings.length === 0) notFound();

  const seller = listings[0].owner;
  const favIds = await favoritedListingIds(user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        {seller.displayName}&apos;s move-out sale
      </h1>
      <p className="mt-1 text-sm text-faint">
        {listings.length} {listings.length === 1 ? "item" : "items"} · grab what
        you need before they&apos;re gone
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={{ ...l, type: l.type as never, status: l.status as never }}
            favorited={
              l.ownerId !== user.id ? favIds.has(l.id) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
