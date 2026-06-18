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
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-[transform,background-color,color] duration-150 active:scale-90 disabled:opacity-50 disabled:active:scale-100 ${
        active ? "text-ink" : "text-faint hover:bg-line/50 hover:text-ink"
      } ${className}`}
      {...props}
    />
  );
}
