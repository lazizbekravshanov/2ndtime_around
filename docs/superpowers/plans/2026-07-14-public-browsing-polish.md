# Public Browsing Polish — Implementation Plan (Cycle 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the highest-impact gaps from the public-browsing audit so every anonymous participation entry point preserves a safe return URL, and the public chrome matches signed-in UX expectations.

**Architecture:** Keep browse/listing public. Add a tiny `signInHref()` helper on top of the existing `safeCallbackUrl` validator. Wire that helper through public header Sign in, empty-state Post CTAs, move-out banner, Save Search copy, and `requireUser()` redirects. Soften public layout padding for anonymous visitors.

**Tech Stack:** Next.js 15 App Router, React 19, Vitest, existing `@/lib/url` callback validator.

## Global Constraints

- Callback URLs must remain same-origin relative paths validated by `isSafeCallbackUrl` / `safeCallbackUrl`.
- Do not enable real UC registration in this cycle.
- Do not expose draft/sold/resolved listing content to anonymous visitors.
- Preserve all existing 108 unit tests.
- Prefer small focused commits per task.

## File map

| File | Responsibility |
|---|---|
| `src/lib/url.ts` | Existing validator + new `signInHref(callbackPath)` helper |
| `src/lib/url.test.ts` | Unit tests for validator + helper |
| `src/lib/session.ts` | `requireUser()` redirect with safe callback |
| `src/app/(public)/layout.tsx` | Public header Sign in + anon padding |
| `src/components/PublicSignInLink.tsx` | Client link that appends current path as callback |
| `src/app/(public)/browse/page.tsx` | Empty-state Post CTAs via sign-in |
| `src/app/(public)/browse/SaveSearchButton.tsx` | Anon copy: "Sign in to save…" |
| `src/components/MoveoutBanner.tsx` | Optional anon sign-in href for move-out CTA |

---

### Task 1: `signInHref` helper

**Files:**
- Modify: `src/lib/url.ts`
- Test: `src/lib/url.test.ts`

**Interfaces:**
- Consumes: `safeCallbackUrl(value, fallback?)`
- Produces: `signInHref(callbackPath?: unknown): string` → `/signin` or `/signin?callbackUrl=<encoded>`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isSafeCallbackUrl, safeCallbackUrl, signInHref } from "@/lib/url";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/url.test.ts`
Expected: FAIL — `signInHref` is not exported

- [ ] **Step 3: Implement helper**

Add to `src/lib/url.ts`:

```ts
/** Build a /signin link that returns to `callbackPath` after auth when safe. */
export function signInHref(callbackPath?: unknown): string {
  const safe = safeCallbackUrl(callbackPath, "");
  if (!safe) return "/signin";
  return `/signin?callbackUrl=${encodeURIComponent(safe)}`;
}
```

Update `safeCallbackUrl` so an empty-string fallback is honored (already returns `value` when safe; when unsafe returns fallback — passing `""` works if we treat empty fallback as intentional). Current signature already supports this.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/url.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/url.ts src/lib/url.test.ts
git commit -m "feat: add signInHref helper for safe return paths"
```

---

### Task 2: Preserve callback in `requireUser`

**Files:**
- Modify: `src/lib/session.ts`
- Test: `src/lib/session.test.ts` (new; mock next/navigation + next-auth)

**Interfaces:**
- Consumes: `signInHref`, `headers()` from `next/headers` for path
- Produces: anonymous `requireUser()` → `redirect(signInHref(currentPath))`

Because Next.js headers do not always expose the full path reliably in App Router without `x-url` middleware, prefer an explicit optional argument:

```ts
export async function requireUser(opts?: {
  allowUnonboarded?: boolean;
  /** Relative path to return to after sign-in (validated). */
  callbackUrl?: string;
}): Promise<SessionUser>
```

And update `(app)/layout.tsx` is harder for per-route paths. Simpler reliable approach for Cycle 1:

Use `headers().get("x-pathname")` only if present; otherwise fall back to `/browse`. Better: pass nothing from layout, and for deep links from public CTAs we already set callback. For direct hits to `/sell`, we need middleware or headers.

**Cycle 1 approach (pragmatic):**
1. Add optional `callbackUrl` to `requireUser`.
2. In `(app)/layout.tsx`, read `headers().get("next-url")` is unavailable — instead add a tiny middleware that sets `x-pathname` + `x-search` from the request URL for `(app)` routes only.
3. `requireUser` builds callback from those headers when `opts.callbackUrl` is omitted.

To stay YAGNI for Cycle 1 without middleware complexity: update `requireUser` to accept optional callback, and for layout use:

