// The one pill treatment. Browse previously had three near-identical rounded-full
// styles side by side (category shortcuts, active-filter chips, lost & found
// toggles) with different heights, padding, and text sizes.
const base =
  "tap-target inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors";

const states = {
  default: "border-line bg-surface text-faint hover:border-faint/40 hover:text-ink",
  // Selected filters read as ink-filled — the same "on" language as the tab bar.
  active: "border-ink bg-ink text-white",
};

export function chipClasses(state: keyof typeof states = "default"): string {
  return `${base} ${states[state]}`;
}
