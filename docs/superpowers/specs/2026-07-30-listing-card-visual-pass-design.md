# Listing card — visual pass

**Date:** 2026-07-30
**Status:** approved, ready to implement

## Why

The card is the most repeated element in the product and appears on eight
surfaces (browse, landing, saved, profile, move-out batches, related rails).
Looking at a full browse grid, five things are wrong:

1. **Price and title carry identical weight.** Both `text-sm`. Price is the
   primary scan target in a marketplace and currently competes with the title
   for the same row and the same emphasis.
2. **The favourite heart is the loudest mark on every tile** — a white circle,
   permanently visible, drawing the eye before the price does. It is a
   secondary action with primary prominence.
3. **Rows have ragged internal rhythm.** The `N saved` line renders on some
   cards and not others, so text blocks within a row end at different heights.
   The grid equalises borders, not content.
4. **Photoless cells read as holes** — a small glyph centred in a large
   near-white box, sitting beside fully-filled colour tiles.
5. **Tight padding** (`p-3` on a ~254px card) with no separation between image
   and body, so pale images make the whole tile read as one flat block.

## The card, restructured

**Price first.** The body becomes:

```
price          <- text-base, semibold, its own line
title          <- text-sm, medium, 2-line clamp, reserved height
meta           <- text-xs, faint
```

This is the Facebook Marketplace / Craigslist convention, and for the reason
they use it: people scan a grid for price, not for prose.

**The price slot always renders**, so every card in a row shares one rhythm:

| type | slot |
|------|------|
| `SELL` with a price | `$35` |
| `DONATE` | `Free` |
| `LOST` / `FOUND` / `WANTED` | the type label, in faint rather than ink |

Because the body now carries the type for LOST / FOUND / WANTED, those three
badges come **off** the image — they were saying the same thing twice. The
image keeps only `Free` (the strongest draw on a donation) and status badges
(`Sold`, `Resolved`), so the picture gets quieter.

**`N saved` moves onto the image** as a small bottom-left overlay. That is
where marketplaces put social proof, and it frees the body to be exactly three
rows on every card — which is what fixes the ragged rhythm.

**The heart reveals on hover** on fine-pointer devices and stays permanently
visible on touch, via `@media (hover: hover) and (pointer: fine)`. It must also
appear on `:focus-visible` so keyboard users never lose it — that is a
correctness requirement, not a nicety.

**Photoless cells** get a larger glyph and a soft neutral tint instead of bare
paper, so the grid stops looking patchy where photos are missing.

**Spacing:** body padding `p-3` → `p-4`; grid gap `gap-4` → `gap-4 sm:gap-5`.

## What does not change

- The 4:3 image ratio, the card border, radius, and hover border treatment.
- `ListingCardData` gains nothing. All the inputs already exist.
- The stretched-link pattern (link overlays the card, favourite is a sibling)
  stays exactly as it is — it is what keeps the markup valid for assistive tech.
- The skeleton is updated to mirror the new three-row body so the Suspense swap
  still shifts nothing.

## Testing

The card is presentational and has no branching worth a unit test beyond what
already exists, with one exception: the price-slot rule is real logic with five
cases. It moves into a pure `priceSlot(type, price)` helper in
`src/lib/format.ts` and gets tested there — SELL with price, SELL without,
DONATE, LOST, FOUND, WANTED.

Existing 171 tests must stay green; `tsc --noEmit` must stay clean. The grid is
verified visually at desktop and re-run through the Playwright mobile sweep at
375px, since the body gains a row and the sweep is what caught the last
mobile regression.

## Risks

- **Eight call sites.** The restructure changes every surface at once. That is
  the point — consistency — but the visual check must cover browse, landing,
  saved and the related rails, not just browse.
- **Hover-reveal hiding a control.** Mitigated by the `pointer: coarse` rule
  and the `:focus-visible` requirement. If either fails, the heart becomes
  unreachable for some users, so both are verified explicitly.
- **Removing type badges from the image** could make Lost & Found cards read as
  ordinary listings at a glance. The body slot carries it in the same position
  on every card, which should be a clearer signal than a badge that moves
  around; worth a look on the Lost & Found tab specifically.
