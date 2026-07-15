# Rate-Limit Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add distributed, per-boundary rate limiting to the five highest-risk server boundaries (demo login, uploads, listing create/update/status, messaging send/poll, conversation SSE) without changing product behavior.

**Architecture:** A single policy layer in `src/lib/rateLimit.ts` exposes named, per-boundary limit functions returning a normalized decision. It is backed by an injectable `Limiter` interface with two adapters: an Upstash-backed adapter (production, when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set) and a deterministic in-memory adapter (local, tests, and production fallback). Checks run after auth, before mutation/expensive work. Authenticated boundaries key by `user.id` and fail **open**; demo login keys by a one-way hash of IP + normalized email and, with uploads, fails **closed**.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, `@upstash/ratelimit` + `@upstash/redis`, Node `crypto`, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-13-production-boundary-hardening-design.md` (revised 2026-07-15 for graceful Upstash fallback).
- Raw IP addresses and raw emails must NEVER appear in Redis keys or logs — hash them.
- Server actions keep the existing `ActionResult` contract (`src/lib/actions/listings.ts:15-17`): denial returns `{ ok: false, error }` (no `fieldErrors`).
- API routes return HTTP `429` + a `Retry-After` header on denial, matching each route's existing body convention (JSON for demo-login/upload/poll; plain text for SSE).
- Thresholds live as centralized constants; boundaries never inline numbers.
- Tests and CI require no network access and no production credentials — always exercise the in-memory adapter or an injected fake.
- Session is resolved via `getSessionUser()` (`src/lib/session.ts`); `user.id` is the authenticated key.
- Fail modes on **runtime limiter error**: demo login + upload = closed (deny); listing + messaging + SSE = open (allow).
- Graceful startup: in production with Upstash vars absent, log ONE warning and use the in-memory adapter — never throw.

---

## File structure

- Create `src/lib/rateLimit.ts` — policy layer: types, in-memory adapter, Upstash adapter, env-based selection, per-boundary functions, API 429 helper.
- Create `src/lib/rateLimit.test.ts` — unit tests (pure/in-memory only).
- Modify `src/instrumentation.ts` — startup warning when prod + Upstash absent.
- Modify the five boundaries (exact lines in each task).
- Modify `.env.example` and `README.md` — document the optional Upstash vars + fallback.
- Modify `package.json` — add the two Upstash deps.

---

### Task 1: Core types + in-memory adapter

**Files:**
- Create: `src/lib/rateLimit.ts`
- Test: `src/lib/rateLimit.test.ts`

**Interfaces:**
- Produces: `type RateDecision = { allowed: boolean; remaining: number; retryAfterSeconds: number }`; `type LimitRule = { limit: number; windowMs: number }`; `interface Limiter { check(key: string, rule: LimitRule): Promise<RateDecision> }`; `function createInMemoryLimiter(now?: () => number): Limiter`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rateLimit.test.ts
import { describe, expect, it } from "vitest";
import { createInMemoryLimiter } from "@/lib/rateLimit";

describe("createInMemoryLimiter", () => {
  const rule = { limit: 3, windowMs: 1000 };

  it("allows up to the limit then denies within a window", async () => {
    let t = 0;
    const lim = createInMemoryLimiter(() => t);
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await lim.check("k", rule));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[2].remaining).toBe(0);
    expect(results[3].retryAfterSeconds).toBe(1);
  });

  it("resets after the window elapses", async () => {
    let t = 0;
    const lim = createInMemoryLimiter(() => t);
    await lim.check("k", rule);
    await lim.check("k", rule);
    await lim.check("k", rule);
    expect((await lim.check("k", rule)).allowed).toBe(false);
    t = 1000; // next window
    expect((await lim.check("k", rule)).allowed).toBe(true);
  });

  it("keys are independent", async () => {
    const lim = createInMemoryLimiter(() => 0);
    for (let i = 0; i < 3; i++) await lim.check("a", rule);
    expect((await lim.check("b", rule)).allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: FAIL — `createInMemoryLimiter` is not exported / module missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/rateLimit.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts
git commit -m "feat: in-memory rate-limit adapter"
```

---

### Task 2: Privacy-preserving key fingerprint + client IP

**Files:**
- Modify: `src/lib/rateLimit.ts`
- Test: `src/lib/rateLimit.test.ts`

