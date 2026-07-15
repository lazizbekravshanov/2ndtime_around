# 2nd Time Around

your stuff deserves a second chance. the UC-only marketplace for buying,
selling, donating, and finding lost things.

**live:** https://2ndtime-around.vercel.app · built by Team 4 — IT2021,
University of Cincinnati

no randoms from across town. no sketchy meetups. no "is this still
available?" into the void. every account is a UC student, every meetup spot
is on campus, and every sale keeps something out of a dumpster.

now on **v3** — a full design-elevation + usability pass on top of v2's
feature set. what changed is [below](#v3--design-elevation); every screenshot
in this README is v3.

## the stack

- **Next.js 15** (App Router) + TypeScript, strict mode — no `any`, no mercy
- **Tailwind 4** — one accent color (UC Red), warm neutrals, zero clutter
- **Prisma + Postgres** (SQLite locally, zero config)
- **NextAuth** — magic links, `@uc.edu` only
- **Zod** — the server trusts nobody

## design tokens

everything visual derives from one `@theme` block in `src/app/globals.css`
(Tailwind 4). if you're adding UI, use these — never a raw hex or an ad-hoc
size:

| token | value | use |
| --- | --- | --- |
| `paper` | `#FAFAF9` | app background |
| `surface` | `#FFFFFF` | cards, sheets, inputs |
| `ink` | `#1C1917` | primary text |
| `faint` | `#57534E` | secondary text (AA on paper/surface) |
| `accent` | `#E00122` | UC Red — the ONLY accent: primary buttons, active states, badges |
| `line` | `#E7E5E4` | hairline borders (the default "shadow") |
| `line-strong` | `#D6D3D1` | stronger hairline: muted chart fills, map massing |
| `success` | `#16A34A` | confirmations only |

rules of the house:

- **type scale** — `text-xs` 12 / `text-sm` 14 / `text-base` 16 / `text-lg` 18 /
  `text-xl` 20 / `text-2xl` 24, display sizes (`4xl`–`6xl`) reserved for the
  landing hero + stat numerals. aim for ≤3 sizes per screen; nothing below 12px.
- **radius** — cards `rounded-xl`, inputs/buttons `rounded-lg`, pills/badges
  `rounded-full`. nested elements may step down one (e.g. `rounded-md` inside a
  padded `rounded-lg` segmented control) so corners stay optically concentric.
- **depth** — hairline borders, not shadows. the single exception is
  `shadow-float` on truly floating surfaces (menus, sheets, toasts).
- **width** — one page container, `max-w-page` (1100px), shared by header,
  main, and footer so edges always align. `px-4` gutters everywhere.
- **rhythm** — Tailwind spacing scale; section gaps use 4/5/6 steps
  consistently (`mt-5` between blocks, `p-4`/`p-5` card padding).
- **status colors** — every listing status badge goes through
  `src/components/StatusBadge.tsx`; charts/maps that can't read Tailwind
  classes use `var(--color-…)` or, as a last resort, `src/lib/theme.ts`.
- **motion** — 150–250ms, one expo-out ease, all neutralized under
  `prefers-reduced-motion`.

## run it

```bash
npm install      # deps + prisma client
npm run db:push  # local SQLite db, no setup
npm run db:seed  # 7 users, 46 listings, drama included
npm run dev      # localhost:3000
```

that's it. no `.env` needed locally — SQLite happens automatically.

## signing in (demo mode)

right now the app is invite-only on purpose. `/signin` is a persona picker —
two accounts, one shared password (the `DEMO_PASSWORD` env var):

- **Alex Demo** — pre-loaded with unread messages, a meetup proposal to
  accept, a lost & found claim to judge, and a rating waiting to happen
- **Professor** — clean account. explore, post, break things

picking a persona creates a real session (same table NextAuth uses), so
sign-out and auth guards work exactly like the real thing. the endpoint
only accepts the two listed emails — the password alone gets you nowhere
else. unset `DEMO_PASSWORD` and the whole side door disappears.

open sign-up isn't missing, it's parked: the full UC magic-link flow
(domain gate enforced server-side, links logged to console in dev) is
implemented and waiting on one env var + a UI toggle.

## env vars

| var | needed? | what |
| --- | --- | --- |
| `DATABASE_URL` | prod only | postgres url; local falls back to SQLite |
| `NEXTAUTH_SECRET` | prod only | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | prod only | your deployed origin |
| `DEMO_PASSWORD` | for demo mode | gates the persona sign-in |
| `EMAIL_SERVER` / `EMAIL_FROM` | later | SMTP for real magic links + activity notifications |

> **Secrets live in env vars only — never in `public/`.** Anything under
> `public/` is served at the site root, so a secret there is a public secret.
> Set `DEMO_PASSWORD`, `NEXTAUTH_SECRET`, and `DATABASE_URL` in the shell or the
> Vercel project, not in any committed or served file. `/api/demo-login` is
> enabled only while `DEMO_PASSWORD` is set — unset it to turn persona sign-in
> off entirely (e.g. for a real-users launch).

## deploy

push to main → Vercel builds it. needs the env vars above, a postgres db
(`npm run db:push` once against it — the prisma provider flips to postgres
automatically), and a Vercel Blob store for photos. that's the whole
ceremony.

## screenshots

> demo walkthrough: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) · system
> design: [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md)

