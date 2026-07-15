# Production Boundary Hardening — Design Spec

**Date:** 2026-07-13 · **Target:** critical production boundaries

## Goal

Protect the highest-risk server boundaries against abuse and authorization
regressions before a public launch. This pass adds distributed rate limiting
and focused automated tests without changing product behavior or attempting a
full production-readiness overhaul.

## Scope

The first pass covers:

- demo persona login;
- authenticated uploads;
- listing creation, updates, and status changes;
- message sending and message polling;
- conversation SSE connection establishment.

It does not add global middleware, browser E2E coverage, lint/format tooling,
real UC registration, or exhaustive tests for every server action and route.

## Architecture

Add `src/lib/rateLimit.ts` as the single policy layer. It exposes named,
operation-specific policies backed by `@upstash/redis` and
`@upstash/ratelimit` in production and a deterministic in-memory adapter in
local development.

Rate limits are enforced explicitly inside each protected server action or
route. Checks run after authentication when user identity is needed, but before
database mutations, expensive queries, or blob storage operations.

Authenticated traffic is keyed by user ID. Demo login attempts are keyed by a
one-way hash of the best available client IP together with the normalized
requested email. Missing or invalid IP data maps to a conservative anonymous
key. Raw IP addresses and email addresses must not appear in logs or Redis
keys.

Production uses the Upstash-backed adapter when `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` are both set. If either is missing in production,
startup logs a single warning and the limiter falls back to the in-memory
adapter (per-instance limiting) rather than failing — so a deploy can never be
taken down by a missing Upstash variable, and setting the two variables later
upgrades to distributed limiting with no code change. Local development and
tests always use the in-memory adapter and never require network access.

(Revised 2026-07-15: the original spec hard-required the Upstash variables in
production and threw on startup when absent. That was relaxed to the graceful
fallback above to remove the deploy-time coupling.)

## Policies

Each protected operation has an independent policy so unrelated work does not
consume a shared quota:

- demo login: 10 attempts per IP per 10 minutes and 5 attempts per IP/email
  pair per 10 minutes;
- upload: 10 uploads per user per 10 minutes and 50 per user per day;
- listing creation: 5 attempts per user per 5 minutes, in addition to the
  existing database-backed limit of 10 listings per rolling day;
- listing update or status mutation: 30 attempts per user per 10 minutes;
- message send: 30 attempts per user per minute;
- message poll: 60 requests per user per minute;
- SSE: 10 connection attempts per user per minute, checked only when a
  connection opens.

These thresholds are centralized constants and can be tuned without editing
route or action logic.

## Result and Error Handling

The rate-limit service returns a normalized result containing whether the
request is allowed, remaining quota, and retry timing.

API routes respond to denied requests with HTTP `429`, a stable JSON or text
error appropriate to the existing endpoint, and a `Retry-After` header. Server
actions preserve their existing `ActionResult` contract and return
`{ ok: false, error }`.

Upstash failures use policy-specific behavior:

- demo login and uploads fail closed because credential and storage abuse are
  higher risk than temporary unavailability;
- authenticated marketplace and messaging operations fail open so a brief
  rate-limit outage does not disable core marketplace activity.

Operational logs may include the policy name, outcome, and non-reversible key
fingerprint. They must never include passwords, session tokens, raw emails, or
raw IP addresses.

## Data Flow

For authenticated operations:

1. Resolve the session user.
2. Reject unauthenticated callers using the endpoint's existing contract.
3. Evaluate the named policy using the user ID.
4. Return the normalized rate-limit error when denied.
5. Continue with validation, authorization, and database or storage work.

For demo login:

1. Confirm demo login is enabled.
2. Parse the request enough to derive a normalized, non-secret identifier.
3. Evaluate the strict login-attempt policy before password verification.
4. Preserve the existing UC-domain, persona allowlist, and timing-safe password
   checks.
5. Create the session only after all checks pass.

Authorization and ownership checks remain authoritative and separate from rate
limiting.

## Testing

Unit tests cover:

- stable, privacy-preserving key generation;
- named policy selection;
- allowed and denied responses;
- retry metadata;
- in-memory adapter behavior;
- fail-open and fail-closed Upstash failures.

Focused boundary tests cover demo login, uploads, listing mutations, messaging,
and SSE admission. Each applicable boundary exercises unauthenticated access,
authorization or ownership denial, invalid input, quota denial, dependency
failure, and successful execution.

Tests mock Upstash and external storage. CI must not require network access or
production credentials.

## Acceptance Criteria

- All critical boundaries use explicit named policies.
- Denied API requests return `429` and `Retry-After`.
- Server actions retain their current result shape.
- Sensitive identifiers are neither logged nor used raw in rate-limit keys.
- SSE reconnects are limited only at connection establishment.
- Existing tests continue to pass.
- New tests, TypeScript typecheck, and the production build pass.
- `.env.example` and project documentation describe the optional Upstash
  variables, the in-memory fallback behavior (local, tests, and production when
  the variables are absent), and deployment expectations.

