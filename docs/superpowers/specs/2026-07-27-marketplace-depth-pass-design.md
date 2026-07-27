# Marketplace depth pass — design

**Date:** 2026-07-27
**Status:** approved, ready to implement

## Why

A frontend/UX audit of the running app (signed in as the demo student, walking
browse → listing → thread → my-items → sell) found the design system in good
shape but the *marketplace mechanics* thin in four places. Baseline health at
audit time: `tsc --noEmit` clean, 143/143 vitest tests passing.

The audit also cleared three things that look like bugs but aren't, recorded
here so they don't get "fixed" later:

- Message-thread ownership styling is correct — own messages are right-aligned
  on `bg-ink`; the demo thread happened to contain only the other party's messages.
- The messages-list unread state is correct — `font-semibold` plus an accent
  count badge; the demo account simply had no unread conversations.
- The dev-console hydration warning comes from a browser extension injecting
  `cz-shortcut-listen` onto `<body>`, not from application code.

## Findings addressed

| # | Finding | Workstream |
|---|---------|-----------|
| 1 | Listing detail is a dead end — no related items, no more-from-seller | A1 |
| 2 | "Back to browse" is a hardcoded `/browse`, discarding the user's search and filters | A2 |
| 3 | Sellers see view counts only — no demand signal to price against | D |
| 4 | `danger` button variant is `text-accent`, so on `/my-items` red means brand, data, *and* destructive | C |
| 5 | `/signin` shows two red primary buttons | C |
| 6 | Card titles truncate on nearly every item — title shares one line with price | B |
| 7 | Photoless listings render a large dead gray cell | B |

Out of scope (noted, not fixed): the seller link on listing detail has weak
affordance; `/signin` offers no route back to the marketplace.

## A. Marketplace depth

### A1 — Related items on listing detail

A new server component renders below the existing two-column layout, containing
up to two rails, each reusing `ListingCard`:

- **More from {seller}** — other listings by the same owner, `status: ACTIVE`,
  current listing excluded, newest first, take 4.
- **Similar items** — `status: ACTIVE`, same `category`, current listing
  excluded, *and the seller's own listings excluded* so the two rails never
  duplicate each other, newest first, take 4.

Rules:

- Same-category is the only relevance signal claimed. No invented scoring.
- A rail with zero results does not render. Rails are never padded with
  unrelated inventory to reach a target count.
- If neither rail has results, nothing renders — no empty-state box.
- Blocked users are filtered using the existing `blockedUserIds` helper, and
  favorite state is decorated using `favoritedListingIds`, matching `/browse`.
  Both are best-effort: a failure degrades to an undecorated rail rather than
  taking down the page.
- Wrapped in `<Suspense>` with card skeletons so related queries never delay
  the listing itself.

Query construction lives in `src/lib/related.ts` as pure `where`/`orderBy`
builders so it is unit-testable without a database, following the existing
`src/lib/search.ts` pattern.

### A2 — Preserve browse state on back-navigation

`/browse` already encodes its entire state in the query string, so that string
is what gets threaded forward.

- `ListingCard` gains an optional `backTo` prop. When set, the card's link
  becomes `/listing/{id}?from={encodeURIComponent(backTo)}`.
- `/browse` passes its own current URL (path + query) as `backTo`.
- The listing page reads `from` and renders **← Back to results** pointing at
  it. Absent or invalid `from` falls back to today's **← Back to browse** → `/browse`.

**Security:** `from` is attacker-controllable and is rendered into an `href`, so
it is validated before use. `src/lib/url.ts` already has `isSafeCallbackUrl`,
which rejects absolute URLs, protocol-relative `//host`, backslash tricks, and
control characters. A new `safeBrowseReturn(value)` wraps it and additionally
requires the path to start with `/browse`, so this parameter cannot be used to
bounce users to arbitrary in-app routes. Unit tested alongside the existing
`url.test.ts` cases.

The landing page's preview strip does not pass `backTo` — its cards should
return to `/browse`, not to `/`.

## B. Card quality

`ListingCard` is the most-repeated element in the app; both changes are local to it.

- **Title:** `line-clamp-2` with a reserved two-line min-height so card heights
  stay uniform whether the title wraps or not. The price moves out of the title's
  flex row and aligns to the first line via `items-start`, so it no longer
  competes for horizontal space. Titles that still overflow two lines ellipsize.
- **No-photo cell:** replaces the gray "No photo" text with a monochrome
  category icon plus the category name, centered on the paper background. Icon
  selection maps `category` → an existing icon from `src/components/icons.tsx`,
  with a neutral fallback for unmapped categories. `WANTED` listings keep their
  distinct "Looking for this" framing.

The category→icon map lives in `src/lib/categoryIcon.ts` so `CategoryShortcuts`
and the card can share it.

## C. Design-system correctness

The rule being restored: **UC Red marks the one primary action; it is not a
status color and not a destructive color.**

Destructive actions split into *trigger* and *confirm*:

- A control that merely **opens** a confirmation becomes `variant="secondary"` —
  neutral ink, no red.
- The control **inside** the confirmation that performs the irreversible action
  stays solid red. That is where the warning belongs, because that is the click
  that cannot be undone.

This touches 7 `variant="danger"` usages across 5 files
(`my-items/ItemRowActions.tsx`, `listing/[id]/ListingMenu.tsx`,
`listing/[id]/OwnerActions.tsx`, `profile/[id]/ProfileMenu.tsx`,
`moderation/ResolveActions.tsx`). Each is classified as trigger or confirm and
reassigned. The `danger` variant itself is retained for confirm buttons that
want a red *outline* treatment; triggers stop using it.

Net effect: red is *removed* from several surfaces rather than added.

On `/signin`, "Sign in as demo user" drops to `variant="secondary"`, leaving
"Email me a magic link" as the only primary on the page.

## D. Seller demand signals

`/my-items` rows currently show view count only. They gain saved-count and
inquiry-count from `_count: { favorites: true, conversations: true }` — an extra
field on the query already being made, so no additional round trip.

Rendered on the existing calm meta line:

```
For sale · $80 · Jul 2 · 46 views · 3 saved · 2 asked
```

Zero values are omitted rather than shown as `0`, so a quiet listing reads as
quiet rather than as a failure.

## Testing

- `src/lib/url.test.ts` — extend with `safeBrowseReturn` cases: valid browse
  paths with query strings, non-browse in-app paths, absolute URLs,
  protocol-relative, backslash, control characters, and `/browsefoo` (prefix
  that must not pass as `/browse`).
- `src/lib/related.test.ts` — new: the two `where` builders exclude the current
  listing, restrict to `ACTIVE`, and the similar-items builder excludes the
  owner.
- `src/lib/categoryIcon.test.ts` — new: every value in `CATEGORIES` resolves to
  an icon, and unknown input hits the fallback.

Existing 143 tests must stay green, and `tsc --noEmit` must stay clean.

## Risks

- **A2 open redirect** — mitigated by `safeBrowseReturn`'s `/browse` prefix
  requirement plus the existing character rejection. Directly unit tested.
- **A1 query cost** — two extra indexed queries per listing view, isolated
  behind `Suspense` so they cannot delay first paint.
- **C over-reach** — reassigning 7 call sites risks neutralizing a confirm
  button by mistake. Each site is classified individually; the visual check
  after implementation confirms every destructive confirm is still red.
