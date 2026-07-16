# Minimal Design Pass — Design Spec

**Date:** 2026-07-16 · **Target:** landing, marketplace, dashboard

## Goal

Make the product read cleaner and more minimalistic without changing what any
page does. The design system already declares its intent — one accent (UC red),
warm neutrals, 1px hairline borders, no card shadows (`src/app/globals.css`
`@theme`). Most of the visual noise comes from surfaces that drift from that
declaration. This pass enforces it, extracts the missing shared primitives, and
rebuilds the landing page in a pristine, minimal, centered style.

Information architecture does not change: no page loses a section, a control, or
a data point. Every change removes, merges, or harmonizes chrome.

## Direction: "one system, quieter"

Three rules drive every change:

1. **Accent means one thing.** UC red is for buttons, active states, and status
   badges only — never for data visualization. Signals in data use typographic
   weight (bold ink), not color.
2. **One primitive per concept.** A stat tile is one component. A meter is one
   component. No per-page re-implementations.
3. **Borders are earned.** Only true cards get a border; secondary sections are
   borderless blocks under a small eyebrow label and a hairline divider.

## Workstream 1 — Shared foundation

New primitives in `src/components/ui/`, replacing inline per-page versions:

- **`StatTile`** — props `{ label, value, delta?, hint?, icon? }`. One style:
  `rounded-xl border border-line bg-surface p-5`; value
  `text-3xl font-semibold tabular-nums`. This unifies funnel's `text-3xl` and
  impact's `text-4xl` onto a single scale. A `delta` renders faint with a small
  chevron icon — never red.
- **`Meter`** — props `{ value, max, tone? }`. One thickness (`h-1.5`), one
  track (`bg-line`), one fill (`bg-ink`). Replaces the five hand-rolled bar
  idioms (`h-1.5`/`h-2`/`h-3` × `bg-paper`/`bg-line` tracks ×
  `bg-ink`/`bg-accent`/`bg-success`/`bg-faint` fills). `tone="positive"`
  (success green) is the single documented exception, used only on `/impact`
  as that surface's sustainability identity.

Also:

- **`Button` gains `shape?: "rounded" | "pill"`** (default `rounded`, existing
  `rounded-lg`). `pill` is `rounded-full`, used by the landing CTAs.
- **Glyphs become icons.** The `▲ ▼ ■ ✕ ↕` characters used as affordances are
  replaced with icons from `src/components/icons`, adding any missing small
  chevron / close icon there.

## Workstream 2 — Dashboard

Primary surface `src/app/(app)/funnel/`, harmonized with `/impact` and
`/leaderboard`. Sections, data, and controls are unchanged.

- Adopt `StatTile` for KPI tiles and `Meter` for every bar: `RankedList` inline
  bars, the completion-by-category meters, and `FunnelBars`.
- **Pull accent out of data.** Funnel bars, KPI deltas, attention dots, zero-
  result text, demand-index and wanted-count highlights all stop using red.
  Emphasis moves to bold ink. Red remains only on buttons, the active segmented
  control, and `StatusBadge`.
- **De-box.** Keep borders on the KPI tiles and the two tables. Demote the
  secondary sections (needs-attention, search insights, marketplace health,
  recent activity, drilldown) to borderless blocks introduced by an uppercase
  eyebrow label plus a hairline divider. Increase vertical rhythm between
  sections so the page breathes.
- `/impact` and `/leaderboard` adopt `StatTile`/`Meter` so all three stat
  surfaces read as one system.

## Workstream 3 — Marketplace

- **Browse** (`src/app/(public)/browse/`): unify the three rounded-full chip
  treatments (category shortcuts, active-filter chips, lost & found toggles)
  into one pill style. Keep the radius families deliberate and consistent:
  `rounded-lg` for inputs/buttons, `rounded-full` for pills/badges,
  `rounded-xl` for cards. Tighten the vertical rhythm above the results so
  listings appear sooner.
- **Listing card** (`src/components/ListingCard.tsx`): the bottom metadata row
  currently crowds three data points across two truncating spans. Reduce it to
  one calm line — `category · timeAgo` — and drop the competing seller span
  (the seller is shown on the detail page).