**Interfaces:**
- Produces: `function keyFingerprint(...parts: string[]): string` (sha256 hex, 32 chars); `function clientIpFrom(headers: Headers): string`.

- [ ] **Step 1: Write the failing test** (append to `rateLimit.test.ts`)

```ts
import { keyFingerprint, clientIpFrom } from "@/lib/rateLimit";

describe("keyFingerprint", () => {
  it("is stable and non-reversible (no raw input present)", () => {
    const fp = keyFingerprint("1.2.3.4", "a@uc.edu");
    expect(fp).toMatch(/^[0-9a-f]{32}$/);
    expect(fp).not.toContain("1.2.3.4");
    expect(fp).not.toContain("a@uc.edu");
    expect(keyFingerprint("1.2.3.4", "a@uc.edu")).toBe(fp); // stable
  });
  it("differs when any part differs", () => {
    expect(keyFingerprint("1.2.3.4", "a@uc.edu")).not.toBe(
      keyFingerprint("1.2.3.4", "b@uc.edu")
    );
  });
});

describe("clientIpFrom", () => {
  it("takes the first x-forwarded-for hop", () => {
    const h = new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" });
    expect(clientIpFrom(h)).toBe("9.9.9.9");
  });
  it("falls back to x-real-ip then a conservative anonymous key", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIpFrom(new Headers())).toBe("anonymous");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: FAIL — `keyFingerprint` / `clientIpFrom` not exported.

- [ ] **Step 3: Write minimal implementation** (add to top of `rateLimit.ts`)

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts
git commit -m "feat: privacy-preserving key fingerprint + client IP helper"
```

---

### Task 3: Policies + per-boundary limit functions (fail-open/closed)

**Files:**
- Modify: `src/lib/rateLimit.ts`
- Test: `src/lib/rateLimit.test.ts`

**Interfaces:**
- Produces (all return `Promise<RateDecision>`): `limitDemoLogin(ip: string, email: string)`, `limitUpload(userId: string)`, `limitListingCreate(userId: string)`, `limitListingMutate(userId: string)`, `limitMessageSend(userId: string)`, `limitMessagePoll(userId: string)`, `limitSse(userId: string)`. Also `function __setLimiterForTests(l: Limiter | null): void` to inject a fake limiter, and `type FailMode = "open" | "closed"`.

- [ ] **Step 1: Write the failing test** (append)

```ts
import {
  limitMessageSend,
  limitUpload,
  __setLimiterForTests,
  createInMemoryLimiter,
} from "@/lib/rateLimit";

describe("per-boundary limits", () => {
  afterEach(() => __setLimiterForTests(null)); // restore default

  it("messageSend allows 30/min then denies (fail-open policy still enforces normal denials)", async () => {
    __setLimiterForTests(createInMemoryLimiter(() => 0));
    const out = [];
    for (let i = 0; i < 31; i++) out.push(await limitMessageSend("u1"));
    expect(out.filter((d) => d.allowed).length).toBe(30);
    expect(out[30].allowed).toBe(false);
  });

  it("fail-OPEN: allows when the limiter backend throws", async () => {
    __setLimiterForTests({ check: async () => { throw new Error("redis down"); } });
    expect((await limitMessageSend("u1")).allowed).toBe(true);
  });

  it("fail-CLOSED: denies when the limiter backend throws (upload)", async () => {
    __setLimiterForTests({ check: async () => { throw new Error("redis down"); } });
    const d = await limitUpload("u1");
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSeconds).toBeGreaterThan(0);
  });
});
```

Add `import { afterEach } from "vitest";` to the file's imports.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Write minimal implementation** (add to `rateLimit.ts`)

```ts
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
      { key: `demoLogin:ipEmail:${keyFingerprint(ip, normEmail)}`, rule: RULES.demoLoginIpEmail },
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts
git commit -m "feat: rate-limit policies + per-boundary functions with fail-open/closed"
```

---

### Task 4: Upstash adapter + env selection + startup warning

**Files:**
- Modify: `package.json` (deps), `src/lib/rateLimit.ts`, `src/instrumentation.ts`
- Test: `src/lib/rateLimit.test.ts` (selection logic only — no network)

