import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

// One accent color, used sparingly: primary actions only. Everything else
// stays neutral so the red always means "the main thing to do here".
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const sizes = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-6",
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90",
  secondary: "border border-line bg-surface text-ink hover:bg-paper",
  ghost: "text-faint hover:text-ink hover:bg-line/50",
  danger: "border border-line bg-surface text-accent hover:border-accent/40",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: keyof typeof sizes = "md"
): string {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: keyof typeof sizes;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonClasses(variant, size)} ${className}`}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: keyof typeof sizes;
  children: ReactNode;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`${buttonClasses(variant, size)} ${className}`}
      {...props}
    />
  );
}
