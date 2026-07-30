# Listing detail — design the page around trust

**Date:** 2026-07-30
**Status:** approved, ready to implement

## Why

The product's thesis is stated everywhere except where it matters. The landing
page, the features, and the sign-in copy all say the same thing: *you're
trading with verified classmates, not strangers off the internet.*

The listing detail page — the one page where a student decides whether to
message a stranger about meeting in person — never says it. The seller block
carries good facts (major, year, member-since, completed exchanges, rating) but
nothing that visually cashes the promise.

That is a design failure at the level of the value proposition, not polish.

Three supporting problems on the same page:

- **Flat hierarchy.** `$35` renders barely larger than body text. Price leads
  on the cards now; here it sits under the title as an afterthought.
- **The meetup list is the biggest block on the page** — five bullets, roughly
  180px — and it is the least decision-relevant thing there. It answers "where
  will we meet" before "do I want this", and the same list already appears
  inside the chat when a meetup is actually proposed.
- **No social proof at the decision point.** Cards show "3 saved"; the detail
  page, where it would create real urgency, shows nothing.

## The one bold move

**The seller block becomes a trust panel, seated directly against the CTA.**

Everything else on the page stays quiet. This is the page's job expressed as a
single object, and it uses the brief's own vernacular — a verified campus
identity — rather than a generic author card.

It carries, in this order:

1. Initial in a circle, matching the treatment the header already uses for the
   account menu. No schema change, no upload flow, and nothing that can render
   as a broken image.
2. Display name.
3. **Verified @uc.edu** with a check.
4. Rating and completed exchanges.
5. Member since.

### The verification claim is true, and worded to match exactly what is checked

`auth.ts` rejects any sign-in whose email fails `isUcEmail` in the `signIn`
callback, and that callback is on the authoritative server path for every
sign-in method. The demo-login route checks the same function.

The wording is **"Verified @uc.edu"**, not "Verified student". What the system
actually verified is control of a UC email address. It has not verified
enrolment, and the page should not imply the university vouches for the person.

## Everything else, quieter

- **Price leads** the right column at display size, with the type badge beside
  it rather than above the title.
- **Description gets room** — it is the seller's own account of the thing and
  currently reads as a caption.
- **The meetup list collapses** into a `<details>` disclosure, closed by
  default, labelled with the count. Native element, so it works without JS and
  is keyboard- and screen-reader-accessible for free.
- **Saved count sits by the CTA** — "3 saved" — sourced from a `_count` on the
  query already being made.

## What does not change

- The palette, type scale, spacing system, and the one-accent rule. This is a
  page that under-uses the existing system, not a system that needs replacing.
- The photo column, the related rails, and the owner-actions path.
- The `?from=` back-link behaviour.

## Testing

The page is presentational; the logic worth testing is the trust panel's
inputs, which already exist and are already tested (`isUcEmail` has coverage in
`validation.test.ts`). No new pure logic is introduced.

Verified instead by rendering: the panel appears for a signed-out visitor and a
signed-in non-owner, and does **not** appear where the viewer is the owner
(you don't need to be told you can trust yourself). Existing 183 tests stay
green and `tsc --noEmit` stays clean; re-swept at 375px.

## Risks

- **Over-claiming.** "Verified student" would be false; "Verified @uc.edu" is
  precisely what was checked. This wording is the mitigation and should not be
  softened into something vaguer or hardened into something broader.
- **A disclosure hiding safety information.** The meetup spots are reassurance,
  not instructions, and the full list still appears in the chat at the moment
  a meetup is proposed. The summary states the count so nothing feels hidden.
