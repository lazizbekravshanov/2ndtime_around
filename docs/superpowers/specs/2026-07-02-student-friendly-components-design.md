# v3.1 — Campus-native components

Approved 2026-07-02. Six additive components that make the app feel
student-native. No new dependencies, no map in chat, no fake urgency,
same one-accent design system. Both schema changes are additive nullable
columns (`prisma db push`, no data loss). Every new input is Zod-validated
server-side. New logic gets unit tests. Seed updated so the demo tells the
story.

## 1. Category shortcuts row (Browse)

Horizontally scrollable row of quiet chip-cards above the Marketplace grid:
Textbooks & Course Materials, Bikes & Transit, Music & Instruments,
Art & Design Supplies, Dorm & Apartment Essentials, Electronics — each with a
small line icon, linking to `/browse?category=…`. Rendered only on the
`market` tab when no category filter is active (it IS the category picker;
it disappears once one is chosen). Server component, zero client JS.

## 2. Move-out countdown banner

Extract the semester-boundary logic from `impact/page.tsx` into
`src/lib/semester.ts` (unit-tested); Impact imports it. Add semester END
dates and `daysUntilMoveOut(now)`. Within 30 days of semester end, Browse
and My Items render a slim dismissible banner — "Move-out in N days — list
everything at once →" — linking to `/sell/moveout`. Dismissal persists in
`localStorage` keyed by semester (`moveout-banner-fall-2026`), so it
reappears next semester. Client component (needs localStorage), tiny.

## 3. "Just sold on campus" strip (landing)

Under the live-listings preview: one muted line of social proof from real
data — "Sold this week: Mini fridge $40 · Calc textbook $25 · Futon $60".
Last ~4 SOLD listings (title + price), `unstable_cache` 60s like the rest
of the landing. Titles/prices were public while active; nothing private.
Hidden when there are no recent sales.

## 4. Course code on textbook listings

- Schema: `courseCode String?` on Listing.
- Validation: optional, normalized to uppercase, `^[A-Z]{2,6} ?\d{3,4}[A-Z]?$`,
  in the shared listing Zod schema.
- Sell wizard + Edit form: optional "Course code" Field shown only when
  category = "Textbooks & Course Materials" (placeholder "e.g. MATH 1061").
- Display: outline badge on listing detail and on cards (replaces nothing).
- Browse: free-text `q` search also matches courseCode; when the Textbooks
  category is selected, a debounced course-code filter input appears.
- Seed: existing textbook listings get realistic UC course codes.

## 5. Major + class year on profiles

- Schema: `major String?`, `gradYear Int?` on User.
- Onboarding: two optional fields (major ≤ 40 chars; grad year 2020–2035).
- Display: "DAAP · Class of '27" on profile page, the seller card on listing
  detail, and the chat conversation header.
- Seed: demo personas get values.

## 6. Meetup quick-picks (no map)

- `MEETUP_SPOTS` in constants gains `walk` ("~3 min from TUC") shown on the
  existing spot radio cards in the Thread meetup composer.
- Quick time chips above the datetime input — Today 12pm / 3pm / 5pm,
  Tomorrow 10am / 12pm — that prefill it (skip past times; pure client
  logic, unit-tested slot generator in `src/lib/calendar.ts` or sibling).

## Out of scope

MapLibre in chat, "N people viewing" urgency, new dependencies, auth or
data-model restructuring beyond the two nullable columns.

## Definition of done (per component)

Typecheck + tests + build green; behavior exercised in the running app;
one commit per component; Lighthouse re-checked at the end (no regression
on the landing after component 3).
