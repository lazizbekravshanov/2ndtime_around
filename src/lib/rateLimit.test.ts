import { afterEach, describe, expect, it } from "vitest";
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
