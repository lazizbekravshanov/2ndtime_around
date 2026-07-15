export type RateDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type LimitRule = { limit: number; windowMs: number };

export interface Limiter {
  check(key: string, rule: LimitRule): Promise<RateDecision>;
}

/**
 * Deterministic fixed-window counter. Used in dev, tests, and as the production
 * fallback when Upstash is not configured. `now` is injectable for tests.
 */
export function createInMemoryLimiter(now: () => number = () => Date.now()): Limiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    async check(key, rule) {
      const t = now();
      const windowIndex = Math.floor(t / rule.windowMs);
      const bucketKey = `${key}:${rule.windowMs}:${windowIndex}`;
      const resetAt = (windowIndex + 1) * rule.windowMs;
      const prev = buckets.get(bucketKey);
      const count = (prev?.count ?? 0) + 1;
      buckets.set(bucketKey, { count, resetAt });
      // Opportunistic prune so the map does not grow unbounded.
      if (buckets.size > 5000) {
        for (const [k, v] of buckets) if (v.resetAt <= t) buckets.delete(k);
      }
      const allowed = count <= rule.limit;
      return {
        allowed,
        remaining: Math.max(0, rule.limit - count),
        retryAfterSeconds: allowed ? 0 : Math.ceil((resetAt - t) / 1000),
      };
    },
  };
}
