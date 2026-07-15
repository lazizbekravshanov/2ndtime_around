import { afterEach, describe, expect, it } from "vitest";
import {
  createInMemoryLimiter,
  keyFingerprint,
  clientIpFrom,
  limitMessageSend,
  limitUpload,
  limitMagicLink,
  __setLimiterForTests,
  apiRateLimitResponse,
} from "@/lib/rateLimit";

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

describe("per-boundary limits", () => {
  afterEach(() => __setLimiterForTests(null)); // restore default

  it("messageSend allows 30/min then denies", async () => {
    __setLimiterForTests(createInMemoryLimiter(() => 0));
    const out = [];
    for (let i = 0; i < 31; i++) out.push(await limitMessageSend("u1"));
    expect(out.filter((d) => d.allowed).length).toBe(30);
    expect(out[30].allowed).toBe(false);
  });

  it("fail-OPEN: allows when the limiter backend throws", async () => {
    __setLimiterForTests({
      check: async () => {
        throw new Error("redis down");
      },
    });
    expect((await limitMessageSend("u1")).allowed).toBe(true);
  });

  it("fail-CLOSED: denies when the limiter backend throws (upload)", async () => {
    __setLimiterForTests({
      check: async () => {
        throw new Error("redis down");
      },
    });
    const d = await limitUpload("u1");
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSeconds).toBeGreaterThan(0);
  });
});

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

describe("limitMagicLink", () => {
  afterEach(() => __setLimiterForTests(null));

  it("allows 3 per email per 10 min then denies", async () => {
    __setLimiterForTests(createInMemoryLimiter(() => 0));
    const out = [];
    for (let i = 0; i < 4; i++) out.push(await limitMagicLink("a@uc.edu"));
    expect(out.map((d) => d.allowed)).toEqual([true, true, true, false]);
  });

  it("is per-email (normalized)", async () => {
    __setLimiterForTests(createInMemoryLimiter(() => 0));
    for (let i = 0; i < 3; i++) await limitMagicLink("a@uc.edu");
    expect((await limitMagicLink("A@UC.EDU")).allowed).toBe(false); // same key
    expect((await limitMagicLink("b@uc.edu")).allowed).toBe(true);
  });

  it("fails CLOSED when the limiter throws", async () => {
    __setLimiterForTests({
      check: async () => {
        throw new Error("down");
      },
    });
    expect((await limitMagicLink("a@uc.edu")).allowed).toBe(false);
  });
});