| Landing | Sign in (demo mode) |
| --- | --- |
| ![Landing page](docs/screenshots/landing.png) | ![Persona picker](docs/screenshots/signin-picker.png) |

| Landing on mobile | |
| --- | --- |
| ![Landing on mobile](docs/screenshots/landing-mobile.png) | |

| Browse (Marketplace) | Lost & Found |
| --- | --- |
| ![Browse marketplace](docs/screenshots/browse-marketplace.png) | ![Lost and found tab](docs/screenshots/browse-lostfound.png) |

| Listing detail | Mobile browse |
| --- | --- |
| ![Listing detail](docs/screenshots/listing-detail.png) | ![Mobile browse](docs/screenshots/mobile-browse.png) |

| Sell wizard | My items |
| --- | --- |
| ![Sell wizard](docs/screenshots/sell-wizard.png) | ![My items](docs/screenshots/my-items.png) |

| Meetup proposal in chat | Lost & found claim |
| --- | --- |
| ![Meetup proposal](docs/screenshots/thread-meetup.png) | ![Ownership claim](docs/screenshots/thread-claim.png) |

| Campus impact | |
| --- | --- |
| ![Impact page](docs/screenshots/impact.png) | |

| Moderator analytics — Funnel | Demand index, funnel & marketplace health |
| --- | --- |
| ![Funnel dashboard](docs/screenshots/funnel.png) | ![Funnel demand & funnel detail](docs/screenshots/funnel-detail.png) |

## v1 → v2: what changed

v2 keeps the same calm, one-accent look and adds eleven features across
discovery, engagement, trust & safety, and campus-native moments — without
adding a second accent color or a single spinner.

| area | v1 | v2 |
| --- | --- | --- |
| **discovery** | 3 tabs, category + price filters | **Wanted** tab (a 5th "looking for" listing type), condition filter, sort high→low, dismissible filter pills, live result count |
| **saved searches** | — | follow a search and get notified when a match is posted |
| **favorites** | — | one-tap heart on every card + watchlist, with price-drop and sold nudges |
| **notifications** | unread dot on Messages only | full notifications center (bell + email) for messages, claims, meetups, ratings, saved-search hits, price drops |
| **chat** | 5s polling | near-real-time (SSE) with optimistic send + **Seen**, add-to-calendar and share on accepted meetups |
| **trust & safety** | — | report & block (both-way), plus a moderator queue |
| **move-out mode** | — | bulk-list everything at once → one shareable move-out sale page |
| **impact** | campus totals | + personal panel and earned badges (Trusted Trader, Quick Replier, Good Samaritan, …) |
| **pricing** | type a number | smart suggestion from recent comparable listings while you post |

**Browse — before / after.** Note the new **Wanted** tab, condition filter,
result count, the favorite hearts on every card, and the heart + bell in the
header.

| v1 | v2 |
| --- | --- |
| ![Browse v1](docs/screenshots/v1-browse.png) | ![Browse v2](docs/screenshots/v2-browse.png) |

**Listing detail — before / after.** v2 adds a save (favorite) button, a
report/block overflow menu, and safety blurbs on the suggested meetup spots.

