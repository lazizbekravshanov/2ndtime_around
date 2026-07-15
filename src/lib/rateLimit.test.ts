import { afterEach, describe, expect, it } from "vitest";
import {
  createInMemoryLimiter,
  keyFingerprint,
  clientIpFrom,
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
