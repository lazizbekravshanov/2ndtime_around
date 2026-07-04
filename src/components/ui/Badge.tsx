import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-line/60 text-ink",
  accent: "bg-accent text-white",
  success: "bg-success/10 text-success-strong",
  outline: "border border-line text-faint",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
