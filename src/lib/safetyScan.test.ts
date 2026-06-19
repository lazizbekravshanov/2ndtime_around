import { describe, expect, it } from "vitest";
import { hasContactOrPaymentRisk } from "@/lib/safetyScan";

describe("hasContactOrPaymentRisk", () => {
  it("flags named payment services", () => {
    expect(hasContactOrPaymentRisk("just venmo me")).toBe(true);
    expect(hasContactOrPaymentRisk("I use Cash App")).toBe(true);
    expect(hasContactOrPaymentRisk("send via Zelle please")).toBe(true);
    expect(hasContactOrPaymentRisk("paypal works too")).toBe(true);
  });

  it("flags payment URLs", () => {
    expect(hasContactOrPaymentRisk("paypal.com/paypalme/x")).toBe(true);
    expect(hasContactOrPaymentRisk("cashapp.com/$abc")).toBe(true);
  });

  it("flags phone numbers", () => {
    expect(hasContactOrPaymentRisk("text me 513-555-0199")).toBe(true);
    expect(hasContactOrPaymentRisk("call (513) 555 0199")).toBe(true);
    expect(hasContactOrPaymentRisk("+1 5135550199")).toBe(true);
  });

  it("does not flag ordinary messages", () => {
    expect(hasContactOrPaymentRisk("Is this still available?")).toBe(false);
    expect(hasContactOrPaymentRisk("Meet at Langsam at 3pm?")).toBe(false);
    expect(hasContactOrPaymentRisk("$25 firm, barely used")).toBe(false);
  });
});
