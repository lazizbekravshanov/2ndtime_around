import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

// One accent color, used sparingly: primary actions only. Everything else
// stays neutral so the red always means "the main thing to do here".
const base =
  "inline-flex items-center justify-center gap-2 text-sm font-medium transition-[transform,background-color,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 whitespace-nowrap";

// Default radius everywhere; "pill" is the landing page's CTA treatment.
type Shape = "rounded" | "pill";
const shapes: Record<Shape, string> = {
  rounded: "rounded-lg",
  pill: "rounded-full",
};

const sizes = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-6",
};

const variants: Record<Variant, string> = {
  // The one accent: solid UC Red, calm darken on hover. No glow, no shadow.
  primary: "bg-accent text-white hover:bg-accent/90",
  secondary:
    "border border-line bg-surface text-ink hover:bg-paper hover:border-faint/30",
  ghost: "text-faint hover:text-ink hover:bg-line/50",
  danger: "border border-line bg-surface text-accent hover:border-accent/40",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: keyof typeof sizes = "md",
  shape: Shape = "rounded"
): string {
  return `${base} ${shapes[shape]} ${sizes[size]} ${variants[variant]}`;
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: keyof typeof sizes;
  shape?: Shape;
};

export function Button({
  variant = "primary",
  size = "md",
  shape = "rounded",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonClasses(variant, size, shape)} ${className}`}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: keyof typeof sizes;
  shape?: Shape;
  children: ReactNode;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  shape = "rounded",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`${buttonClasses(variant, size, shape)} ${className}`}
      {...props}
    />
  );
}
