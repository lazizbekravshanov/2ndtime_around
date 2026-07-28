# Browse & My items — clarity and information design

**Date:** 2026-07-28
**Status:** approved, ready to implement

## Why

Browse and My items read as functional but unfinished: weak hierarchy, controls
that outweigh content, and cards that withhold information the database already
holds. The direction chosen is **richer, not simpler** — more signal on cards
and more filtering power, with enough design craft that the added density still
scans.

Baseline: `tsc --noEmit` clean, 157 tests passing, `main` at 7279ee2.

### Two regressions introduced on 2026-07-27, fixed here

- **Category shown twice** on photoless browse cards — once in the new glyph
  cell, once in the meta line beneath the title.
- **My items thumbnails have no fallback.** Browse cards gained a category glyph
  for photoless listings; the My items row did not, so it renders an empty grey
  box. The two surfaces disagree.

### Already built — deliberately out of scope

The **course-code filter** is implemented and correct: it appears once the
Textbooks category is chosen (`BrowseFilters.tsx`), writes `?course=`, and has
an active-filter chip. No work needed.

## A. Cards carry their weight

`ListingCard` today shows photo, badges, title, price, category/course, and age.
It omits **condition**, which is the single most decision-relevant attribute of
a used item and is present on every SELL/DONATE listing.

**Added:**

- **Condition** in the meta line, for SELL and DONATE only (LOST/FOUND/WANTED
  have no meaningful condition).
- **Interest count** — `♥ N saved`, rendered only when N > 0. Honest social
  proof; a zero never renders, so a quiet listing doesn't advertise it.

**Meta line rules** (this is where the duplicate-category bug is fixed):

- With a photo: `Condition · Course-or-Category · Age`
- Without a photo: `Condition · Age` — the glyph cell already names the
  category, so repeating it is noise.

`ListingCardData` gains `condition: string | null` and `savedCount?: number`.
`savedCount` is optional so the landing page and related rails can omit it.

**Query:** browse adds `_count: { select: { favorites: true } }` to the existing
`findMany` include — one extra field on a query already being made, no
additional round trip. The related-items rails and landing strip do not opt in;
they stay lean.

## B. Filters that earn their space

**New capability:**

- **Sort → "Most saved"** — `orderBy: { favorites: { _count: "desc" } }`,
  tie-broken by `createdAt desc`. The sort currently knows only newest and
  price; popularity is a genuine third dimension and the data is already there.
- **"New this week"** — a toggle writing `?since=week`, filtering
  `createdAt >= now - 7d`. Most marketplace browsing is "what's new"; today that
  requires trusting the default sort. Gets an active-filter chip like every
  other filter.

**Visual restructure (no behaviour change):**

- The filter controls move into **one bordered panel** instead of three loose
  rows floating on paper. Same controls, one object.
- **Price inputs shrink** from a full-width band to inline fields — they are the
  least-used filter and currently outweigh search.
- The result line becomes a **real count** (`22 items`, `22+ items` when a next
  page exists) replacing `Items 1–22`, which reads as a bug.
- **Tab counts** — `Marketplace 22 · Donations 8 · Lost & Found 11 · Wanted 1`.
  Counts are of ACTIVE listings per type, **unfiltered by the current search**,
  so they describe the sections rather than shifting as you type. Computed in
  one grouped query, cached 60s via `unstable_cache` following the landing
  page's precedent.

## C. My items gets hierarchy

- **Drop the "Active" badge on the Active tab.** Every row on a tab that filters
  for Active says "Active" — zero information. The badge stays on Sold/Resolved
  and Drafts, where it distinguishes.
- **Button hierarchy.** Today Edit / Sold / Delete are three identical buttons.
  Marking an item sold is the purpose of the page; deleting is destructive and
  already behind a confirm. Sold/Given/Resolve/Publish become the emphasised
  action, Edit stays secondary, and Delete drops to `ghost`.
- **Tab counts** on Active / Sold / Drafts, from the same rows already fetched
  where possible, otherwise a grouped count.
- **Thumbnail fallback** — reuse `CategoryGlyph` so a photoless row matches
  browse instead of showing an empty box.

## Testing

- `src/lib/search.test.ts` — extend: `buildOrderBy("saved")` returns the
  favourites-count ordering; unknown sort still falls back to newest;
  `buildListingWhere` with `since=week` sets a `createdAt.gte` and omits it
  otherwise; `activeFilterChips` includes a chip for `since`.
- No new test file is needed for the card — it is presentational, and the
  meta-line rule is simple branching. The visual check after implementation
  covers it.

Existing 157 tests must stay green and `tsc --noEmit` must stay clean.

## Risks

- **Tab counts cost four aggregate queries per browse render.** Mitigated by a
  single grouped `groupBy` on `type` plus a 60s cache. If it measurably slows
  browse, the counts are the first thing to drop.
- **Card density.** Two new signals risk clutter. Condition is short
  ("Like new" is the longest), and the interest line only renders when non-zero,
  so the common case adds one word to an existing line.
- **`orderBy` on relation count** requires the Prisma version to support it.
  Verify against the installed client before relying on it; fall back to
  omitting the sort option rather than shipping a broken sort.