| v1 | v2 |
| --- | --- |
| ![Listing v1](docs/screenshots/v1-listing.png) | ![Listing v2](docs/screenshots/v2-listing.png) |

**New screens in v2.**

| Notifications | Saved (favorites + searches) |
| --- | --- |
| ![Notifications](docs/screenshots/v2-notifications.png) | ![Saved](docs/screenshots/v2-saved.png) |

| Move-out sale (shareable) | Moderation queue |
| --- | --- |
| ![Move-out batch](docs/screenshots/v2-moveout.png) | ![Moderation](docs/screenshots/v2-moderation.png) |

## v3 — refinement & hardening

v3 isn't new features — it's the same product, audited section by section
(tokens → typography → layout → components → states → motion → a11y → perf →
data → reliability → responsive → SEO) and hardened. Same calm one-accent
look; fewer ways for it to break.

| area | v2 | v3 |
| --- | --- | --- |
| **tokens** | good foundation, some drift | zero hardcoded colors left — charts/map/logo read `var(--color-…)` or `src/lib/theme.ts`; one `max-w-page` container; one `StatusBadge` source of truth |
| **states** | browse had skeletons | every data route has a shape-matched `loading.tsx`; `error.tsx` + `global-error.tsx` (no more white screens); failed delete/mark-sold can no longer masquerade as success |
| **feedback** | toasts on safety/favorites | toasts on the whole lifecycle: post, publish, sold/given/resolved, relist, delete — with two-step confirms on every destructive action, including block |
| **a11y** | strong baseline | AA sweep: `aria-describedby` on all form errors, focus-trapped sheets that return focus, honest ARIA (dropped fake `menu`/`tablist` roles), no color-only status anywhere |
| **performance** | fine, unmeasured | measured (below): lazy images, cached landing/impact queries, per-field debounce, and the hero map now skips phones entirely — its 3.5s of script eval was pure cost on the primary device |
| **data** | validated + race-safe | plus: double-submit guard on `createListing`, auth + category allow-list on `suggestPrice`, shape-checked SSE payloads, back-button-safe search state |
| **ops** | — | env validated at startup with clear errors; favicon, OG/Twitter cards (a shared listing previews with photo + price), `robots.txt` |

**Lighthouse (landing, mobile emulation, local prod build)** — before → after
the v3 perf pass:

| category | before | after |
| --- | --- | --- |
| Performance | 59 | **99** (FCP 0.8s · LCP 2.3s · TBT 10ms · CLS 0) |
| Accessibility | 96 | **100** |
| Best practices | 100 | **100** |
| SEO | 92 | **92**¹ |

¹ The one failing audit is `meta-description`: Next 15 streams metadata into
`<body>` on dynamic pages for browser user-agents. Crawlers and link-preview
bots (`htmlLimitedBots`) receive it in `<head>` — verified with a Twitterbot
UA — so real-world SEO/sharing is unaffected.

The earlier heuristic-evaluation pass is still written up in
[`docs/HCI_UX_REPORT.md`](docs/HCI_UX_REPORT.md).

## v3.1 — campus-native components

Six additions that make it feel like it was built *for* students, not just
near them (spec: [`docs/superpowers/specs/`](docs/superpowers/specs/)):

- **category shortcut chips** on Browse — Textbooks, Dorm essentials, Bikes,
  Electronics, Music (CCM), Art & Design (DAAP) — one tap to the staples
- **move-out countdown banner** (within 45 days of semester end) that feeds
  the existing bulk move-out flow; dismissible per semester
- **"Recently sold"** social-proof line on the landing, from real sales
- **course codes on textbooks** — post with "MATH 1061", searchable by
  course, filterable once the Textbooks category is picked
- **major + class year** shown on seller cards and chat headers, so the
  counterparty reads as a classmate
- **meetup quick-picks** — walking-time hints on every safe spot + one-tap
  between-class time chips (no map, zero new JS weight)

## v3.2 — pitch-ready pass

A second UX/UI audit, then four tracks to take it from polished project to
something you could pitch as a real campus venture (spec:
[`docs/superpowers/specs/2026-07-04-v3.2-pitch-ready-design.md`](docs/superpowers/specs/2026-07-04-v3.2-pitch-ready-design.md)):

