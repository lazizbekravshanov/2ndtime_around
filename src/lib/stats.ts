/** Quartiles via linear interpolation. Returns null for an empty input. */
export function quantiles(
  nums: number[]
): { p25: number; median: number; p75: number } | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const at = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return { p25: at(0.25), median: at(0.5), p75: at(0.75) };
}

export function median(nums: number[]): number | null {
  return quantiles(nums)?.median ?? null;
}
