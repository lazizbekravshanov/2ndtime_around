/**
 * Design-token hex values for JS-land consumers that cannot read CSS custom
 * properties (MapLibre paint expressions take literal color strings).
 * Keep in sync with the @theme block in src/app/globals.css.
 * Everything that CAN use `var(--color-…)` should — this file is the fallback.
 */
export const tokens = {
  paper: "#fafaf9",
  surface: "#ffffff",
  ink: "#1c1917",
  faint: "#57534e",
  accent: "#e00122",
  line: "#e7e5e4",
  lineStrong: "#d6d3d1",
} as const;
