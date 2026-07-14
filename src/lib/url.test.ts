import { describe, expect, it } from "vitest";
import { isSafeCallbackUrl, safeCallbackUrl, signInHref } from "@/lib/url";

describe("isSafeCallbackUrl", () => {
  it("accepts root-relative paths", () => {
    expect(isSafeCallbackUrl("/browse")).toBe(true);
    expect(isSafeCallbackUrl("/listing/abc123")).toBe(true);
    expect(isSafeCallbackUrl("/browse?tab=wanted&q=desk")).toBe(true);
    expect(isSafeCallbackUrl("/browse?min=5&max=50#top")).toBe(true);
  });

  it("rejects protocol-relative and absolute URLs (open redirect)", () => {
    expect(isSafeCallbackUrl("//evil.com")).toBe(false);
    expect(isSafeCallbackUrl("https://evil.com")).toBe(false);
    expect(isSafeCallbackUrl("http://evil.com/browse")).toBe(false);
    expect(isSafeCallbackUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects backslash tricks browsers may normalize to //", () => {
    expect(isSafeCallbackUrl("/\\evil.com")).toBe(false);
    expect(isSafeCallbackUrl("\\\\evil.com")).toBe(false);
    expect(isSafeCallbackUrl("/foo\\bar")).toBe(false);
  });

  it("rejects paths without a single leading slash", () => {
    expect(isSafeCallbackUrl("browse")).toBe(false);
    expect(isSafeCallbackUrl("")).toBe(false);
  });

  it("rejects whitespace / control characters", () => {
    expect(isSafeCallbackUrl("/browse ")).toBe(false);
    expect(isSafeCallbackUrl("/bro wse")).toBe(false);
    expect(isSafeCallbackUrl("/browse\n")).toBe(false);
    expect(isSafeCallbackUrl("/browse\t")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isSafeCallbackUrl(null)).toBe(false);
    expect(isSafeCallbackUrl(undefined)).toBe(false);
    expect(isSafeCallbackUrl(42)).toBe(false);
    expect(isSafeCallbackUrl({})).toBe(false);
  });
});

describe("safeCallbackUrl", () => {
  it("returns the value when safe", () => {
    expect(safeCallbackUrl("/listing/x")).toBe("/listing/x");
  });

  it("falls back to /browse for unsafe or missing values", () => {
    expect(safeCallbackUrl("//evil.com")).toBe("/browse");
    expect(safeCallbackUrl("https://evil.com")).toBe("/browse");
    expect(safeCallbackUrl(null)).toBe("/browse");
    expect(safeCallbackUrl(undefined)).toBe("/browse");
  });

  it("honors a custom fallback", () => {
    expect(safeCallbackUrl("//evil.com", "/")).toBe("/");
  });
});

describe("signInHref", () => {
  it("returns bare /signin when callback is missing or unsafe", () => {
    expect(signInHref()).toBe("/signin");
    expect(signInHref(null)).toBe("/signin");
    expect(signInHref("https://evil.com")).toBe("/signin");
    expect(signInHref("//evil.com")).toBe("/signin");
  });

  it("returns /signin with encoded safe callback", () => {
    expect(signInHref("/browse?tab=wanted")).toBe(
      "/signin?callbackUrl=%2Fbrowse%3Ftab%3Dwanted"
    );
    expect(signInHref("/sell")).toBe("/signin?callbackUrl=%2Fsell");
  });
});
