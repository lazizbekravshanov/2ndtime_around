import { SellWizard } from "./SellWizard";
import { LISTING_TYPES, type ListingType } from "@/lib/constants";

export const metadata = { title: "Post an item" };

// Auth is enforced by the (app) layout. The wizard itself is client-side;
// the final createListing server action re-validates everything.
export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialType = (LISTING_TYPES as readonly string[]).includes(type ?? "")
    ? (type as ListingType)
    : undefined;
  return (
    <div className="mx-auto max-w-lg">
      <SellWizard initialType={initialType} />
    </div>
  );
}
