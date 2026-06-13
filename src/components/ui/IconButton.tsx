import type { ComponentProps } from "react";

/** Square ghost icon button — used for hearts, bells, overflow menus. */
export function IconButton({
  className = "",
  active = false,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
        active ? "text-ink" : "text-faint hover:bg-line/50 hover:text-ink"
      } ${className}`}
      {...props}
    />
  );
}