- **demo-flawless polish** — nine audit fixes: Browse price/course fields made
  controlled (no stale value after chip removal), AA-contrast success badge
  (new `--color-success-strong`), valid card markup (stretched link, not a
  button-in-anchor) with a real `alt`, one-click **Publish** on drafts,
  normalized page titles, SVG pin instead of an emoji, a moderation loading
  skeleton, and distinct empty-state icons
- **sustainability leaderboard** (`/leaderboard`) — **Top Bearcats** and **By
  major** boards ranking students by items kept in circulation, with a
  personalized "You're #N" for signed-in students. Pure ranking logic (11
  unit tests) over a cached query; no schema change
- **public "How it works"** (`/how-it-works`) — the in-product pitch narrative:
  three steps, the trust story, real impact numbers
- **founder pitch one-pager** — [`docs/pitch/onepager.html`](docs/pitch/onepager.html),
  a self-contained, design-grade pitch deriving its numbers from the live product

## how it's laid out

```
src/
  app/
    page.tsx           landing (signed in? → /browse)
    signin/            persona picker (honors a same-origin ?callbackUrl)
    (public)/          browsable without an account
      browse/          Marketplace · Donations · Lost & Found (anon-friendly)
      listing/[id]/    active-listing detail (anon-friendly; edit stays in (app))
      how-it-works/    the pitch narrative
      leaderboard/     sustainability standings
      profile/[id]/    ratings live here
    (app)/             everything that needs auth
      listing/[id]/edit  owner-only edit
      sell/            4-step wizard, one question per screen
      messages/        threads, 5s polling, meetup proposals, claims
      my-items/        Active / Sold / Drafts
      impact/          the landfill counter, explained
    api/               auth, uploads, message polling, demo login
  lib/
    actions/           server actions — every mutation validated + authorized
    ...                auth, zod schemas, db, uploads, constants
  components/          the design system (Button, Badge, Field, Stars…)
prisma/                schema + seed
```

every mutation goes: form → server action → zod → "do you even own this?" →
db. client-side validation is decoration; the server is the bouncer.

messaging is 5-second polling — no websockets, no regrets at this scale.
meetup proposals and ownership claims are just messages with a `kind` and
some json, rendered as cards you can tap accept/decline on.

rate limiting guards five boundaries via one policy layer (`src/lib/rateLimit.ts`):
demo login and uploads fail **closed** (credential/storage abuse outweighs a
brief outage); listing writes, message send/poll, and SSE connects fail **open**
(a limiter hiccup must never freeze the marketplace). Demo-login is keyed by a
one-way hash of IP + email — never the raw values. It's distributed via Upstash
Redis when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set, and
falls back to per-instance in-memory limiting otherwise (setting the vars later
upgrades it with no code change).

## decisions worth knowing

- **13 categories**, built for campus life — Textbooks by college, Bikes &
  Transit, Music & Instruments (CCM), Art & Design Supplies (DAAP). full
  reasoning in the [design doc](docs/SYSTEM_DESIGN.md). subcategories stay
  search terms — deep menus on a phone are violence.
- **anyone can browse; only UC students can participate** — `/browse` and
  active `/listing/[id]` pages are public and crawlable, so the marketplace is
  discoverable without an account. Every participation action (post, message,
  claim, favorite, save-search, report) renders a sign-in call to action that
  returns you to where you were via a validated same-origin `callbackUrl`
  (including public-header Sign in, empty-state Post, move-out CTA, and
  `requireUser()` deep-link redirects). Real UC-email registration is a
  **separate follow-up** — for now anonymous users land in the existing demo
  sign-in. Non-active listings stay invisible to everyone but their owner.
- **donations aren't a category, they're a tab** — free stuff gets equal
  billing, not a landfill page at the bottom.
- **the claim flow is the flex**: describe a detail only the owner would
  know → finder approves → contacts exchanged, item resolved. the physical
  lost & found office is closed at 11pm. we're not.
- **impact counting is honest** — completed sales + donations count as
  reuse; returned lost items are tracked separately because giving
  something back isn't recycling.
- **DRAFT status** exists beyond the original spec so half-written posts
  have somewhere to live.
- **`prepare-db.mjs`** flips the prisma provider between SQLite and
  postgres based on `DATABASE_URL`, because prisma won't read it from env
  and we refuse to maintain two schemas.
- view counts skip the owner. inflating your own numbers is cringe.
