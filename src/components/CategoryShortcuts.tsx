import Link from "next/link";
import {
  BikeIcon,
  BookIcon,
  BrushIcon,
  LampIcon,
  MonitorIcon,
  MusicIcon,
} from "@/components/icons";

// The campus staples, hand-picked — what students actually hunt for between
// classes. Each chip is just a link with the category preselected, so the
// row is the category picker and disappears once one is chosen.
const SHORTCUTS = [
  { category: "Textbooks & Course Materials", label: "Textbooks", icon: BookIcon },
  { category: "Dorm & Apartment Essentials", label: "Dorm essentials", icon: LampIcon },
  { category: "Bikes & Transit", label: "Bikes & transit", icon: BikeIcon },
  { category: "Electronics", label: "Electronics", icon: MonitorIcon },
  { category: "Music & Instruments", label: "Music · CCM", icon: MusicIcon },
  { category: "Art & Design Supplies", label: "Art & design · DAAP", icon: BrushIcon },
];

/** Quiet, scrollable category shortcut chips for the Marketplace tab. */
export function CategoryShortcuts() {
  return (
    // Negative margin lets the row bleed to the screen edge on phones so a
    // half-visible chip signals "scroll me", while content stays on the grid.
    <nav aria-label="Popular categories" className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-2">
        {SHORTCUTS.map(({ category, label, icon: Icon }) => (
          <Link
            key={category}
            href={`/browse?category=${encodeURIComponent(category)}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface py-2 pl-3 pr-4 text-sm font-medium transition-colors hover:border-faint/40 hover:bg-paper"
          >
            <Icon className="h-4 w-4 text-faint" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
