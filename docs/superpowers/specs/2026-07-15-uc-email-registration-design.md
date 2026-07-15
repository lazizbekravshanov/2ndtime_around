# UC-Email Registration — Design Spec

**Date:** 2026-07-15 · **Target:** real @uc.edu magic-link sign-up

## Goal

Let real UC students register and sign in with their `@uc.edu` / `@mail.uc.edu`
email via a magic link, moving beyond the demo persona picker. This is the
explicit follow-up deferred by the public-marketplace-browsing pass: anonymous
visitors who hit a sign-in call to action can now become real users.

The NextAuth EmailProvider, UC-email gate, `/signin/sent` confirmation page,
`VerificationToken` model, and onboarding-for-new-users flow already exist. This
pass adds the missing sign-in UI, throttles the magic-link request, and makes
real sign-up self-enable when an email provider is configured. No schema change.

## Scope

In scope: the real-email sign-in UI on `/signin`, magic-link request rate
limiting, a self-guarding email-enabled check, a startup warning, and docs.

Out of scope: OAuth/SSO, a persisted "UC-verified" flag (the `isUcEmail` gate
stays live-enforced), custom email templates/branding, and changing the demo
login mechanism.

## Sign-in UX

Real UC email sign-up is the primary path; the demo personas become a secondary,
collapsed option.

- A pure helper `signinModes({ emailServer, nodeEnv, demoPassword })` returns
  `{ emailEnabled, demoEnabled }`:
  - `emailEnabled = Boolean(emailServer) || nodeEnv !== "production"` — real
    sign-up shows when SMTP is configured, or in any non-production environment
    (where magic links are console-logged and usable by developers).
  - `demoEnabled = Boolean(demoPassword)` — the persona picker shows only when
    demo login is enabled.
- `/signin` (server component) reads `process.env` once and passes the two flags
  to the client form.
- **Primary — magic-link form** (shown when `emailEnabled`): an email input plus
  "Email me a magic link". On submit it client-validates the UC domain (UX only;
  the server gate is authoritative), calls `signIn("email", { email,
  redirect: false })` from `next-auth/react`, and on success routes to
  `/signin/sent?email=<email>`. The validated `callbackUrl` (via the existing
  `safeCallbackUrl`) is passed through as the post-verification destination.
- **Secondary — demo personas** (shown when `demoEnabled`): the existing persona
  picker, collapsed behind an "Explore with a demo account" disclosure. Its
  behavior is unchanged (POST `/api/demo-login`, then route to the callback).
- If neither mode is enabled (production, no SMTP, no demo password): show a
  calm "Sign-ups are opening soon" state instead of a broken form.
- The page keeps its existing `<Suspense>` boundary (required by
  `useSearchParams`).

## Magic-link request throttling

An unthrottled magic-link endpoint is an inbox-bombing vector. Throttle it
server-side, keyed by the target email (fail closed).

- Add `limitMagicLink(email)` to `src/lib/rateLimit.ts`: two rules — 3 per email
  per 10 minutes and 10 per email per hour — fail mode **closed**.
- Enforce it inside the EmailProvider `sendVerificationRequest` hook in
  `src/lib/auth.ts` (which runs in the Node.js serverless runtime and receives
  the `identifier` email). On denial, throw before sending so NextAuth aborts and
  surfaces its error page; the email is never sent.
- Email-keyed (not IP-keyed) is deliberate: it protects a specific victim's inbox
  regardless of source IP, and avoids the Edge-runtime / body-consumption
  problems of doing this in middleware. The email is hashed via the existing
  `keyFingerprint` — no raw email in keys or logs.

## Self-guarding email + startup

- The `emailEnabled` rule above means the real form never appears in production
  unless `EMAIL_SERVER` is set, so a student is never shown a path whose links
  silently console-log into the void. Setting `EMAIL_SERVER` + `EMAIL_FROM` in
  the deployment turns real sign-up on with no code change.
- `src/instrumentation.ts` adds a non-fatal production warning when
  `EMAIL_SERVER` is unset ("real sign-ups disabled until EMAIL_SERVER is set"),
  consistent with the graceful pattern used for demo login and Upstash.

## Data flow

1. Student enters an `@uc.edu` email and submits.
2. `signIn("email")` posts to NextAuth, which creates a `VerificationToken`.
3. `sendVerificationRequest` throttles by email, then emails the magic link (or
   console-logs it in dev).
4. Student opens the link; the `signIn` callback re-checks `isUcEmail` and the
   PrismaAdapter creates/loads the `User` and `Session`.
5. `requireUser()` sends the new user (no `displayName`) to `/onboarding`, then
   to `/browse`.

## Error handling

- Non-UC email: client warns immediately; the server `signIn` gate is
  authoritative and rejects regardless.
- Throttled request: send aborted, NextAuth error surfaced on `/signin`.
- Invalid or expired token: NextAuth error page (`/signin`).
- SMTP unset in production: real form hidden (self-guarding); demo or the
  "opening soon" state shows instead.
- A `sendVerificationRequest` throttle or transport failure must not create a
  session — sign-in simply does not complete.

## Testing

- Unit: `signinModes` enable/disable matrix (SMTP set/unset × prod/dev ×
  demo set/unset); `limitMagicLink` allowed/denied thresholds and fail-closed
  behavior on limiter error (reusing the `__setLimiterForTests` seam).
- Reuse existing `isUcEmail` for domain validation.
- Manual dev verification: real form requests a link (console-logged), landing on
  `/signin/sent`; a brand-new email onboards then reaches `/browse`; repeated
  requests to one email trip the throttle; demo disclosure still works;
  callbackUrl is honored after verification.
- Existing tests, TypeScript typecheck, and the production build must pass.

## Acceptance Criteria

- `/signin` offers a real `@uc.edu` magic-link sign-up as the primary path.
- Demo personas remain available as a secondary option when `DEMO_PASSWORD` is
  set, and are hidden otherwise.
- The real form is shown only when it can actually deliver (SMTP configured, or
  non-production); production without SMTP shows demo or an "opening soon" state.
- Magic-link requests are rate-limited per email and fail closed; no raw email in
  keys or logs.
- A new magic-link user flows through onboarding to the marketplace, and the
  validated `callbackUrl` is honored.
- The UC-email restriction remains enforced server-side.
- Existing tests, typecheck, and the production build pass; `.env.example` and
  README document that `EMAIL_SERVER`/`EMAIL_FROM` enable real sign-up.
