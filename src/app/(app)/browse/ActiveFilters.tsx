"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "@/components/icons";

/** Dismissible pills for each applied filter — tap × to remove just that one. */
export function ActiveFilters({
  chips,
}: {
  chips: { key: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (chips.length === 0) return null;

  function remove(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => remove(chip.key)}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-faint transition-colors hover:text-ink"
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <XIcon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
