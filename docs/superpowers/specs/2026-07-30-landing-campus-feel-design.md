# Landing page — make it feel like campus

**Date:** 2026-07-30
**Status:** approved, ready to implement

## Why

The landing page reads as *a marketplace that happens to be at UC*. It should
read as *a UC thing that happens to be a marketplace*.

Apple's education pages were the reference. What they actually do is not
seasonal decoration — there are no falling leaves or "Back to School" banners.
They lead with the learner ("Designed for every kind of learner", "From grade
school to grad school"), name real institutions as proof, segment by who you
are, and show real settings. The lesson is specificity, not ornament.

We already own better raw material than stock imagery, and none of it reaches
the landing page: the meetup spots (TUC, Langsam, CRC, MarketPointe, Steger)
with real descriptions, course codes, campus buildings in listings, and a
semester clock in `semester.ts`.

## A. The semester clock

New pure helper `campusMoment(now)` in `src/lib/semester.ts`, alongside the
existing `currentSemester` and `daysUntilMoveOut`. Four phases:

| phase | when | hero eyebrow |
|-------|------|--------------|
| `moveout` | inside `MOVEOUT_WINDOW_DAYS` of move-out | "Move-out in 15 days" |
| `break` | past this semester's move-out date | "Between semesters" |
| `movein` | within 14 days of the semester start | "Move-in week at UC" |
| `term` | otherwise | "Fall 2026 at UC" |

Checked in that order. Each phase also supplies one lede line tuned to what
students actually need then — furnishing a room in August, clearing one in
December.

This is the piece Apple structurally cannot do: their page is identical in July
and October. Ours knows what week it is, and it is honest, because it is driven
by the same clock that already runs the move-out banner.

## B. Real campus places

Surface `MEETUP_SPOTS` on the landing page, not only inside listings. The
constants already carry the detail that sells it — "Langsam Library lobby, open
late, security desk" — and that specificity is what signals a student built
this rather than an agency.

Rendered as a quiet row under the safety framing, no new data and no new
component: these are existing constants.

## C. Segment by who you are

Apple splits K-12 / higher ed / college students. Ours splits by moment, and
every entry is a **working filter**, not decoration:

- *Moving in* → `/browse?category=Dorm%20%26%20Apartment%20Essentials`
- *Need your textbooks* → `/browse?category=Textbooks%20%26%20Course%20Materials`
- *Moving out* → `/sell/moveout`

The semester clock orders these: whichever matches the current phase leads.

## D. Visual treatment

**The 3D campus map stays out.** `HeroMap` and `HeroMapBackdrop` still exist
and still work, but commit 8319810 removed them deliberately — "the ~1MB
deferred chunk no longer ships at all". Reinstating it would silently reverse a
considered performance decision, and the landing page currently works with zero
client JS, which is a real strength on a page students open on campus wifi.

Campus feeling is carried by naming and typography instead: the semester
eyebrow, real building names, and course codes as texture. No new imagery, no
new dependency.

## What does not change

- The hero headline, the no-JS search form, and the sourced opportunity
  figures. The pitch-integrity work stands untouched.
- The dot-grid hero texture.
- `marketFacts.ts` and the STARS/wedge sections.

## Testing

`campusMoment` is pure and date-driven, so it is unit tested in
`semester.test.ts` with a fixed clock: one case per phase, plus the boundaries
that matter — the day move-out enters the window, the day after move-out, and
the last day of move-in week.

Existing 176 tests stay green; `tsc --noEmit` stays clean. The page is checked
at desktop and re-swept at 375px.

## Risks

- **Phase copy going stale or wrong.** A wrong eyebrow ("Move-in week" in
  December) would be worse than none. Mitigated by testing the boundaries
  rather than only the middles.
- **Segment links rotting** if a category is renamed. They are built from the
  `CATEGORIES` constants rather than hardcoded strings, so a rename breaks the
  build instead of the link.
- **Adding sections to a page that was deliberately made minimal.** Each
  addition has to earn its place; the segments replace nothing but must not
  push the opportunity figures below a second screen on mobile.
