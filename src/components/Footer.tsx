import Link from "next/link";
import { LeafIcon } from "@/components/icons";
import { getImpactCount } from "@/lib/impact";

/** Site-wide footer with the live sustainability counter. */
export async function Footer() {
  const count = await getImpactCount();
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-20 md:pb-0">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-faint sm:flex-row">
        <Link
          href="/impact"
          className="inline-flex items-center gap-2 hover:text-ink"
        >
          <LeafIcon className="h-4 w-4 text-success" />
          <span>
            <strong className="font-semibold text-ink">{count}</strong>{" "}
            {count === 1 ? "item" : "items"} kept out of landfills
          </span>
        </Link>
        <p>Built by Team 4 — IT2021 · University of Cincinnati</p>
      </div>
    </footer>
  );
}