**Interfaces:**
- Produces: `function apiRateLimitResponse(decision: RateDecision, body: string | Record<string, unknown>): Response` (429 + Retry-After). Internal: `selectLimiter()`.

- [ ] **Step 1: Install deps**

Run: `npm install @upstash/ratelimit @upstash/redis`
Expected: both appear under `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test** (append) — for the API helper, which is pure

```ts
import { apiRateLimitResponse } from "@/lib/rateLimit";

describe("apiRateLimitResponse", () => {
  it("returns 429 with Retry-After and JSON body", async () => {
    const res = apiRateLimitResponse(
      { allowed: false, remaining: 0, retryAfterSeconds: 42 },
      { error: "Slow down." }
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "Slow down." });
  });
  it("supports a plain-text body (SSE convention)", async () => {
    const res = apiRateLimitResponse(
      { allowed: false, remaining: 0, retryAfterSeconds: 5 },
      "Too Many Requests"
    );
    expect(res.headers.get("Retry-After")).toBe("5");
    expect(await res.text()).toBe("Too Many Requests");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/rateLimit.test.ts`
Expected: FAIL — `apiRateLimitResponse` not exported.

- [ ] **Step 4: Implement adapter, selection, and API helper** (edit `rateLimit.ts`)

Add imports at top:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
```

Add the Upstash adapter + selection, and REPLACE the `let limiter: Limiter = createInMemoryLimiter();` line from Task 3 with `let limiter: Limiter = selectLimiter();`:

```ts
function createUpstashLimiter(redis: Redis): Limiter {
  const cache = new Map<string, Ratelimit>();
  return {
    async check(key, rule) {
      const id = `${rule.limit}:${rule.windowMs}`;
      let rl = cache.get(id);
      if (!rl) {
        rl = new Ratelimit({
          redis,
          prefix: "rl",
          limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowMs} ms`),
        });
        cache.set(id, rl);
      }
      const res = await rl.limit(key);
      return {
        allowed: res.success,
        remaining: res.remaining,
        retryAfterSeconds: res.success ? 0 : Math.max(0, Math.ceil((res.reset - Date.now()) / 1000)),
      };
    },
  };
}

function selectLimiter(): Limiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return createUpstashLimiter(new Redis({ url, token }));
  return createInMemoryLimiter();
}

/** 429 response helper for API routes. Body is JSON (object) or plain text. */
export function apiRateLimitResponse(
  decision: RateDecision,
  body: string | Record<string, unknown>
): Response {
  const isText = typeof body === "string";
  return new Response(isText ? body : JSON.stringify(body), {
    status: 429,
    headers: {
      "Retry-After": String(decision.retryAfterSeconds),
      ...(isText ? {} : { "Content-Type": "application/json" }),
    },
  });
}
```

- [ ] **Step 5: Add the startup warning** — edit `src/instrumentation.ts`, inside the `NODE_ENV === "production"` block (after the existing `DEMO_PASSWORD` warn near line 25):

```ts
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn(
      "[startup] Upstash not configured — rate limiting will use the in-memory (per-instance) adapter. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed limiting."
    );
  }
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run src/lib/rateLimit.test.ts && npm run typecheck`
Expected: tests PASS; typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/rateLimit.ts src/instrumentation.ts
git commit -m "feat: Upstash adapter, env selection, 429 helper, startup warning"
```

---

### Task 5: Wire demo login (fail closed, 429 + Retry-After)

**Files:**
- Modify: `src/app/api/demo-login/route.ts`

**Interfaces:**
- Consumes: `limitDemoLogin`, `clientIpFrom`, `apiRateLimitResponse`.

- [ ] **Step 1: Add the check** — after the zod body parse (after line ~40, before the UC-email gate at line 43). Insert:

```ts
import { limitDemoLogin, clientIpFrom, apiRateLimitResponse } from "@/lib/rateLimit";
// ...inside POST, after `const parsed = bodySchema.safeParse(...)` success guard:
  const ip = clientIpFrom(request.headers);
  const rl = await limitDemoLogin(ip, parsed.data.email);
  if (!rl.allowed) {
    return apiRateLimitResponse(rl, { error: "Too many attempts. Try again shortly." });
  }
```

This runs before `isUcEmail`, the persona allowlist, and the timing-safe password check, so brute-force attempts are throttled before any expensive/security work.

