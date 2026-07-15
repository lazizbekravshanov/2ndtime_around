import { createHash } from "crypto";

/** One-way, stable fingerprint of sensitive parts (IP, email) for keys/logs. */
export function keyFingerprint(...parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

/** Best-available client IP from request headers; conservative anon fallback. */
export function clientIpFrom(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "anonymous";
}

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

const MIN = 60_000;
const DAY = 86_400_000;
type FailMode = "open" | "closed";

// Centralized, tunable thresholds. Each boundary lists one or more rules.
const RULES = {
  demoLoginIp: { limit: 10, windowMs: 10 * MIN },
  demoLoginIpEmail: { limit: 5, windowMs: 10 * MIN },
  uploadShort: { limit: 10, windowMs: 10 * MIN },
  uploadDaily: { limit: 50, windowMs: DAY },
  listingCreate: { limit: 5, windowMs: 5 * MIN },
  listingMutate: { limit: 30, windowMs: 10 * MIN },
  messageSend: { limit: 30, windowMs: MIN },
  messagePoll: { limit: 60, windowMs: MIN },
  sse: { limit: 10, windowMs: MIN },
} satisfies Record<string, LimitRule>;

// Module limiter, chosen once (Task 4 replaces this with env selection).
let limiter: Limiter = createInMemoryLimiter();
/** Test seam: pass a fake limiter, or null to restore the module default. */
export function __setLimiterForTests(l: Limiter | null): void {
  limiter = l ?? createInMemoryLimiter();
}

async function enforce(
  keyed: Array<{ key: string; rule: LimitRule }>,
  failMode: FailMode
): Promise<RateDecision> {
  try {
    const decisions = await Promise.all(keyed.map((k) => limiter.check(k.key, k.rule)));
    const denied = decisions.filter((d) => !d.allowed);
    if (denied.length === 0) {
      return {
        allowed: true,
        remaining: Math.min(...decisions.map((d) => d.remaining)),
        retryAfterSeconds: 0,
      };
    }
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(...denied.map((d) => d.retryAfterSeconds)),
    };
  } catch {
    // Backend error: apply the boundary's fail mode. Never log raw identifiers.
    return failMode === "open"
      ? { allowed: true, remaining: 0, retryAfterSeconds: 0 }
      : { allowed: false, remaining: 0, retryAfterSeconds: 60 };
  }
}

export function limitDemoLogin(ip: string, email: string): Promise<RateDecision> {
  const normEmail = email.trim().toLowerCase();
  return enforce(
    [
      { key: `demoLogin:ip:${keyFingerprint(ip)}`, rule: RULES.demoLoginIp },
      {
        key: `demoLogin:ipEmail:${keyFingerprint(ip, normEmail)}`,
        rule: RULES.demoLoginIpEmail,
      },
    ],
    "closed"
  );
}

export function limitUpload(userId: string): Promise<RateDecision> {
  return enforce(
    [
      { key: `upload:short:${userId}`, rule: RULES.uploadShort },
      { key: `upload:daily:${userId}`, rule: RULES.uploadDaily },
    ],
    "closed"
  );
}

export function limitListingCreate(userId: string): Promise<RateDecision> {
  return enforce([{ key: `listingCreate:${userId}`, rule: RULES.listingCreate }], "open");
}
export function limitListingMutate(userId: string): Promise<RateDecision> {
  return enforce([{ key: `listingMutate:${userId}`, rule: RULES.listingMutate }], "open");
}
export function limitMessageSend(userId: string): Promise<RateDecision> {
  return enforce([{ key: `messageSend:${userId}`, rule: RULES.messageSend }], "open");
}
export function limitMessagePoll(userId: string): Promise<RateDecision> {
  return enforce([{ key: `messagePoll:${userId}`, rule: RULES.messagePoll }], "open");
}
export function limitSse(userId: string): Promise<RateDecision> {
  return enforce([{ key: `sse:${userId}`, rule: RULES.sse }], "open");
}
