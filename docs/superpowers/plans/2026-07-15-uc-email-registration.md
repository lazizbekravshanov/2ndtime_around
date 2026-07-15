# UC-Email Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real `@uc.edu` magic-link sign-up to `/signin` (primary), keep the demo personas as a secondary option, throttle magic-link requests, and self-enable real sign-up when SMTP is configured.

**Architecture:** Mostly UI + wiring — the NextAuth EmailProvider, UC gate, `/signin/sent` page, `VerificationToken` model, and onboarding already exist. A server component reads env flags via a pure `signinModes` helper and passes them to a new client form; the magic-link send is throttled inside the existing `sendVerificationRequest` hook.

**Tech Stack:** Next.js 15 App Router, NextAuth v4 (EmailProvider + PrismaAdapter), `next-auth/react` `signIn`, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-uc-email-registration-design.md`.
- No Prisma schema changes. No persisted UC-verified flag — `isUcEmail` (`src/lib/constants.ts`) stays the live gate.
- Real form appears only when it can deliver: `EMAIL_SERVER` set OR `NODE_ENV !== "production"`.
- Demo personas appear only when `DEMO_PASSWORD` is set. Demo behavior unchanged (POST `/api/demo-login`).
- Magic-link throttle is email-keyed, fail **closed**; hash the email via `keyFingerprint` — never raw email in keys/logs.
- Preserve `callbackUrl` via the existing `safeCallbackUrl` (`src/lib/url.ts`).
- `/signin` keeps a `<Suspense>` boundary (required by `useSearchParams`).
- Existing tests, typecheck, and production build stay green.

---

## File structure

- Create `src/lib/signinModes.ts` + `src/lib/signinModes.test.ts` — pure enable/disable logic.
- Modify `src/lib/rateLimit.ts` (+ `rateLimit.test.ts`) — add `limitMagicLink`.
- Modify `src/lib/auth.ts` — throttle in `sendVerificationRequest`.
- Rewrite `src/app/signin/page.tsx` (server) + create `src/app/signin/SignInClient.tsx` (client).
- Modify `src/instrumentation.ts` — EMAIL_SERVER startup warning.
- Modify `.env.example`, `README.md`.

---

### Task 1: `signinModes` pure helper

**Files:**
- Create: `src/lib/signinModes.ts`
- Test: `src/lib/signinModes.test.ts`

**Interfaces:**
- Produces: `function signinModes(env: { emailServer?: string; nodeEnv?: string; demoPassword?: string }): { emailEnabled: boolean; demoEnabled: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/signinModes.test.ts
import { describe, expect, it } from "vitest";
import { signinModes } from "@/lib/signinModes";

describe("signinModes", () => {
  it("enables the real form when SMTP is configured (any env)", () => {
    expect(signinModes({ emailServer: "smtp://x", nodeEnv: "production" }).emailEnabled).toBe(true);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/signinModes.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/signinModes.ts
/**
 * Which sign-in paths to show on /signin, derived from server env.
 * - emailEnabled: real magic-link sign-up can actually deliver — SMTP is
 *   configured, or we're not in production (dev console-logs the link).
 * - demoEnabled: the demo persona picker is turned on.
 */
export function signinModes(env: {
  emailServer?: string;
  nodeEnv?: string;
  demoPassword?: string;
}): { emailEnabled: boolean; demoEnabled: boolean } {
  return {
    emailEnabled: Boolean(env.emailServer) || env.nodeEnv !== "production",
    demoEnabled: Boolean(env.demoPassword),
  };
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/signinModes.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/signinModes.ts src/lib/signinModes.test.ts
git commit -m "feat: signinModes helper (which sign-in paths to show)"
```

---

### Task 2: `limitMagicLink` policy

**Files:**
- Modify: `src/lib/rateLimit.ts`, `src/lib/rateLimit.test.ts`

**Interfaces:**
- Produces: `function limitMagicLink(email: string): Promise<RateDecision>` (email-keyed, fail closed).

- [ ] **Step 1: Write the failing test** (append to `rateLimit.test.ts`; add `limitMagicLink` to the existing import from `@/lib/rateLimit`)

```ts
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
    __setLimiterForTests({ check: async () => { throw new Error("down"); } });
    expect((await limitMagicLink("a@uc.edu")).allowed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/rateLimit.test.ts` → FAIL (`limitMagicLink` undefined).

- [ ] **Step 3: Implement.** In `src/lib/rateLimit.ts`, add two rules to the `RULES` object and the function:

```ts
// inside RULES:
  magicLinkShort: { limit: 3, windowMs: 10 * MIN },
  magicLinkHourly: { limit: 10, windowMs: 60 * MIN },
```

```ts
export function limitMagicLink(email: string): Promise<RateDecision> {
  const key = keyFingerprint(email.trim().toLowerCase());
  return enforce(
    [
      { key: `magicLink:short:${key}`, rule: RULES.magicLinkShort },
      { key: `magicLink:hourly:${key}`, rule: RULES.magicLinkHourly },
    ],
    "closed"
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/rateLimit.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts
git commit -m "feat: magic-link request rate-limit policy (email-keyed, fail closed)"
```

---

### Task 3: Throttle `sendVerificationRequest`

**Files:**
- Modify: `src/lib/auth.ts`

**Interfaces:**
- Consumes: `limitMagicLink`.

- [ ] **Step 1: Add the import + check.** Add `import { limitMagicLink } from "@/lib/rateLimit";` and insert at the very top of `sendVerificationRequest`, before the SMTP/console branch:

```ts
      async sendVerificationRequest({ identifier, url, provider }) {
        // Throttle magic-link requests per target email (fail closed) so the
        // endpoint can't be used to bomb a UC inbox. Throwing aborts the send.
        const rl = await limitMagicLink(identifier);
        if (!rl.allowed) {
          throw new Error("Too many sign-in link requests. Try again later.");
        }
        // Without an SMTP server configured (local dev), print the magic
        // link to the server console instead of sending real email.
        if (!process.env.EMAIL_SERVER) {
```

- [ ] **Step 2: Verify** — `npm run typecheck` → clean. (Runtime throttle verified in Task 7 dev smoke.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: throttle magic-link sends per email in sendVerificationRequest"
```

---

### Task 4: Sign-in UI — real form primary, demo secondary

**Files:**
- Rewrite: `src/app/signin/page.tsx` (server)
- Create: `src/app/signin/SignInClient.tsx` (client)

**Interfaces:**
- `page.tsx` computes `signinModes` from env and renders `<SignInClient emailEnabled demoEnabled />` inside `<Suspense>`.
- `SignInClient` consumes `signIn` (`next-auth/react`), `safeCallbackUrl`, `isUcEmail`, `DEMO_ACCOUNTS`.

- [ ] **Step 1: Rewrite `page.tsx` as a server component**

```tsx
// src/app/signin/page.tsx
import { Suspense } from "react";
import { signinModes } from "@/lib/signinModes";
import { SignInClient } from "./SignInClient";

export default function SignInPage() {
  const { emailEnabled, demoEnabled } = signinModes({
    emailServer: process.env.EMAIL_SERVER,
    nodeEnv: process.env.NODE_ENV,
    demoPassword: process.env.DEMO_PASSWORD,
  });
  return (
    <Suspense>
      <SignInClient emailEnabled={emailEnabled} demoEnabled={demoEnabled} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Create `SignInClient.tsx`** — real magic-link form primary; demo personas in a disclosure; "opening soon" fallback. (Reuses the existing persona-picker markup + demo-login POST verbatim.)

```tsx
// src/app/signin/SignInClient.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { LogoMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { DEMO_ACCOUNTS, isUcEmail } from "@/lib/constants";
import { safeCallbackUrl } from "@/lib/url";

export function SignInClient({
  emailEnabled,
  demoEnabled,
}: {
  emailEnabled: boolean;
  demoEnabled: boolean;
}) {
  const router = useRouter();
  const callbackUrl = safeCallbackUrl(useSearchParams().get("callbackUrl"));

  // --- Real magic-link sign-up ---
  const [email, setEmail] = useState("");
  const [linkPending, setLinkPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim();
    if (!isUcEmail(normalized)) {
      setLinkError("Use your UC email (@uc.edu or @mail.uc.edu).");
      return;
    }
    setLinkPending(true);
    setLinkError(null);
    const res = await signIn("email", { email: normalized, callbackUrl, redirect: false });
    if (!res || res.error) {
      setLinkPending(false);
      setLinkError("Couldn't send the link. Try again in a moment.");
      return;
    }
    router.push(`/signin/sent?email=${encodeURIComponent(normalized)}`);
  }

  // --- Demo persona picker (secondary) ---
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoEmail, setDemoEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState("");
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoPending, setDemoPending] = useState(false);
  const personaRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onPersonaKey(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (index + 1) % DEMO_ACCOUNTS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (index - 1 + DEMO_ACCOUNTS.length) % DEMO_ACCOUNTS.length;
    else return;
    e.preventDefault();
    setDemoEmail(DEMO_ACCOUNTS[next].email);
    personaRefs.current[next]?.focus();
  }

  async function handleDemo(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setDemoError("Enter the demo password.");
      return;
    }
    setDemoPending(true);
    setDemoError(null);
    const res = await fetch("/api/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: demoEmail, password }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setDemoPending(false);
      setDemoError(json?.error ?? "Something went wrong. Try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="flex items-center gap-2.5">
        <LogoMark className="h-7 w-7" />
        <span className="text-xl font-semibold tracking-tight">2nd Time Around</span>
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Sign in</h1>
      <p className="mb-8 mt-1 max-w-sm text-center text-sm text-faint">
        UC students only — sign in with your university email.
      </p>

      {emailEnabled ? (
        <form onSubmit={handleMagicLink} noValidate className="w-full max-w-sm">
          <Field label="UC email" htmlFor="email" error={linkError ?? undefined}>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@mail.uc.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (linkError) setLinkError(null);
              }}
              aria-invalid={linkError ? true : undefined}
              className={inputClasses}
            />
          </Field>
          <Button type="submit" disabled={linkPending} className="mt-4 w-full">
            {linkPending ? "Sending link…" : "Email me a magic link"}
          </Button>
        </form>
      ) : !demoEnabled ? (
        <p className="max-w-sm rounded-xl border border-line bg-surface px-5 py-4 text-center text-sm text-faint">
          Sign-ups are opening soon. Check back shortly.
        </p>
      ) : null}

      {demoEnabled && (
        <div className="mt-8 w-full max-w-sm border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setDemoOpen((v) => !v)}
            aria-expanded={demoOpen}
            className="mx-auto block text-sm font-medium text-faint transition-colors hover:text-ink"
          >
            {demoOpen ? "Hide demo accounts" : "Explore with a demo account"}
          </button>

          {demoOpen && (
            <form onSubmit={handleDemo} noValidate className="mt-5">
              <div role="radiogroup" aria-label="Demo account" className="space-y-3">
                {DEMO_ACCOUNTS.map((account, i) => {
                  const selected = demoEmail === account.email;
                  return (
                    <button
                      key={account.email}
                      ref={(el) => {
                        personaRefs.current[i] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onKeyDown={(e) => onPersonaKey(e, i)}
                      onClick={() => setDemoEmail(account.email)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                        selected ? "border-accent bg-surface" : "border-line bg-surface hover:border-faint"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase ${
                          selected ? "bg-accent text-white" : "border border-line bg-paper"
                        }`}
                      >
                        {account.name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{account.name}</span>
                        <span className="block text-xs text-faint">{account.role}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5">
                <Field label="Demo password" htmlFor="password" error={demoError ?? undefined}>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (demoError) setDemoError(null);
                    }}
                    aria-invalid={demoError ? true : undefined}
                    className={inputClasses}
                  />
                </Field>
              </div>
              <Button type="submit" disabled={demoPending} className="mt-4 w-full">
                {demoPending ? "Signing in…" : "Sign in as demo user"}
              </Button>
            </form>
          )}
        </div>
      )}

      <p className="mt-8 max-w-sm text-center text-xs text-faint">
        UC students only. Only UC email addresses (@uc.edu or @mail.uc.edu) are permitted.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Verify** — `npm run typecheck` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/signin/page.tsx src/app/signin/SignInClient.tsx
git commit -m "feat: real UC magic-link sign-in (primary) + demo personas (secondary)"
```

---

### Task 5: Startup warning for EMAIL_SERVER

**Files:**
- Modify: `src/instrumentation.ts`

- [ ] **Step 1: Add the warning** — inside the `NODE_ENV === "production"` block, after the DEMO_PASSWORD warn:

```ts
  if (!process.env.EMAIL_SERVER) {
    // Not fatal — real sign-ups simply stay off (the /signin form hides
    // itself); demo login remains available if configured.
    console.warn(
      "[startup] EMAIL_SERVER not set — real magic-link sign-up is disabled. " +
        "Set EMAIL_SERVER and EMAIL_FROM to enable it."
    );
  }
```

- [ ] **Step 2: Verify** — `npm run typecheck` → clean.

- [ ] **Step 3: Commit**

```bash
git add src/instrumentation.ts
git commit -m "feat: warn at startup when EMAIL_SERVER is unset (real sign-up disabled)"
```

---

### Task 6: Docs

**Files:**
- Modify: `.env.example`, `README.md`

- [ ] **Step 1: `.env.example`** — replace the existing Email comment block so it states these enable real sign-up:

```bash
# Email — enables REAL @uc.edu magic-link sign-up. When unset, the real sign-in
# form is hidden in production (only demo login shows); in dev, magic links are
# printed to the server console so you can still sign in.
# EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
# EMAIL_FROM="2nd Time Around <no-reply@example.com>"
```

- [ ] **Step 2: `README.md`** — add a short note under the auth/decisions area: real UC students sign in with an `@uc.edu` magic link; the form self-enables when `EMAIL_SERVER`/`EMAIL_FROM` are set (hidden in prod otherwise); demo personas remain a secondary option gated by `DEMO_PASSWORD`; magic-link requests are rate-limited per email.

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document EMAIL_SERVER-gated real UC sign-up"
```

---

### Task 7: Full verification

- [ ] **Step 1: Clean typecheck** — `rm -rf .next && npm run typecheck` → clean.
- [ ] **Step 2: Full tests** — `npm test` → all pass (existing + signinModes + limitMagicLink).
- [ ] **Step 3: Build** — `npm run build` → succeeds.
- [ ] **Step 4: Dev smoke** (`npm run dev`, no EMAIL_SERVER so dev console-logs; ensure a `DEMO_PASSWORD` is set locally):
  - `/signin` shows the real email form (dev ⇒ emailEnabled) and an "Explore with a demo account" disclosure.
  - Submit a non-UC email → inline "Use your UC email" error, no request sent.
  - Submit `you@mail.uc.edu` → lands on `/signin/sent?email=…`; the magic link is printed in the dev console. Open it → onboarding (new user) → `/browse`. Confirm `callbackUrl` is honored when arriving via `/signin?callbackUrl=/listing/…`.
  - Rapidly submit the same UC email >3 times in 10 min → 4th send is throttled (no new console link; NextAuth surfaces an error).
  - Toggle the demo disclosure → persona login still works.
- [ ] **Step 5: Commit any fixes.** Branch ready for review/merge. Deploy note: set `EMAIL_SERVER` + `EMAIL_FROM` in Vercel to turn real sign-up on in production.

---

## Self-review notes

- **Spec coverage:** real form primary + demo secondary + opening-soon (T4); `signinModes` self-guard (T1/T4); magic-link throttle email-keyed fail-closed (T2/T3); startup warning (T5); docs (T6); tests/build (T1,T2,T7). No schema change; `isUcEmail` stays the live gate.
- **Type consistency:** `signinModes` returns `{ emailEnabled, demoEnabled }`, consumed with those exact names in `page.tsx`/`SignInClient`. `limitMagicLink(email)` returns `RateDecision`, matching the existing per-boundary signatures.
- **Reuse:** `safeCallbackUrl` (url.ts), `isUcEmail`/`DEMO_ACCOUNTS` (constants), `keyFingerprint`/`enforce`/`__setLimiterForTests` (rateLimit), existing persona-picker markup and `/signin/sent` page — all reused, not reinvented.