- [ ] **Step 2: Manual verification (dev)**

Run the app (`npm run dev`) and hammer the endpoint:

```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code} " -X POST localhost:3000/api/demo-login \
    -H 'Content-Type: application/json' \
    -d '{"email":"demo@uc.edu","password":"wrong"}'
done; echo
```
Expected: first ~5 return `401`, then `429` (the per-IP/email rule of 5/10min trips first). A `429` response includes a `Retry-After` header (`curl -s -D - ... | grep -i retry-after`).

- [ ] **Step 3: Typecheck + full test run**

Run: `npm run typecheck && npm test`
Expected: clean; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/demo-login/route.ts
git commit -m "feat: rate-limit demo login (fail closed)"
```

---

### Task 6: Wire uploads (fail closed, 429 + Retry-After)

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 1: Add the check** — after auth (`const user = await getSessionUser()` + null 401 guard, line ~11), before `uploadService.save`:

```ts
import { limitUpload, apiRateLimitResponse } from "@/lib/rateLimit";
// ...after the `if (!user) return ... 401` guard:
  const rl = await limitUpload(user.id);
  if (!rl.allowed) {
    return apiRateLimitResponse(rl, { error: "Upload limit reached. Try again later." });
  }
```

- [ ] **Step 2: Manual verification (dev)** — sign in via demo, then POST 11 small files; the 11th within 10 min returns `429` with `Retry-After`. (Or temporarily lower `RULES.uploadShort.limit` to 2 to verify quickly, then revert.)

- [ ] **Step 3: Typecheck + tests**

Run: `npm run typecheck && npm test`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: rate-limit uploads (fail closed)"
```

---

### Task 7: Wire listing create / update / status (fail open, ActionResult)

**Files:**
- Modify: `src/lib/actions/listings.ts`

**Interfaces:**
- Consumes: `limitListingCreate`, `limitListingMutate`.

- [ ] **Step 1: Add the import + checks.** Add at top: `import { limitListingCreate, limitListingMutate } from "@/lib/rateLimit";`

In `createListing`, after the auth guard (line ~33) and before the daily-limit DB query (line ~44):

```ts
  const rl = await limitListingCreate(user.id);
  if (!rl.allowed) {
    return { ok: false, error: "You're posting too fast. Try again in a few minutes." };
  }
```

In `updateListing`, after the auth guard (line ~112), before the owner lookup:

```ts
  const rl = await limitListingMutate(user.id);
  if (!rl.allowed) {
    return { ok: false, error: "Too many changes too fast. Try again shortly." };
  }
```

In `setListingStatus`, after the auth guard (line ~215), before the parse/owner check:

```ts
  const rlStatus = await limitListingMutate(user.id);
  if (!rlStatus.allowed) {
    return { ok: false, error: "Too many changes too fast. Try again shortly." };
  }
```

(Distinct variable name `rlStatus` avoids any shadow if the code is later merged; both call `limitListingMutate` since update and status share the mutate quota per spec.)

- [ ] **Step 2: Manual verification (dev)** — temporarily set `RULES.listingCreate.limit` to 2, create 3 listings; the 3rd returns the "posting too fast" error toast in the sell wizard. Revert the constant.

- [ ] **Step 3: Typecheck + tests**

Run: `npm run typecheck && npm test`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/listings.ts
git commit -m "feat: rate-limit listing create/update/status (fail open)"
```

---

### Task 8: Wire messaging send + poll + SSE (fail open)

**Files:**
- Modify: `src/lib/actions/conversations.ts`, `src/app/api/conversations/[id]/messages/route.ts`, `src/app/api/conversations/[id]/stream/route.ts`

**Interfaces:**
- Consumes: `limitMessageSend`, `limitMessagePoll`, `limitSse`, `apiRateLimitResponse`.

- [ ] **Step 1: Message SEND** — `conversations.ts`, in `sendMessage`, after the auth guard (line ~78), before the `messageSchema` parse / conversation load:

```ts
import { limitMessageSend } from "@/lib/rateLimit";
// ...inside sendMessage after `if (!user) return {...}`:
  const rl = await limitMessageSend(user.id);
  if (!rl.allowed) {
    return { ok: false, error: "You're sending messages too quickly. Slow down a moment." };
  }
