# Minimal Design Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Enforce the declared design system (one accent, hairline borders, no shadows) across dashboard + marketplace, extract the missing shared primitives, and rebuild the landing in a pristine centered minimal style.

**Spec (authoritative, enumerates every change):** `docs/superpowers/specs/2026-07-16-minimal-design-pass-design.md`

**Architecture:** Two new `src/components/ui/` primitives (`Meter`, `StatTile`) replace five hand-rolled bar idioms and two divergent tile styles; every surface adopts them. Accent red is removed from all data-viz (emphasis → bold ink). Landing is rebuilt without MapLibre around a no-JS search form into `/browse`.

## Global Constraints

- **No IA changes.** No page loses a section, control, or data point.
- **Accent rule:** UC red only on buttons, active states, `StatusBadge`. Never in data-viz.
- **Radius scheme:** `rounded-lg` inputs/buttons · `rounded-full` pills/badges · `rounded-xl` cards.
- **Tokens only** — no new colors. Existing `@theme` in `src/app/globals.css`.
- **Landing honesty:** real `getImpactStats()` figures only. No invented user/traction counts.
- Existing tests, typecheck, and production build stay green.

---

## Phase 1 — Foundation + dashboard + marketplace

- [ ] **Task 1 — `Meter` primitive.** Create `src/components/ui/Meter.tsx` + `Meter.test.ts`. Props `{ value, max, tone?: "neutral" | "positive" }`. One thickness `h-1.5`, track `bg-line`, fill `bg-ink` (`tone="positive"` → `bg-success`, impact only). Export a pure `meterPercent(value, max)` that clamps to 0..100 and returns 0 when `max <= 0`. TDD: test clamp, `max=0`, normal ratio. Commit.
- [ ] **Task 2 — `StatTile` primitive.** Create `src/components/ui/StatTile.tsx` + `StatTile.test.ts`. Props `{ label, value, delta?, hint?, icon? }`. Style `rounded-xl border border-line bg-surface p-5`, value `text-3xl font-semibold tabular-nums`, label faint. Export pure `formatDelta(n)` → `{ text, direction }` (never a color). Delta renders faint + chevron icon. TDD the formatter. Commit.
- [ ] **Task 3 — `Button` pill + icons.** Add `shape?: "rounded" | "pill"` to `src/components/ui/Button.tsx` (default `rounded`; `pill` → `rounded-full`), threading through `buttonClasses`. Add any missing small chevron/close icons to `src/components/icons`. Typecheck. Commit.
- [ ] **Task 4 — Funnel dashboard.** In `src/app/(app)/funnel/`: replace local `KpiCard`/`Stat` with `StatTile`; replace `RankedList` bars, completion meters, and `FunnelBars` fills with `Meter`; remove accent from attention dots, deltas, zero-result text, demand-index/wanted highlights (→ bold ink); replace `▲▼■ ✕ ↕` with icons; demote needs-attention, search insights, marketplace health, recent activity, drilldown to borderless blocks under an uppercase eyebrow + hairline divider (keep borders on KPI tiles + the two tables); increase section rhythm. Typecheck. Commit.
- [ ] **Task 5 — Impact.** `src/app/(app)/impact/`: adopt `StatTile` (drops `text-4xl` → `text-3xl`) and `Meter` with `tone="positive"` for the reuse-by-category bars. Typecheck. Commit.
- [ ] **Task 6 — Leaderboard.** `src/app/(public)/leaderboard/`: adopt `StatTile` for its summary numbers and `Meter` if it renders any bars. Typecheck. Commit.
- [ ] **Task 7 — Browse.** `src/app/(public)/browse/`: unify the three rounded-full chip styles (`CategoryShortcuts`, `ActiveFilters` chips, lost&found toggles in `BrowseFilters`) into one pill treatment; enforce the radius scheme; tighten vertical rhythm above results. Typecheck. Commit.
- [ ] **Task 8 — Listing card.** `src/components/ListingCard.tsx`: reduce the bottom row to one calm line `category · timeAgo`; drop the seller span. Typecheck. Commit.
- [ ] **Task 9 — Listing detail.** `src/app/(public)/listing/[id]/page.tsx`: badge row → type + status only (category/course move into the meta line); meetup-spots card → borderless section under a divider (seller stays the one card); reduce `label:` repetition. Typecheck. Commit.
- [ ] **Task 10 — Phase 1 verification.** `rm -rf .next && npm run typecheck && npm test && npm run build`. Then `npm run dev` + headless-Chrome screenshots of `/funnel`, `/impact`, `/leaderboard`, `/browse`, a listing detail at 1440px and 390px. Review each against the three rules; confirm **no red in data-viz**. Fix and commit.

## Phase 2 — Landing

- [ ] **Task 11 — Landing rebuild.** Rewrite `src/app/page.tsx` per spec §Workstream 4: remove `HeroMapBackdrop`; near-white page + faint CSS radial-dot texture; centered hero (`text-5xl sm:text-7xl tracking-tight leading-[1.05]`, "second time around" in accent); no-JS search card (`<form action="/browse" method="get">`, `name="q"`, rounded-2xl, dark circular submit); real-stats proof row; airier live-listings strip under a `LIVE FROM CAMPUS` eyebrow; borderless 2-col feature grid with monochrome ink icons; condensed 01–04 steps with dividers; borderless impact section; final CTA; existing footer. Keep the signed-in → `/browse` redirect and `signInHref`. Typecheck. Commit.
- [ ] **Task 12 — Phase 2 verification.** Build + screenshots of the landing at 1440px and 390px; self-critique against the spec; confirm the search form reaches `/browse?q=…` with JS disabled semantics (plain GET), confirm **MapLibre is no longer in the landing bundle**, and that only real figures appear. Fix and commit.

## Verification (both phases)

1. `rm -rf .next && npm run typecheck` → clean
2. `npm test` → all pass (existing + `Meter`/`StatTile` unit tests)
3. `npm run build` → succeeds; landing chunk no longer includes MapLibre
4. Headless-Chrome screenshots at 1440 + 390 for every touched surface; reviewed against: accent means one thing · one primitive per concept · borders are earned
