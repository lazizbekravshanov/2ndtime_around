import { describe, expect, it } from "vitest";
import { signInHref, safeCallbackUrl } from "@/lib/url";
import { viewOutcome } from "@/lib/listingVisibility";

/**
 * Contract smoke tests for the public-browsing auth boundary.
 * These lock the CTA / visibility rules without standing up a browser.
 */
describe("public browsing auth contracts", () => {
  it("builds listing participation return paths", () => {
    const listingId = "clxyz123";
    const href = signInHref(`/listing/${listingId}`);
    expect(href).toBe(
      `/signin?callbackUrl=${encodeURIComponent(`/listing/${listingId}`)}`
    );
    expect(safeCallbackUrl(new URL(href, "http://localhost").searchParams.get("callbackUrl"))).toBe(
      `/listing/${listingId}`
    );
  });

  it("builds browse filter return paths", () => {
    const browse = "/browse?tab=wanted&q=desk";
    const href = signInHref(browse);
    expect(href).toContain("callbackUrl=");
    const cb = new URL(href, "http://localhost").searchParams.get("callbackUrl");
    expect(cb).toBe(browse);
  });

  it("builds sell and move-out post return paths", () => {
    expect(signInHref("/sell")).toBe("/signin?callbackUrl=%2Fsell");
    expect(signInHref("/sell?type=WANTED")).toBe(
      `/signin?callbackUrl=${encodeURIComponent("/sell?type=WANTED")}`
    );
    expect(signInHref("/sell/moveout")).toBe(
      `/signin?callbackUrl=${encodeURIComponent("/sell/moveout")}`
    );
  });

  it("builds profile return paths for anonymous favorite hearts", () => {
    expect(signInHref("/profile/user1")).toBe(
      `/signin?callbackUrl=${encodeURIComponent("/profile/user1")}`
    );
  });

  it("keeps landing sign-in pointed at browse", () => {
    expect(signInHref("/browse")).toBe(
      `/signin?callbackUrl=${encodeURIComponent("/browse")}`
    );
  });

  it("never exposes non-active listing content to anonymous viewers", () => {
    for (const status of ["DRAFT", "SOLD", "RESOLVED"] as const) {
      expect(viewOutcome({ status, isOwner: false })).toBe("unavailable");
    }
    expect(viewOutcome({ status: "DELETED", isOwner: false })).toBe("notFound");
    expect(viewOutcome({ status: "ACTIVE", isOwner: false })).toBe("ok");
  });
});