- **Listing detail** (`src/app/(public)/listing/[id]/page.tsx`): trim the badge
  row from up to five pills to the essentials (type + status); category and
  course move into the light meta line instead of pills. Demote the meetup-spots
  card to a borderless section under a divider so only the seller card keeps a
  border. Reduce repeated `label:` prefixes.

## Workstream 4 — Landing page

`src/app/page.tsx` is rebuilt in a pristine, centered, minimal style — the
structure and airiness of a modern AI-startup landing, expressed in this
product's own brand and one accent.

- **Remove `HeroMapBackdrop`** from the landing. The component stays in the
  repo, unused. This also removes MapLibre (~1MB) from the landing bundle.
- Page is near-white with a faint CSS radial-dot texture behind the hero; no
  images, no gradients. Sections separate by generous whitespace (`py-24`+),
  subtle `paper`/`surface` tint shifts, and hairline dividers.
- **Nav:** logo left; "How it works" and "Browse"; then a bordered white pill
  ("Sign in") and a solid UC-red pill ("Sign in with UC email").
- **Hero:** fully centered. Headline `text-5xl sm:text-7xl`, `tracking-tight`,
  `leading-[1.05]`, in Inter (no new typeface) — "Everything students need,
  second time around." with "second time around" in UC red. Muted centered
  subhead beneath.
- **Search card:** a large `rounded-2xl border border-line bg-surface` card
  holding an input (placeholder "Search textbooks, bikes, dorm stuff…") and a
  small dark circular submit button. It is a plain
  `<form action="/browse" method="get">` with `name="q"` — no client JS, since
  `/browse` already reads `?q=`.
- **Proof row:** real `getImpactStats()` figures only (items kept in
  circulation, value traded). No avatars and no invented user or install
  counts — the pilot numbers are seeded, and the landing must not imply
  traction the product does not have.
- **Live listings strip:** the existing real recent listings, restyled airier
  under a `LIVE FROM CAMPUS` eyebrow.
- **Features:** a borderless two-column grid — small monochrome ink icon, bold
  title, muted description. No cards, no borders. Content: Buy & sell,
  Donations, Lost & found, Wanted ads, Safe campus meetups, UC-verified only,
  No fees, Impact tracking.
- **How it works:** condensed `01`–`04` numbered steps separated by hairline
  dividers, linking to the full `/how-it-works`.
- **Impact:** the same real numbers, restyled borderless under an eyebrow
  instead of the current large bordered box.
- **Final CTA** and the existing minimal footer.

Signed-in users still redirect to `/browse`; the validated `signInHref`
callback behavior is unchanged.

## Error handling

- The landing search submits an empty query harmlessly (`/browse` treats a
  missing `q` as no filter).
- `getImpactStats()` or the recent-listings query returning empty must not break
  the landing: the proof row and listing strip hide when there is no data.
- `Meter` clamps to `0..max` and tolerates `max = 0` (renders an empty track).

## Testing

- Unit: `Meter` width math (including `max = 0` and out-of-range clamping) and
  `StatTile` delta formatting/sign. These are the only pure pieces; the rest is
  presentational.
- Existing tests, TypeScript typecheck, and the production build must pass.
- Manual verification in a browser at desktop and mobile widths: landing,
  `/browse`, a listing detail, `/funnel`, `/impact`, `/leaderboard` — each read
  against the three rules above, with before/after screenshots.
- Confirm no red remains in data-viz on `/funnel`, and that the landing no
  longer loads MapLibre.

## Acceptance Criteria

- No page loses a section, control, or data point.
- `StatTile` and `Meter` are the only stat-tile and bar implementations, used by
  funnel, impact, and leaderboard.
- UC red appears only on buttons, active states, and status badges — never in
  data visualization.
- The listing card shows one calm metadata line; the listing detail shows at
  most two badges and one bordered card.
- Browse uses a single pill treatment and a consistent radius scheme.
- The landing is centered and minimal, has a working no-JS search card into
  `/browse`, shows only real impact figures, and does not load MapLibre.
- Existing tests, typecheck, and the production build pass.
