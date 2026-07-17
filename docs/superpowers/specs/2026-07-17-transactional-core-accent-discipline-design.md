# Accent-discipline pass on the transactional core

Approved 2026-07-17. Extend the 2026-07-16 minimal design pass to the five
signed-in surfaces a student uses to transact — the sell wizard, messages
list, message thread, my-items, saved, and notifications — which the original
pass never touched.

## Context

The minimal design pass (2026-07-16) established three UI rules but only
applied them to the public/discovery surfaces (landing, browse, listing
detail) and the two analytics pages (funnel, impact). See
`docs/superpowers/specs/2026-07-16-minimal-design-pass-design.md`.

The three rules:

1. **Accent means one thing** — UC Red (`--color-accent`) is ONLY for buttons,
   active/selected states, and StatusBadge. Never for data-viz or decoration.
   Signals in data use bold ink, not color.
2. **One primitive per concept** — `Meter` is the only bar, `StatTile` the only
   stat tile, `chipClasses()` the only pill.
3. **Borders are earned** — only true cards/rows/tables get a frame; secondary
   sections are borderless under an uppercase eyebrow + hairline rule.

An audit of the five in-scope surfaces found they were **built on-system** and
already ~90% compliant: page titles use `text-2xl font-semibold tracking-tight`,
eyebrows use the `text-xs font-medium uppercase tracking-wide text-faint` idiom,
empty states use the shared `EmptyState`, and every bordered box is a genuine
card or list row (Rule 3 earns those). The genuine gap is a small cluster of
**accent leaking into data and decoration** (Rule 1), plus one typography
outlier. This spec fixes exactly those and nothing more — no gratuitous
restyling of already-compliant markup.

## In scope

Five surfaces (transactional core):

- Sell wizard — `src/app/(app)/sell/SellWizard.tsx`, `.../sell/moveout/page.tsx`
- Messages list — `src/app/(app)/messages/page.tsx`
- Message thread — `src/app/(app)/messages/[conversationId]/Thread.tsx`
- My items — `src/app/(app)/my-items/`
- Saved — `src/app/(app)/saved/`
- Notifications — `src/app/(app)/notifications/`

## Changes

### 1. Sell wizard — progress bar off accent

`SellWizard.tsx` line 87: the `ProgressBar` fills completed step segments with
`bg-accent`. This is accent on data. Change the filled state `bg-accent` →
`bg-ink`; the incomplete state stays `bg-line`. Keep the labeled-stepper
structure as-is — it is a distinct concept from `Meter` (segmented + per-step
labels), so this is a recolor, not a primitive swap.

### 2. Message thread — decorative pin icons off accent

`Thread.tsx` lines 87 and 595: meetup `PinIcon` rendered in `text-accent` as
decoration. Change `text-accent` → `text-faint` at both sites.

### 3. Message thread — inline pill adopts the shared primitive

`Thread.tsx` line 616: the meetup quick-time-slot buttons hand-roll a
`rounded-full border px-3 py-1.5 text-xs font-medium` pill whose selected state
(`border-ink bg-ink text-white`) is already identical to `chipClasses("active")`
and whose default nearly matches `chipClasses("default")`. Replace the inline
className with `chipClasses(meetupTimeValue === slot.value ? "active" : "default")`
from `src/components/ui/Chip.tsx`. The one intentional visual delta: the pill
normalizes from `text-xs`/`py-1.5` to the shared `h-8 text-sm` — this IS the
"one pill treatment" the primitive exists to enforce. Keep the `aria-pressed`
and `onClick` behavior unchanged.

### 4. Notifications — unread dot to ink

`NotificationRow.tsx` line 66: the unread indicator dot uses `bg-accent`. Change
`bg-accent` → `bg-ink`. (Decision: the ambient unread dot is data, so it goes to
bold ink; the unread *count* badge in the messages list stays accent — see
Explicitly unchanged.)

### 5. Move-out heading — typography consistency

`src/app/(app)/sell/moveout/page.tsx` line 17: the `<h1>` uses `text-2xl
font-semibold` but omits `tracking-tight`, the tracking every other page title
in the app uses. Add `tracking-tight`.

## Explicitly unchanged (do NOT "fix" these)

These look like candidates but are correct under the rules. Documented so a
future reviewer doesn't undo them:

- **Messages unread-count badge** (`messages/page.tsx:124`, `bg-accent
  text-white`) — reads as a StatusBadge (count-as-status). Stays accent.
- **Thread safety `AlertIcon`** (`Thread.tsx:515`, `text-accent`) — precedent:
  the shared `Toast` renders its warning `AlertIcon` in `text-accent`. Stays.
- **Selected-state accents** — the sell-wizard selected option card
  (`SellWizard.tsx:195`, `border-accent bg-accent/5`) and the thread toggle
  (`Thread.tsx:664`, `border-accent text-accent`) are active/selected states,
  which Rule 1 permits. Stay.
- **Active-tab underlines** — my-items (`page.tsx:88`) and saved
  (`page.tsx:84`) use `bg-accent` for the active-segment underline. Active
  state. Stays.
- **Accent error text** — every `role="alert"` message in `text-accent` (sell
  wizard, move-out form, thread) is the shared `Field.tsx:54` convention, used
  across all polished surfaces. Stays.
- **Bordered rows/cards** — all `border border-line bg-surface` boxes on these
  surfaces are true cards or list rows. Rule 3 earns them. Stay.

## Out of scope

- Any restyling of already-compliant markup (typography beyond change 5,
  spacing, eyebrows — all already on-system).
- Adopting `shape="pill"` on CTAs. Pill is opt-in and reserved for the landing
  hero; browse and listing detail (already polished) do NOT use it. Adopting it
  here would make the core inconsistent with the rest of the app. A system-wide
  pill initiative (promoting pill app-wide and back-porting to browse + listing)
  is a separate effort, deliberately not taken here.
- Profile, onboarding, move-out batch view, leaderboard, how-it-works,
  moderation — untouched surfaces outside the transactional core.
- Any schema, data-model, or behavior change. This is presentation-only.

## Definition of done

- All five changes applied; typecheck + tests + build green.
- Each edited surface exercised in the running app: drive the sell wizard
  through its steps (progress bar reads ink), open a thread with a meetup
  (pins read faint, chip behaves identically), and view notifications with an
  unread item (dot reads ink).
- No accent remains on any non-button / non-active-state / non-badge element
  across the five surfaces (re-grep to confirm only the documented
  "Explicitly unchanged" accent sites remain).
- Commits grouped by surface (sell / thread / notifications / moveout).
- No regression to the "Explicitly unchanged" sites.