```ts
import { headers } from "next/headers";

function callbackFromHeaders(h: Headers): string {
  const path = h.get("x-invoke-path") ?? h.get("x-pathname");
  // Vercel / Next often lack these. Fallback:
  return path && path.startsWith("/") ? path : "/browse";
}
```

Actually the cleanest Cycle 1 fix that always works for public→auth CTAs is already `signInHref` on buttons. For direct `/sell` URL hits, middleware is the right fix.

Add `src/middleware.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
```

Then `requireUser`:

```ts
import { headers } from "next/headers";
import { signInHref, safeCallbackUrl } from "@/lib/url";

export async function requireUser(opts?: {
  allowUnonboarded?: boolean;
  callbackUrl?: string;
}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const h = await headers();
    const fromHeader = h.get("x-pathname");
    const callback = safeCallbackUrl(opts?.callbackUrl ?? fromHeader, "/browse");
    redirect(signInHref(callback));
  }
  ...
}
```

- [ ] **Step 1: Write failing session redirect test** (mock headers + redirect)
- [ ] **Step 2: Implement middleware + requireUser change**
- [ ] **Step 3: Verify tests + typecheck**
- [ ] **Step 4: Commit**

```bash
git commit -m "fix: preserve return path through requireUser redirects"
```

---

### Task 3: Public chrome — Sign in link, padding, skip link

**Files:**
- Create: `src/components/PublicSignInLink.tsx`
- Modify: `src/app/(public)/layout.tsx`

**Interfaces:**
- Consumes: `signInHref` from `@/lib/url`, `usePathname` + `useSearchParams`
- Produces: client `<Link>` to `/signin?callbackUrl=<current>`

- [ ] **Step 1: Add `PublicSignInLink`**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signInHref } from "@/lib/url";

export function PublicSignInLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const qs = search.toString();
  const href = signInHref(qs ? `${pathname}?${qs}` : pathname);
  return (
    <Link href={href} className={className}>
      Sign in
    </Link>
  );
}
```

- [ ] **Step 2: Wire into public layout; fix padding; add skip link**

Replace bare Sign in `Link` with `<PublicSignInLink />` wrapped in `Suspense`.
Change main className to: `... ${user ? "pb-24 md:pb-6" : "pb-6"}`
Add skip-to-content link matching `(app)/layout.tsx`.

- [ ] **Step 3: Typecheck**
- [ ] **Step 4: Commit**

```bash
git commit -m "fix: public header Sign in returns to current page"
```

---

### Task 4: Empty-state Post + Save Search + Move-out CTAs

**Files:**
- Modify: `src/app/(public)/browse/page.tsx`
- Modify: `src/app/(public)/browse/SaveSearchButton.tsx`
- Modify: `src/components/MoveoutBanner.tsx`

- [ ] **Step 1: Browse empty state**

In `Results`, when `!user` and no filters, Post CTA becomes:

```tsx
<ButtonLink href={signInHref(tab === "wanted" ? "/sell?type=WANTED" : "/sell")}>
  {tab === "wanted" ? "Sign in to post a want ad" : "Sign in to post the first item"}
</ButtonLink>
```

When `user`, keep existing `/sell` links.

- [ ] **Step 2: SaveSearchButton copy**

When `signInHref` is set, label = `Sign in to save this search`.

- [ ] **Step 3: MoveoutBanner**

Add optional `signInHref?: string` prop. When set, CTA uses that href instead of `/sell/moveout`. Browse page passes `signInHref` for anonymous visitors targeting `/sell/moveout`.

- [ ] **Step 4: Run full test suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git commit -m "fix: gate anonymous post/save/move-out CTAs through sign-in"
```

---

### Task 5: Cycle 1 verification + docs note

- [ ] **Step 1: Manual smoke checklist**
  - Anon `/browse` → Sign in keeps query string after demo login
  - Anon empty market → "Sign in to post…" → returns to `/sell`
  - Anon `/sell` direct → redirects to `/signin?callbackUrl=/sell`
  - Anon listing Message → returns to listing
  - Signed-in browse/listing unchanged

- [ ] **Step 2: Append a short "Cycle 1 polish" note to README version section**
- [ ] **Step 3: Commit docs if changed**

---

## Later cycles (loop backlog)

**Cycle 2:** ListingMenu anon Report-user row; `robots: noindex` for non-ACTIVE metadata; remove dead `done` non-owner branch; isolate browse decoration failures.

**Cycle 3:** Focused route/smoke tests for anon visibility + CTA hrefs; profile favorite `signInHref`; landing Sign in callback.

**Cycle 4:** Server-validated callback for future UC registration; post-auth action resume (auto-open message).
