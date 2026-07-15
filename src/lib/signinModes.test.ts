import { describe, expect, it } from "vitest";
import { signinModes } from "@/lib/signinModes";

describe("signinModes", () => {
  it("enables the real form when SMTP is configured (any env)", () => {
    expect(
      signinModes({ emailServer: "smtp://x", nodeEnv: "production" }).emailEnabled
    ).toBe(true);
  });
  it("enables the real form in non-production even without SMTP (dev console links)", () => {
    expect(signinModes({ nodeEnv: "development" }).emailEnabled).toBe(true);
    expect(signinModes({ nodeEnv: "test" }).emailEnabled).toBe(true);
  });
  it("hides the real form in production without SMTP", () => {
    expect(signinModes({ nodeEnv: "production" }).emailEnabled).toBe(false);
  });
  it("gates demo on DEMO_PASSWORD", () => {
    expect(signinModes({ demoPassword: "pw" }).demoEnabled).toBe(true);
    expect(signinModes({}).demoEnabled).toBe(false);
  });
});
