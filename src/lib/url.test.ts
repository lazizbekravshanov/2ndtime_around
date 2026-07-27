import { describe, expect, it } from "vitest";
import {
  isSafeCallbackUrl,
  safeBrowseReturn,
  safeCallbackUrl,
  signInHref,
} from "@/lib/url";

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

describe("safeBrowseReturn", () => {
  it("accepts browse paths, with or without a query", () => {
    expect(safeBrowseReturn("/browse")).toBe("/browse");
    expect(safeBrowseReturn("/browse?tab=wanted")).toBe("/browse?tab=wanted");
    expect(safeBrowseReturn("/browse?q=desk+chair&category=Furniture&page=2")).toBe(
      "/browse?q=desk+chair&category=Furniture&page=2"
    );
    expect(safeBrowseReturn("/browse#results")).toBe("/browse#results");
  });

  it("rejects in-app paths that are not browse", () => {
    // Without this, ?from= would be a general-purpose in-app redirect.
    expect(safeBrowseReturn("/sell")).toBe(null);
    expect(safeBrowseReturn("/messages")).toBe(null);
    expect(safeBrowseReturn("/signin?callbackUrl=%2Fsell")).toBe(null);
  });

  it("rejects prefixes that merely start with the browse string", () => {
    expect(safeBrowseReturn("/browsers")).toBe(null);
    expect(safeBrowseReturn("/browse-all")).toBe(null);
    expect(safeBrowseReturn("/browsefoo?q=1")).toBe(null);
  });

  it("rejects off-origin and smuggled values", () => {
    expect(safeBrowseReturn("https://evil.com/browse")).toBe(null);
    expect(safeBrowseReturn("//evil.com/browse")).toBe(null);
    expect(safeBrowseReturn("/\\evil.com/browse")).toBe(null);
    expect(safeBrowseReturn("/browse\\@evil.com")).toBe(null);
    expect(safeBrowseReturn("/browse\n?q=x")).toBe(null);
  });

  it("rejects missing or non-string values", () => {
    expect(safeBrowseReturn(undefined)).toBe(null);
    expect(safeBrowseReturn(null)).toBe(null);
    expect(safeBrowseReturn("")).toBe(null);
    expect(safeBrowseReturn(42)).toBe(null);
  });
});
