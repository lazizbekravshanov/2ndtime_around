import type { ReactNode } from "react";

/**
 * Designed empty state — never a blank screen. An icon, friendly copy, and one
 * clear next step, so a dead end always points somewhere useful. Callers can
 * pass their own `icon`; otherwise a neutral placeholder is shown.
 */
export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper text-faint"
      >
        {icon ?? <DefaultIcon />}
      </div>
      <p className="text-base font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-faint">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function DefaultIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 7.5V16.5L12 21l9-4.5V7.5" />
      <path d="M12 12v9" />
    </svg>
  );
}
