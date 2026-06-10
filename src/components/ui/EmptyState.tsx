import type { ReactNode } from "react";

/**
 * Designed empty state — never a blank screen. Friendly copy plus one clear
 * next step, so a dead end always points somewhere useful.
 */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <p className="text-base font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-faint">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
