import { SellWizard } from "./SellWizard";

export const metadata = { title: "Post an item" };

// Auth is enforced by the (app) layout. The wizard itself is client-side;
// the final createListing server action re-validates everything.
export default function SellPage() {
  return (
    <div className="mx-auto max-w-lg">
      <SellWizard />
    </div>
  );
}