```

- [ ] **Step 2: Message POLL** — `api/conversations/[id]/messages/route.ts`, after auth (line ~16), before the DB read/`updateMany`:

```ts
import { limitMessagePoll, apiRateLimitResponse } from "@/lib/rateLimit";
// ...after the `if (!user) return ... 401` guard:
  const rl = await limitMessagePoll(user.id);
  if (!rl.allowed) {
    return apiRateLimitResponse(rl, { error: "Slow down." });
  }
```

- [ ] **Step 3: SSE** — `api/conversations/[id]/stream/route.ts`, after auth + participant check (line ~29), before the `ReadableStream` is constructed (line ~41). Use plain-text body to match this route's convention:

```ts
import { limitSse, apiRateLimitResponse } from "@/lib/rateLimit";
// ...after the participant authorization check, before `new TextEncoder()`:
  const rl = await limitSse(user.id);
  if (!rl.allowed) {
    return apiRateLimitResponse(rl, "Too Many Requests");
  }
```

- [ ] **Step 4: Manual verification (dev)** — open a conversation; the browser polls `/messages` every 5s (well under 60/min) and the SSE opens once, so normal use is unaffected. Temporarily lower `RULES.messagePoll.limit` to 2 and confirm rapid manual `curl` polls return `429`; revert.

- [ ] **Step 5: Typecheck + tests**

Run: `npm run typecheck && npm test`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/conversations.ts "src/app/api/conversations/[id]/messages/route.ts" "src/app/api/conversations/[id]/stream/route.ts"
git commit -m "feat: rate-limit message send/poll + SSE (fail open)"
```

---

### Task 9: Document Upstash vars + fallback

**Files:**
- Modify: `.env.example`, `README.md`

- [ ] **Step 1: `.env.example`** — add after the existing optional vars:

```bash
# Rate limiting (optional). When both are set, limiting is distributed via
# Upstash Redis. When absent, the app falls back to per-instance in-memory
# limiting (fine for local/dev; weaker but non-fatal in production).
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 2: `README.md`** — add a short "Rate limiting" note under the decisions/hardening section describing the five limited boundaries, the fail-open (marketplace/messaging) vs fail-closed (demo-login/uploads) policy, and that setting the two Upstash vars upgrades from per-instance to distributed limiting with no code change.

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document optional Upstash rate-limit vars + fallback"
```

---

### Task 10: Full verification

- [ ] **Step 1: Clean typecheck** — `rm -rf .next && npm run typecheck` → clean (route-file edits can leave stale `.next` types).
- [ ] **Step 2: Full test suite** — `npm test` → all pass (existing + new rateLimit tests).
- [ ] **Step 3: Production build** — `npm run build` → succeeds; all routes compile.
- [ ] **Step 4: Smoke (dev)** — with NO Upstash vars set: start `npm run dev`, confirm the startup warning prints once, normal browse/message/upload flows work, and the demo-login brute-force loop from Task 5 trips `429`. Confirm no raw IP/email appears in server logs.
- [ ] **Step 5: Commit any fixes**, then this branch is ready for review/merge. Deploy note: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel to activate distributed limiting; deploying without them is safe (per-instance fallback).

---

## Self-review notes

- **Spec coverage:** demo-login (T5), uploads (T6), listing create/update/status (T7), message send/poll + SSE (T8) — all five boundaries covered. Named policies + centralized constants (T3). 429 + Retry-After (T4 helper, used in T5/6/8). ActionResult preserved (T7/8 send). Privacy-preserving keys, no raw IP/email in keys/logs (T2/T3). Fail-open vs fail-closed (T3 + per-boundary). Graceful startup, no throw (T4). Unit tests for key gen, policy selection, allowed/denied, retry metadata, in-memory adapter, fail-open/closed (T1-T4). `.env.example` + docs (T9). Build/typecheck/tests (T10).
- **Deviation from original spec:** startup is a warning, not a throw (graceful fallback, agreed 2026-07-15 and reflected in the revised spec).
- **Testing scope:** the repo has no db/session mocking infra, so per-boundary *integration* tests are out of scope; instead the limit logic is factored behind pure/injectable seams (`__setLimiterForTests`, `createInMemoryLimiter`, `apiRateLimitResponse`) and unit-tested directly, with manual dev verification per boundary. This matches the existing pure-unit-test convention.
