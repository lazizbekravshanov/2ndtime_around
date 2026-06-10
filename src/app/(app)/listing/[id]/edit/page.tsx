import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { photoList } from "@/lib/format";
import { requireUser } from "@/lib/session";
import type { ListingType } from "@/lib/constants";
import { EditListingForm } from "./EditListingForm";

export const metadata = { title: "Edit listing" };

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const listing = await db.listing.findUnique({ where: { id } });
  // Owners only — anyone else gets a 404, not a hint that the page exists.
  if (!listing || listing.status === "DELETED" || listing.ownerId !== user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/listing/${listing.id}`}
        className="inline-flex items-center gap-1 text-sm text-faint hover:text-ink"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to listing
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Edit listing</h1>
      <div className="mt-6">
        <EditListingForm
          listing={{
            id: listing.id,
            type: listing.type as ListingType,
            status: listing.status,
            title: listing.title,
            description: listing.description,
            category: listing.category,
            condition: listing.condition,
            price: listing.price,
            locationNote: listing.locationNote,
            photos: photoList(listing.photos),
          }}
        />
      </div>
    </div>
  );
}
