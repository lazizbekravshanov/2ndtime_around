# 2nd Time Around — V2 "Killer Platform" Build Prompt

> **How to use this file:** This is a single, self-contained implementation prompt.
> Hand it to an autonomous coding agent (or work through it yourself top-to-bottom).
> Build the features in the order given — each section lists exact files, data-model
> changes, server logic, UI, and acceptance criteria. Do **not** skip the Guardrails
> section: it encodes the constraints that keep V2 from breaking V1.
>
> **Definition of done for the whole build:** every acceptance checkbox ticked,
> `npm run typecheck` clean, `npm run build` green on both SQLite and Postgres,
> and the demo script in `docs/DEMO_SCRIPT.md` still passes end-to-end.

---

## 0. Mission & North Star

2nd Time Around is a University of Cincinnati campus marketplace: students **sell**,
**donate**, and post **lost & found** items, message each other, propose safe on-campus
meetups, claim found items, and rate exchanges. V1 is small, secure, and well-built.

**V2's north star: make the platform feel *alive and trustworthy* without adding a
single gram of friction.** Every feature below must pass two tests before it ships:

1. **The "calm" test** — does it keep the minimalist, one-accent, paper-and-ink
   aesthetic? If a feature needs a second accent color, a spinner, or a dense
   dashboard, redesign it until it doesn't.
2. **The "thumb" test** — the primary user is on a phone between classes. Every new
   surface must work one-handed, with the existing bottom tab bar, in under 3 taps.

We are shipping **11 features** in one coordinated release:

| # | Feature | Theme |
|---|---------|-------|
| 1 | Instant search + smart filters | Discovery |
| 2 | Saved searches & "notify me" | Discovery |
| 3 | "Looking for" / want ads (5th listing type) | Discovery |
| 4 | Favorites / watchlist | Engagement |
| 5 | Notifications center (in-app + email) | Engagement |
| 6 | Near-real-time chat | Engagement |
| 7 | Report & block | Trust & Safety |
| 8 | Safer meetups (map, share, calendar) | Trust & Safety |
| 9 | Move-out mode | Campus-native |
| 10 | Leveled-up impact & badges | Campus-native |
| 11 | Smart price suggestions | Campus-native |

Features 2, 4, and 6 all depend on the **notification backbone** (Feature 5), so
build Feature 5's data model first even though its UI ships alongside the others.

---

## 1. Design Language — "Minimalist College Vibe"

The existing system (`src/app/globals.css`) is already the target aesthetic. **Deepen
it; do not replace it.** Treat these as hard rules for every new screen.

### 1.1 Tokens (already defined — reuse, never hardcode)
```
--color-paper   #fafaf9   app background
--color-surface #ffffff   cards / sheets
--color-ink     #1c1917   primary text
--color-faint   #78716c   secondary text
--color-accent  #e00122   UC Red — ONE accent, primary actions/active states/badges only
--color-line    #e7e5e4   1px borders
--color-success #16a34a   confirmations only
```
Font: Inter via `--font-sans`. Body line-height 1.6. Antialiased.

### 1.2 Rules
- **One accent.** UC Red means "the main thing to do here." Never use it for
  decoration. New states (saved, followed, blocked) use ink/faint/line, not new hues.
- **1px borders, generous radius.** Cards `rounded-xl`, pills `rounded-full`,
  inputs/buttons `rounded-lg`. Borders are `border-line`; hover deepens to
  `border-faint/50`.
- **Skeletons, never spinners.** Every async surface gets a skeleton that matches the
  final layout's exact shape (see `ListingCardSkeleton`). Use the `.skeleton` class.
- **Calm motion.** Transitions are `transition-colors` or short transforms
  (`duration-300`, scale ≤ 1.02). No bounce, no slide-in carousels.
- **Type scale.** Page titles `text-base`–`text-lg font-semibold`; body `text-sm`;
  metadata `text-xs text-faint`. Don't introduce display type.
- **Spacing.** Content max-width is `1100px` (already set in `(app)/layout.tsx`).
  Section rhythm: `mt-4`/`mt-5`/`gap-4`.
- **Empty states are first-class.** Every new list/grid uses `EmptyState`
  (`src/components/ui/EmptyState.tsx`) with a warm, specific hint and one action.
- **Accessibility is not optional.** Keep `:focus-visible` outlines, `aria-*` on
  interactive controls (match `Header.tsx`/`BrowseFilters.tsx`), and full keyboard
  operability for every new menu, sheet, and toggle.

### 1.3 New shared primitives to add (keep them tiny)
Add these to `src/components/ui/` so features compose instead of re-inventing:
- **`Sheet.tsx`** — a mobile-first bottom sheet / desktop centered modal. One
  component, `open`/`onClose`, focus-trapped, Escape-to-close, backdrop click closes.
  Used by report, block, share-meetup, save-search, move-out.
- **`IconButton.tsx`** — square 36–40px ghost button for the favorite heart, bell, and
  overflow menus. Wraps `buttonClasses("ghost")` sizing.
- **`Toast.tsx` + `useToast()`** — a single bottom-center toast for confirmations
  ("Saved", "Reported", "Blocked"). Auto-dismiss 3s, `role="status"`, success tone is
  ink-on-surface with a small `--color-success` check (no loud banners).
- **`Toggle.tsx`** — an accessible switch for notification preferences. Ink track when
  on, line track when off.

> Keep each primitive under ~60 lines. If one grows past that, it's doing too much.

---

## 2. Guardrails — Read Before Writing Any Code

These are the constraints that V1 respects and V2 must not violate. Most production
bugs in this codebase would come from breaking one of these.

### 2.1 Dual database provider (SQLite dev / Postgres prod)
- `scripts/prepare-db.mjs` rewrites the Prisma `provider` line based on `DATABASE_URL`.
  **Every schema change must work on both providers.**
- **No native enums, no `@db.*` types, no array scalar columns.** V1 models enums as
  `String` and lists as `Json` precisely because SQLite can't do the rest. Follow that:
  new "enum" fields are `String` validated by Zod; new lists are `Json`.
- **SQLite cannot filter inside `Json` columns.** If you need to query a list, also
  store a queryable scalar (V1 does this with `Conversation.starterId`). Saved-search
  matching and favorites therefore use real relational rows, not JSON blobs.
- Case-insensitive search needs `mode: "insensitive"` on Postgres but **not** on
  SQLite (SQLite `LIKE` is already case-insensitive and the SQLite client doesn't type
  `mode`). Reuse the existing pattern in `browse/page.tsx:49-60`:
  ```ts
  const onPostgres = process.env.DATABASE_URL?.startsWith("postgres");
  const match = onPostgres ? { contains: q, mode: "insensitive" } : { contains: q };
  ```
  **Extract this into one helper** `src/lib/search.ts → likeFilter(q: string)` and use
  it everywhere search happens (browse, saved-search matching). Do not copy-paste.

### 2.2 Serverless runtime (Vercel) — no long-lived processes
- There is **no WebSocket server and no background worker.** Do not introduce one.
- "Real-time" = Server-Sent Events on a Node-runtime route with a bounded lifetime,
  **with the existing polling as the guaranteed fallback** (see Feature 6).
- Saved-search matching and price-drop nudges run **inline at write time** (when a
  listing is created or its price drops), not on a cron. This is the only model that
  works without a worker.
- Email (notifications) reuses the already-configured `nodemailer` transport pattern
  from `src/lib/auth.ts` and is **best-effort**: if `EMAIL_SERVER` is unset, log to
  console exactly like magic links do. Never block a user action on email delivery
  (fire-and-forget, swallow errors, never `await` it inside the user's transaction).

### 2.3 Auth & authorization model (do not weaken)
- Identity always comes from `getSessionUser()` / `requireUser()`
  (`src/lib/session.ts`). **Never trust an id from the client for the actor.**
- Every new mutation is a server action or route that (a) loads the session user,
  (b) re-validates input with a Zod schema in `src/lib/validation.ts`, (c) checks
  ownership/participation server-side before writing. Mirror `listings.ts` /
  `conversations.ts` exactly — same `ActionResult<T>` discriminated union, same
  `zodFieldErrors` helper.
- New ownership rules to enforce:
  - Only a listing's owner can see who favorited it (actually: never expose favoriters).
  - Only the two conversation participants can read a thread (already enforced by
    `loadConversationFor`). Blocking adds a new precondition (Feature 7).
  - Notifications are per-recipient; a user may only read/dismiss **their own**.
  - Reports are write-only for normal users; only moderators read them (Feature 7.4).

### 2.4 Carry-forward security fixes from the V1 audit (must be in V2)
The audit found the code clean but flagged secrets handling. **V2 must include these:**
1. **`public/seed/.env` is deleted** (done) — never place secrets under `public/`.
   Add a CI/check note in the README: nothing secret ever goes in `public/`.
2. **Rotate & relocate secrets.** `DATABASE_URL`, `NEXTAUTH_SECRET`, and `DEMO_PASSWORD`
   move to environment variables only (Vercel project env / shell). The committed
   `.env.example` keeps placeholders. The old live values are considered compromised
   and must be rotated before V2 deploys.
3. **Gate `/api/demo-login` to non-production.** Add at the top of the handler:
   ```ts
   if (process.env.VERCEL_ENV === "production") {
     return NextResponse.json({ error: "Not found." }, { status: 404 });
   }
   ```
   Demo personas must never be reachable on a real tenant with real user data.
4. Keep the timing-safe compare and the persona allowlist that are already there.

### 2.5 Don't break V1
- The browse URL contract (`?tab=&q=&category=&min=&max=&sort=&lf=`) is public and
  shareable. Extend it; don't rename existing params.
- `LISTING_TYPES`, `LISTING_STATUSES`, `CATEGORIES`, `CONDITIONS`, `MEETUP_SPOTS` in
  `src/lib/constants.ts` are referenced everywhere. Add to them; don't reorder/remove.
- The demo seed (`prisma/seed.ts`) must still produce a coherent staged account. Extend
  the seed to populate V2 data (a favorite, a saved search, a badge-worthy history) so
  the demo shows V2 off without manual setup.

---

## 3. Data Model — All Schema Changes (do this first)

Add the following to `prisma/schema.prisma`. Keep the dual-provider rules from §2.1.
After editing, run `npm run db:prepare && npx prisma db push` for SQLite and verify the
same against a Postgres URL.

### 3.1 New `User` fields & relations
```prisma
model User {
  // ...existing fields...
  isModerator   Boolean   @default(false)   // gates the moderation queue (Feature 7)

  // new relations
  favorites          Favorite[]
  savedSearches      SavedSearch[]
  notifications      Notification[]
  reportsMade        Report[]       @relation("ReportsMade")
  blocksInitiated    Block[]        @relation("BlocksInitiated")
  blocksReceived     Block[]        @relation("BlocksReceived")
}
```

### 3.2 `Listing` — support want-ads, move-out, price-drop tracking
```prisma
model Listing {
  // ...existing fields...
  // type now includes "WANTED" (see constants). WANTED + DONATE have no price.
  // For move-out mode, group bulk-posted items so a buyer can see the whole batch.
  moveoutBatchId String?   // nullable; set when posted via Move-out mode
  // Price-drop tracking: remember the last price we notified favoriters about,
  // so a drop fires a notification at most once per new low.
  lastNotifiedPrice Float?

  favorites     Favorite[]
  reports       Report[]

  @@index([moveoutBatchId])
}
```

### 3.3 `Favorite`
```prisma
model Favorite {
  id        String   @id @default(cuid())
  userId    String
  listingId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@unique([userId, listingId])   // one favorite per user per listing
  @@index([listingId])
}
```

### 3.4 `SavedSearch`
```prisma
model SavedSearch {
  id        String   @id @default(cuid())
  userId    String
  // Human label shown in the UI ("TI-84 under $40").
  label     String
  // Normalized criteria — mirror the browse params so matching is trivial.
  // Stored as discrete columns (not JSON) so we can match in SQL if ever needed,
  // but matching actually runs in app code at listing-create time (see 2.2).
  q         String?
  category  String?
  type      String?   // SELL | DONATE | LOST | FOUND | WANTED | null = any
  minPrice  Float?
  maxPrice  Float?
  notify    Boolean  @default(true)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### 3.5 `Notification`
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String   // recipient
  // kind: MESSAGE | CLAIM | MEETUP | RATING | SAVED_SEARCH_HIT | PRICE_DROP | FAVORITE_SOLD | REPORT_RESOLVED
  kind      String
  title     String   // "New message from Alex"
  body      String?  // short preview, plain text only
  // Where tapping the notification goes (internal path, never external).
  href      String
  readAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt, createdAt])
}
```

### 3.6 `Report` & `Block`
```prisma
model Report {
  id         String   @id @default(cuid())
  reporterId String
  // Exactly one target is set.
  listingId  String?
  reportedUserId String?
  // reason: SPAM | PROHIBITED | HARASSMENT | SCAM | OTHER
  reason     String
  detail     String?
  // status: OPEN | REVIEWED | ACTIONED | DISMISSED
  status     String   @default("OPEN")
  createdAt  DateTime @default(now())

  reporter User     @relation("ReportsMade", fields: [reporterId], references: [id], onDelete: Cascade)
  listing  Listing? @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
}

model Block {
  id          String   @id @default(cuid())
  blockerId   String
  blockedId   String
  createdAt   DateTime @default(now())

  blocker User @relation("BlocksInitiated", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked User @relation("BlocksReceived", fields: [blockedId], references: [id], onDelete: Cascade)

  @@unique([blockerId, blockedId])
  @@index([blockedId])
}
```

> **Migration discipline:** all new columns are nullable or have defaults, so existing
> rows survive `db push` without backfill. Verify with a push against a copy of the dev
> DB before touching prod.

---

## 4. Cross-Cutting Backbone — Notifications & Email (build before features 2/4/5/6)

### 4.1 `src/lib/notify.ts` — the single entry point
One function every feature calls. It writes the in-app row and fires best-effort email.
```ts
type NotifyInput = {
  userId: string;            // recipient
  kind: string;              // see Notification.kind union
  title: string;
  body?: string;
  href: string;              // internal path
};

export async function notify(input: NotifyInput): Promise<void> {
  // 1) Always write the in-app notification row.
  await db.notification.create({ data: { ...input } });
  // 2) Respect the recipient's email preference (default on for high-signal kinds).
  //    Fire-and-forget; never throw into the caller.
  void sendNotificationEmail(input).catch(() => {});
}
```
- `sendNotificationEmail` mirrors `auth.ts`: if `process.env.EMAIL_SERVER` is unset,
  `console.log` the notification instead of sending. Subject = `title`, body = `body` +
  an absolute link built from `NEXTAUTH_URL + href`.
- **Never** `await notify()` inside a Prisma `$transaction` that gates a user action.
  Call it after the transaction commits.
- **De-dupe noisy kinds.** For `MESSAGE`, don't create a new notification if an unread
  `MESSAGE` notification for the same conversation already exists — update its
  `createdAt` and `title` instead. This keeps the bell from flooding during a chat.

### 4.2 Email preferences
- Add a lightweight preference: store per-user opt-outs as a `Json` column
  `User.emailPrefs` (default `{}`) mapping kind → boolean, OR keep it simple for V2 and
  honor a single `User.emailOptOut Boolean @default(false)`. **Pick the single boolean**
  for V2 (YAGNI); a per-kind matrix is a V3 concern. Surface it as one `Toggle` on the
  profile/settings area: "Email me about activity."

### 4.3 Wiring existing actions into `notify()`
Add a `notify()` call (post-commit) to these existing flows:
- `conversations.ts → sendMessage` → notify the **other** participant (kind `MESSAGE`,
  href `/messages/{conversationId}`).
- `conversations.ts → proposeMeetup` / `respondToMeetup` → notify counterpart
  (kind `MEETUP`).
- `conversations.ts → submitClaim` / `respondToClaim` → notify finder / claimant
  (kind `CLAIM`).
- `ratings.ts → submitRating` → notify the ratee (kind `RATING`, href `/profile/{id}`).

Acceptance:
- [ ] Sending a message creates exactly one unread `MESSAGE` notification for the
      recipient (and coalesces on repeat sends in the same thread).
- [ ] With `EMAIL_SERVER` unset, the notification email body is logged to console.
- [ ] No user action's latency or success depends on email.

---

## 5. Feature Specs

Each feature: **Goal → Data → Server → UI → Acceptance → Files.** Build in this order.

---

### Feature 5.1 — Instant Search + Smart Filters

**Goal:** make discovery feel instant and let buyers narrow fast, without leaving the
existing browse page or its shareable URL.

**Data:** none new. Add `src/lib/search.ts` with `likeFilter(q)` (see §2.1) and a
`buildListingWhere(params)` that centralizes the `where` construction currently inlined
in `browse/page.tsx`.

**Server:**
- Refactor `browse/page.tsx`'s `Results` to call `buildListingWhere`.
- Extend filtering: add a **condition** filter (`?condition=`) and make search span
  `title`, `description`, **and** `category` text. Add a **relevance-ish** default for
  text searches (title matches before description matches) by issuing the query ordered
  `createdAt desc` but boosting exact-ish title hits client-side is overkill — instead,
  when `q` is present, order by `createdAt desc` and rely on `take: 60`. Keep it simple.
- Add `?sort=price-desc` and `?sort=newest` (explicit) alongside existing `price-asc`.
- Search must work across **all tabs** (currently it does; verify want-ads tab too).

**UI (`BrowseFilters.tsx`):**
- Keep the debounced (300ms) URL-driven search input — it's already excellent.
- Add a **condition** `select` (All / New / Like new / Good / Fair / Well loved) in the
  market and donations tabs.
- Add a compact **active-filters row**: small dismissible pills showing each applied
  filter (category, price, condition, query). Tapping a pill's × removes just that
  param. Pills use `border-line`/`text-faint`, the active pill style already in the
  lost/found segmented control. This is the single biggest UX win — users see and undo
  their narrowing at a glance.
- Result count: show "`N` items" above the grid (faint, text-xs). Updates with filters.

**Acceptance:**
- [ ] Typing updates results within ~300ms with no full page reload (URL `replace`).
- [ ] Every filter is reflected in the URL and survives a refresh / share.
- [ ] Active-filter pills appear for each applied filter and removing one updates results.
- [ ] Condition filter works on both providers; search is case-insensitive on Postgres.
- [ ] Empty state distinguishes "no results for filters" vs "nothing here yet" (exists).

**Files:** `src/lib/search.ts` (new), `src/app/(app)/browse/page.tsx` (refactor),
`src/app/(app)/browse/BrowseFilters.tsx` (extend), `src/app/(app)/browse/ActiveFilters.tsx` (new, client).

---

### Feature 5.2 — Saved Searches & "Notify Me"

**Goal:** a buyer follows a search; when a matching listing is posted, they get a
notification. Turns one-time visitors into returning users.

**Data:** `SavedSearch` (§3.4). Matching runs **inline at listing-create time** (§2.2).

**Server:**
- `src/lib/actions/savedSearches.ts`:
  - `createSavedSearch(input)` — Zod-validate `{ label, q?, category?, type?, minPrice?, maxPrice?, notify }`; cap a user at, say, 20 saved searches (return a friendly error past that). Owner = session user.
  - `deleteSavedSearch(id)` — owner-only.
  - `toggleSavedSearchNotify(id)` — owner-only.
- **Matching:** add `matchSavedSearches(listing)` in `src/lib/savedSearchMatch.ts`,
  called from `createListing`/`updateListing` (only when a listing becomes `ACTIVE`):
  - Load candidate `SavedSearch` rows where `notify = true` and `userId != listing.ownerId`.
  - In app code, test each: type matches (or null), category matches (or null), price
    within [min,max] (or null bounds), and `q` (if set) appears (case-insensitive) in
    title/description/category.
  - For each match, `notify({ userId, kind: "SAVED_SEARCH_HIT", title: "New match: <listing.title>", href: "/listing/<id>" })`.
  - **Bound the work:** if a user has many saved searches, only fire one notification per
    saved search per listing. Run matching **after** the listing transaction commits.

**UI:**
- On `browse`, when any filter/search is active, show a subtle **"Save this search"**
  ghost button next to the result count. Opens a `Sheet` prefilled with a generated
  label (e.g., "Textbooks under $40") that the user can edit; toggle for notify.
- New page **`/saved`** (and a link in the user menu): list of saved searches as rows,
  each tappable (re-runs the search by linking to the encoded browse URL), with a notify
  `Toggle` and a delete action. Empty state encourages saving one from browse.

**Acceptance:**
- [ ] Saving a search from an active browse view creates a row with the right criteria.
- [ ] Posting a listing that matches another user's notify-on saved search creates a
      `SAVED_SEARCH_HIT` notification for that user (and an email if configured).
- [ ] A user never gets notified about their own listing.
- [ ] Tapping a saved search reproduces the exact filtered browse view.
- [ ] Per-user cap enforced with a friendly message; matching never blocks posting.

**Files:** `src/lib/actions/savedSearches.ts` (new), `src/lib/savedSearchMatch.ts` (new),
`src/app/(app)/saved/page.tsx` (new), `SaveSearchSheet.tsx` (new client),
hook into `src/lib/actions/listings.ts`.

---

### Feature 5.3 — "Looking For" / Want Ads (5th Listing Type)

**Goal:** students post what they *need*; sellers reach out. A first-class listing type,
not a bolt-on.

**Data:** extend `LISTING_TYPES` in `constants.ts` to
`["SELL", "DONATE", "LOST", "FOUND", "WANTED"]`. `WANTED` has **no price** and **no
photos required** (photos optional — a reference image is allowed). Add label
`WANTED: "Looking for"` to `TYPE_LABELS`.

**Server:**
- `validation.ts → listingSchema`: in the `superRefine`, `WANTED` requires neither price
  nor location; keep title/description/category rules. Price is forced `null` for
  `WANTED` (like DONATE) in `createListing`/`updateListing`.
- Browse: add a **"Wanted"** tab (`?tab=wanted`, `type = "WANTED"`). Want-ads show no
  price and a distinct, quiet badge ("Looking for") — reuse `Badge tone="outline"`.
- `startConversation` already lets a non-owner message a listing's owner; for a WANTED
  post the "owner" is the person looking, and a seller messaging them is exactly right.
  Verify the "This is your own listing" guard still reads naturally; relabel the listing
  detail CTA for WANTED to **"I have this"** instead of "Message seller."

**UI:**
- `SellWizard.tsx`: add `WANTED` as a type at step 1 with a one-line helper ("Tell the
  campus what you're hunting for"). Hide the price step and make photos optional for it.
- `ListingCard.tsx`: render the "Looking for" badge, suppress price, and for WANTED show
  the wanted category/keyword prominently instead of condition.
- Browse tabs: insert "Wanted" after "Lost & Found".

**Acceptance:**
- [ ] Posting a WANTED ad requires only title/description/category (no price/photos).
- [ ] WANTED ads appear under a Wanted tab and never show a price.
- [ ] A seller can start a conversation on a WANTED ad; the CTA reads "I have this."
- [ ] Saved-search `type=WANTED` matches new want-ads (Feature 5.2 interplay).
- [ ] Existing SELL/DONATE/LOST/FOUND flows are unchanged.

**Files:** `src/lib/constants.ts`, `src/lib/validation.ts`,
`src/app/(app)/sell/SellWizard.tsx`, `src/components/ListingCard.tsx`,
`src/app/(app)/browse/page.tsx` (tab + where), listing detail CTA components.

---

### Feature 5.4 — Favorites / Watchlist

**Goal:** one-tap save; get nudged on price drops and when a saved item sells. Lowest
effort, highest stickiness.

**Data:** `Favorite` (§3.3). Price-drop uses `Listing.lastNotifiedPrice` (§3.2).

**Server:** `src/lib/actions/favorites.ts`:
- `toggleFavorite(listingId)` — session user; create or delete the `Favorite` row;
  return the new state `{ favorited: boolean }`. Can't favorite your own listing
  (friendly no-op or hide the control on own listings — prefer hiding).
- `listFavorites()` — the watchlist for the current user (active listings first).
- **Price-drop nudge** in `updateListing`: if `existing.type === "SELL"` and the new
  price is **strictly lower** than `existing.price` and lower than
  `existing.lastNotifiedPrice ?? Infinity`, then after commit: for each favoriting user
  (≠ owner), `notify({ kind: "PRICE_DROP", title: "Price drop: <title>", body: "<old> → <new>", href: "/listing/<id>" })`, then set `lastNotifiedPrice = newPrice`.
- **Sold nudge** in `setListingStatus`: when status becomes `SOLD`/`RESOLVED`, notify
  favoriters (kind `FAVORITE_SOLD`) so their watchlist stays honest.

**UI:**
- A **heart `IconButton`** on `ListingCard` (top-right of the image) and on the listing
  detail page. Filled ink heart when favorited, outline when not. Optimistic toggle with
  a `Toast` ("Saved" / "Removed"). Never red — the heart is ink/faint, red stays reserved.
- New page **`/saved?tab=favorites`** or a dedicated **`/favorites`** (prefer a single
  **`/saved`** hub with two segments: "Searches" and "Items"). Watchlist grid reuses
  `ListingCard`. Empty state: "Tap the heart on anything to keep an eye on it."
- Add "Saved" to the user menu (and optionally the mobile tab bar if it fits — but the
  tab bar is full at 3; keep Saved in the user menu to respect the thumb test).

**Acceptance:**
- [ ] Heart toggles optimistically and persists across refresh.
- [ ] Favorite control is hidden on the user's own listings.
- [ ] Lowering a SELL price notifies favoriters exactly once per new low.
- [ ] Marking a favorited item sold notifies its favoriters.
- [ ] Watchlist shows current state (sold badge if it sold).

**Files:** `src/lib/actions/favorites.ts` (new), `src/components/FavoriteButton.tsx`
(new client), `src/components/ListingCard.tsx` (add heart),
`src/app/(app)/saved/page.tsx` (hub), hooks into `listings.ts`.

---

### Feature 5.5 — Notifications Center (in-app + email)

**Goal:** a single place to see everything that needs you — messages, claims, meetups,
ratings, saved-search hits, price drops. The backbone (§4) is already built; this is its
surface.

**Data:** `Notification` (§3.5).

**Server:** `src/lib/actions/notifications.ts`:
- `listNotifications()` — current user's, newest first, `take: 50`.
- `markNotificationRead(id)` / `markAllRead()` — owner-only.
- `unreadNotificationCount()` — for the bell badge (server component in the header).

**UI:**
- **Bell `IconButton`** in the `Header` (desktop) with the existing tiny accent dot
  pattern for unread (reuse the `unreadCount` dot style). On mobile, surface unread via
  the existing Messages dot **plus** a notifications entry in the user menu — do not add
  a 4th bottom tab.
- **`/notifications`** page: grouped by day, each row = icon (by kind) + title + body +
  `timeAgo`. Tapping marks read and routes to `href`. "Mark all read" ghost action.
  Unread rows have a subtle `bg-paper` tint and an accent dot; read rows are plain.
- Header bell count and Messages dot both derive from real queries in
  `(app)/layout.tsx` (extend the existing `unreadCount` fetch to also fetch
  `unreadNotificationCount`).

**Acceptance:**
- [ ] Bell shows an accurate unread count; opening and reading clears it.
- [ ] Each notification routes to the right place and marks itself read.
- [ ] "Mark all read" zeroes the badge.
- [ ] Message notifications coalesce per conversation (from §4.1).
- [ ] Email mirror is logged when SMTP is unset, sent when configured, never blocking.

**Files:** `src/lib/actions/notifications.ts` (new), `src/app/(app)/notifications/page.tsx`
(new), `src/components/NotificationBell.tsx` (new client),
`src/app/(app)/layout.tsx` (counts), `src/lib/notify.ts` (from §4).

---

### Feature 5.6 — Near-Real-Time Chat

**Goal:** the thread feels live — new messages appear within ~1s, with seen indicators —
without a WebSocket server.

**Approach (respect §2.2):**
- **Primary: Server-Sent Events.** Add `GET /api/conversations/[id]/stream` (Node
  runtime) that authorizes the participant, then streams `data:` frames. Implement it as
  a bounded loop: server-side, poll the DB every ~1s for messages newer than the last
  sent id, push deltas, and **close the connection after ~25s** (under Vercel's limit);
  the client reconnects via the browser's native SSE auto-reconnect. This gives ~1s
  latency with zero extra infra.
- **Fallback: existing 5s polling** (`/api/conversations/[id]/messages`) stays as-is.
  If the `EventSource` errors or isn't supported, `Thread.tsx` keeps polling. Never
  remove the polling path — it's the safety net and the source of truth for "mark read."
- **Optimistic send:** on submit, append the message to the local list immediately
  (greyed until confirmed), call the `sendMessage` server action, then reconcile with the
  next stream/poll frame. This is what actually makes it *feel* instant.
- **Seen indicators:** already modeled via `Message.readAt`. The stream frame includes
  `readAt` per message; render a small "Seen" under the last message the other party has
  read. No new schema needed.
- **Typing indicator (optional / stretch):** approximate via a transient SSE side
  channel only if time allows; do **not** write to the DB on keystrokes. If it adds risk,
  cut it — seen + optimistic + 1s latency already deliver the "alive" feeling. Be honest
  in the PR about whether typing shipped.

**UI (`Thread.tsx`):**
- Swap the 5s poll loop for: open `EventSource` on mount; on message, merge by id; on
  error, fall back to the existing interval. Keep the auto-scroll and the read-marking.
- Optimistic bubble styling: pending messages at 60% opacity, snap to full on confirm.
- Keep everything else (meetup proposals, claims) rendering exactly as today.

**Acceptance:**
- [ ] A message sent in one browser appears in the other within ~1–2s via SSE.
- [ ] With SSE blocked, the thread still updates within 5s via polling (no regression).
- [ ] Sent messages appear instantly (optimistic) and never duplicate after reconcile.
- [ ] "Seen" appears once the counterpart's poll/stream marks messages read.
- [ ] The SSE route authorizes participants exactly like the messages route (404 for
      non-participants); connections close within ~25s and the client reconnects.

**Files:** `src/app/api/conversations/[id]/stream/route.ts` (new),
`src/app/(app)/messages/[conversationId]/Thread.tsx` (rework),
keep `.../messages/route.ts` as fallback.

---

### Feature 5.7 — Report & Block

**Goal:** table-stakes safety. Flag a listing or user; block someone from messaging you;
a minimal moderation queue.

**Data:** `Report`, `Block` (§3.6), `User.isModerator` (§3.1).

**Server:** `src/lib/actions/safety.ts`:
- `reportListing({ listingId, reason, detail? })` and
  `reportUser({ reportedUserId, reason, detail? })` — session user is reporter;
  Zod-validate `reason ∈ {SPAM,PROHIBITED,HARASSMENT,SCAM,OTHER}`; prevent
  self-reporting; cap duplicate open reports (one open report per reporter per target).
- `blockUser(blockedId)` / `unblockUser(blockedId)` — session user is blocker; upsert/delete
  the `Block`; can't block yourself.
- **Enforcement** (the part that matters): in `conversations.ts`:
  - `startConversation` and `submitClaim`: if a `Block` exists in **either direction**
    between the two users, refuse with a neutral "This conversation isn't available."
  - `sendMessage`: same check before writing — a block stops new messages both ways.
  - **Hide blocked users' content from the blocker:** in `buildListingWhere`
    (Feature 5.1), exclude listings whose owner the current user has blocked. (Pass the
    viewer id into the where-builder.)
- `src/lib/actions/moderation.ts`:
  - `listOpenReports()` / `resolveReport(id, status)` — **moderator-only** (check
    `user.isModerator`; non-mods get a generic not-authorized result). On `ACTIONED`,
    optionally set the reported listing to `DELETED`.

**UI:**
- **Overflow menu** (an `IconButton` "⋯") on listing detail and on profile pages →
  opens a `Sheet` with "Report" and (on profiles) "Block / Unblock."
- Report `Sheet`: reason radio list + optional detail textarea + submit; success `Toast`
  ("Thanks — our team will take a look"). Never reveal moderation outcomes to reporters
  beyond a generic confirmation.
- Block: confirm in the sheet; on success, `Toast` "You won't hear from them again" and
  hide their message CTAs.
- **`/moderation`** page, visible only to moderators (link only rendered when
  `isModerator`): a queue of open reports with target preview and resolve actions. Plain,
  utilitarian, same design tokens.

**Acceptance:**
- [ ] Any user can report a listing or another user with a reason; self-report blocked.
- [ ] Blocking prevents new conversations and messages in **both** directions.
- [ ] A blocked user's listings disappear from the blocker's browse/search.
- [ ] Non-moderators cannot list or resolve reports (server-enforced, not just hidden UI).
- [ ] Moderators see open reports and can dismiss/action them; actioning can remove a
      listing.

**Files:** `src/lib/actions/safety.ts` (new), `src/lib/actions/moderation.ts` (new),
`src/components/ReportSheet.tsx`, `src/components/OverflowMenu.tsx` (new clients),
`src/app/(app)/moderation/page.tsx` (new), enforcement edits in
`src/lib/actions/conversations.ts` and `src/lib/search.ts`.

---

### Feature 5.8 — Safer Meetups (Map, Share, Calendar)

**Goal:** make the already-good meetup-proposal flow feel safe and effortless. Build on
`MEETUP_SPOTS`; don't invent a maps dependency.

**Honest constraint:** we have no per-listing geolocation and no maps API budget. So
"map" = a curated, illustrated **campus safe-spots picker**, not a live map. This is the
right scope and still feels premium.

**Data:** enrich `MEETUP_SPOTS` in `constants.ts` from `string[]` to objects:
```ts
export const MEETUP_SPOTS = [
  { id: "tuc", name: "TUC main entrance", blurb: "Busy, staffed, cameras", lat: 39.1310, lng: -84.5169 },
  // ...the rest, with short safety blurbs and approx coords for a static map link
] as const;
```
Keep a `MEETUP_SPOT_NAMES` derived array so existing Zod `z.enum(MEETUP_SPOTS)` usage
(which expects strings) is migrated to `z.enum(MEETUP_SPOT_NAMES)`. **Audit every
reference** to `MEETUP_SPOTS` and update to `.name`/`MEETUP_SPOT_NAMES`.

**Server:** mostly unchanged. The meetup proposal already stores `{ spot, datetime }` in
`Message.meta`. Add a tiny pure helper `src/lib/calendar.ts → toIcs(meetup)` that builds
an RFC-5545 `.ics` string (no deps) for "add to calendar."

**UI:**
- **Spot picker** in the propose-meetup UI: cards for each safe spot with its safety
  blurb and a small static illustration/pin (an inline SVG or a static OpenStreetMap
  image link using the coords — pick the SVG to avoid third-party calls). Selecting sets
  the spot.
- On an **accepted** meetup message: an **"Add to calendar"** action that downloads the
  `.ics` (via a `data:` URL or a tiny route `GET /api/meetups/[messageId]/ics`,
  participant-authorized), and a **"Share with a friend"** action that copies a safety
  blurb + spot + time to the clipboard ("Meeting <name> at <spot> at <time> — check on
  me!"). No external share API; clipboard + `navigator.share` when available.
- A persistent one-line **safety note** in every thread: "Meet at a busy campus spot in
  daylight. Never share your dorm or financial info." Quiet, faint, dismissible per
  session.

**Acceptance:**
- [ ] The spot picker shows curated safe spots with blurbs; selection flows into the
      existing proposal action unchanged.
- [ ] An accepted meetup offers a working `.ics` download that opens in a calendar app.
- [ ] "Share with a friend" copies/share-sheets a safety message; works on mobile.
- [ ] All existing meetup propose/accept/decline logic still passes.
- [ ] Every old `MEETUP_SPOTS` string reference is migrated with no type errors.

**Files:** `src/lib/constants.ts` (enrich spots), `src/lib/calendar.ts` (new),
`src/app/api/meetups/[messageId]/ics/route.ts` (new, optional),
meetup UI in `Thread.tsx` / its proposal components, `src/lib/validation.ts` (enum source).

---

### Feature 5.9 — Move-Out Mode

**Goal:** a signature, campus-native seasonal flow: bulk-list everything at semester's
end, and surface a "free pile" near dorms. The feature that makes this app *theirs*.

**Data:** `Listing.moveoutBatchId` (§3.2). No new model — a batch is just listings
sharing an id.

**Server:** `src/lib/actions/moveout.ts`:
- `createMoveoutBatch(items)` — accept an array (cap ~15) of lightweight item inputs
  `{ title, category, condition?, price? | free, photos? }`. Generate one `moveoutBatchId`
  (cuid), create all listings in a single `$transaction`, owner = session user. `free`
  items become `type: "DONATE"`. Run saved-search matching per created listing (post-commit).
- `getMoveoutBatch(batchId)` — public read of the batch's active listings (for a shareable
  "my move-out sale" page).

**UI:**
- **`/sell/moveout`** — a streamlined repeatable form: add row after row (title, quick
  category, price or a "Free" toggle, optional photo), see a running count, submit all at
  once. Same wizard tokens; optimized for speed (keyboard-friendly, no per-item page).
- A **"Free pile"** filter/segment on browse donations (or a `/browse?tab=donations&free`
  view) highlighting DONATE items, with an optional `locationNote` near-dorm hint.
- A **batch page** `/moveout/[batchId]` rendering the seller's whole move-out set as one
  shareable grid ("Alex's move-out sale — 9 items"), each linking to its listing.
- Entry points: a seasonal **"Moving out?"** card on `/sell` and in the user menu.
  (Optional: only feature it prominently in late Nov / Apr–May via a date check — keep
  the route always available.)

**Acceptance:**
- [ ] A student can post 10 items in one flow in well under two minutes.
- [ ] "Free" items are created as DONATE with no price.
- [ ] The batch page shows exactly that batch's active items and is shareable.
- [ ] Bulk-posted items appear in browse and trigger saved-search matches.
- [ ] One failed item validation doesn't silently drop the rest — validate up front,
      report row-level errors, commit all-or-nothing.

**Files:** `src/lib/actions/moveout.ts` (new), `src/app/(app)/sell/moveout/page.tsx` +
`MoveoutForm.tsx` (new), `src/app/(app)/moveout/[batchId]/page.tsx` (new),
browse donations "free" segment in `BrowseFilters.tsx`/`page.tsx`,
`src/lib/validation.ts` (batch schema).

---

### Feature 5.10 — Leveled-Up Impact & Badges

**Goal:** make sustainability social and reward good behavior, building on the existing
`getImpactCount`. Light gamification, zero clutter.

**Data:** none new — badges are **computed** from existing rows (don't store what you can
derive). Add `src/lib/badges.ts` with pure functions over a user's data.

**Server:** `src/lib/badges.ts`:
- `getUserStats(userId)` → `{ itemsRehomed, itemsSaved (bought 2nd-hand), donations,
   foundReturned, avgRating, ratingCount, avgFirstReplyMins }`.
  - `avgFirstReplyMins`: median minutes between a thread's first inbound message and the
    owner's first reply (from `Message.createdAt`). Bound the query; approximate is fine.
- `computeBadges(stats)` → array of earned badges from a fixed catalog:
  - **Trusted Trader** — ≥5 ratings, avg ≥ 4.5.
  - **Quick Replier** — avgFirstReplyMins ≤ 30 over ≥3 threads.
  - **Good Samaritan** — ≥1 found item returned (RESOLVED FOUND they posted).
  - **Sustainability Star** — ≥10 items rehomed (SOLD+DONATE).
  - **Generous** — ≥5 donations completed.
  - Each badge: `{ key, label, earned, progress }` so locked ones show a progress hint.
- Campus-wide stats for `/impact`: total items diverted (exists), plus totals for
  donations and found-returns, and a simple "this semester" count (filter by date).

**UI:**
- **Profile** (`/profile/[id]`): a quiet row of earned **badge chips** (use `Badge`
  tones, ink/neutral — not red) under the name, plus avg rating (already there). Locked
  badges only show on **your own** profile, with a faint progress line ("3/5 to Trusted
  Trader").
- **`/impact`**: keep the campus headline number; add a personal panel ("You've kept N
  items in use, made M donations") and the badge shelf. Add a tasteful **campus-wide
  badge leaderboard-lite**: top categories or a "X items rehomed this semester" stat —
  social proof, not a competitive ranking (keep it calm).
- Badge earned → fire a `notify` (kind `RATING`/custom) the first time? Optional; if
  included, de-dupe so a badge notifies once. Prefer surfacing on profile silently for V2.

**Acceptance:**
- [ ] Badges compute purely from existing data; no new tables, no double-counting.
- [ ] Earned badges show on profiles; locked badges with progress show only to the owner.
- [ ] `/impact` shows personal + campus stats consistent with `getImpactCount`.
- [ ] Stats queries are bounded and don't slow the profile/impact pages noticeably.

**Files:** `src/lib/badges.ts` (new), `src/app/(app)/profile/[id]/page.tsx` (extend),
`src/app/(app)/impact/page.tsx` (extend), `src/components/BadgeShelf.tsx` (new).

---

### Feature 5.11 — Smart Price Suggestions

**Goal:** while posting a SELL item, suggest a fair price from similar past listings.
Removes the hardest part of selling: "what do I charge?"

**Data:** none new — derive from historical `Listing` rows.

**Server:** `src/lib/actions/pricing.ts`:
- `suggestPrice({ category, title })` — query recent SELL listings in the same category
  (optionally title-keyword overlap), status in `ACTIVE/SOLD`, with a non-null price,
  `take` ~50, last ~180 days. Return `{ count, median, p25, p75 }` (compute in app code).
  If too few comparables (`count < 3`), return `{ count }` only — **never fabricate** a
  suggestion from thin data; say "not enough recent data yet."
- Pure stats helper `src/lib/stats.ts → quantiles(nums)` (no deps).

**UI (`SellWizard.tsx`, price step):**
- When the user reaches the price step with a category chosen, call `suggestPrice` and
  show a quiet helper under the price input: **"Similar items recently: $X–$Y (median
  $Z)"** with a one-tap **"Use $Z"** ghost button. If insufficient data, show
  "Not enough recent data — price it your way." Never block submission.
- Keep it a suggestion, never a default value silently filled. Calm, faint, dismissible.

**Acceptance:**
- [ ] On the SELL price step, a range + median appears when ≥3 comparables exist.
- [ ] "Use $Z" fills the price; the user can still override.
- [ ] With <3 comparables, a neutral "not enough data" message shows; posting still works.
- [ ] Suggestions exclude the user's own draft and DELETED listings.
- [ ] No regression to the existing sell flow timing (suggestion is non-blocking).

**Files:** `src/lib/actions/pricing.ts` (new), `src/lib/stats.ts` (new),
`src/app/(app)/sell/SellWizard.tsx` (price step).

---

## 6. Seed & Demo Updates

Extend `prisma/seed.ts` so the demo account shows V2 off with zero manual setup:
- Give `demo@mail.uc.edu` 2–3 **favorites**, one **saved search** with `notify`, and a
  history that earns at least one **badge** (e.g., ≥5 ratings averaging high, a completed
  donation).
- Seed one **WANTED** ad and a small **move-out batch** under another persona so browse's
  new tabs aren't empty.
- Seed a couple of **notifications** for the demo user (a saved-search hit + a message)
  so the bell shows a number on first load.
- Leave the second persona (`professor@`) clean for exploration, per its current role.

Update `docs/DEMO_SCRIPT.md` with a short V2 path: search → save it → favorite an item →
open notifications → post via move-out → see a price suggestion → report/block demo.

---

## 7. Security & Quality Bar (applies to every feature)

- **Authorization everywhere.** Every new server action/route loads the session user and
  checks ownership/participation/role before writing. Notifications, favorites, saved
  searches, reports, blocks, moderation, SSE, ICS, batch reads — each verifies the actor.
  Re-derive the V1 audit's IDOR checklist against every new `[id]` route.
- **Validate at the boundary.** Add a Zod schema in `validation.ts` for every new input;
  never trust client-supplied ids for the actor or for ownership.
- **No new injection surface.** Stay on Prisma's parameterized API (no `$queryRaw`).
  Render only through JSX (no `dangerouslySetInnerHTML`). Notification `body` and report
  `detail` are plain text.
- **Secrets stay out of `public/` and out of git.** Honor §2.4 (rotate, relocate, gate
  demo-login to non-prod).
- **Don't leak.** Reports are not visible to reportees; favoriter lists are never exposed;
  moderation is role-gated server-side, not just hidden in the UI.
- **Performance hygiene.** Bound every new query (`take`), add the indexes in §3, and
  keep matching/notification work post-commit and best-effort.
- **Types & build.** `npm run typecheck` clean. `npm run build` green. No `any` outside
  the existing `as never` card-mapping pattern.

---

## 8. Build Order (dependency-correct)

1. **Schema** (§3) + `db push` on both providers.
2. **Backbone**: `notify.ts`, email mirror, wire existing actions (§4).
3. **Shared UI primitives**: `Sheet`, `IconButton`, `Toast`, `Toggle` (§1.3).
4. **Search refactor** + `search.ts` (5.1) — other features depend on `buildListingWhere`.
5. **Want ads** (5.3) — touches constants/validation many features read.
6. **Favorites** (5.4) and **Saved searches** (5.2) — both need notify + search.
7. **Notifications center** (5.5) — surfaces the backbone.
8. **Near-real-time chat** (5.6).
9. **Report & block** (5.7) — enforcement hooks into conversations + search.
10. **Safer meetups** (5.8) — constants migration; audit all `MEETUP_SPOTS` refs.
11. **Move-out mode** (5.9).
12. **Impact & badges** (5.10) and **Price suggestions** (5.11).
13. **Seed + demo** (§6).
14. **Full verification** (§9).

Commit after each numbered step with a focused message; keep PRs reviewable.

---

## 9. Verification Checklist (the build isn't done until all pass)

**Automated:**
- [ ] `npm run typecheck` — zero errors.
- [ ] `npm run build` — green with a SQLite `DATABASE_URL`.
- [ ] `npm run build` — green with a Postgres `DATABASE_URL` (provider flips via
      `db:prepare`).
- [ ] `npm run db:seed` — populates V1 + V2 demo data without error.

**Manual (run the app, two browser profiles for two users):**
- [ ] Search/filter: type-ahead, pills, condition, sort, shareable URL, want-ads tab.
- [ ] Save a search as user A; post a matching listing as user B → A gets a
      notification + (logged) email.
- [ ] Favorite as A; B drops the price → A notified once; B marks sold → A notified.
- [ ] Notifications center: counts, routing, mark-all-read, message coalescing.
- [ ] Chat: A and B message live (~1–2s via SSE); kill SSE → still works via polling;
      optimistic send no-dupe; "Seen" appears.
- [ ] Report a listing; block B as A → B can't start/continue a conversation, B's
      listings vanish from A's browse; moderator sees the report and can action it;
      non-moderator is refused server-side.
- [ ] Propose a meetup with the spot picker; accept; download a working `.ics`; share.
- [ ] Move-out: post 8 items (some free) in one flow; batch page shows them; they're in
      browse.
- [ ] Impact/badges: profile shows earned badges; own profile shows locked progress;
      `/impact` personal + campus stats correct.
- [ ] Price step shows a range/median with ≥3 comparables and a graceful message without.
- [ ] V1 regression: onboarding, magic-link gate (UC-only), demo-login (now non-prod
      gated), listing CRUD with ownership, claims, ratings — all unchanged.

**Security spot-checks:**
- [ ] Hit every new `[id]` route as a non-owner/non-participant → 404/refused.
- [ ] Call moderation actions as a non-moderator → refused server-side.
- [ ] Confirm no secret is reachable under `/` (no `public/**/.env`), demo-login 404s
      when `VERCEL_ENV=production`.

---

## 10. Explicitly Out of Scope for V2 (YAGNI)

To keep the release focused and the UI calm, **do not** build these now:
- Real maps/geolocation, distance sorting, or per-listing coordinates.
- A WebSocket server, push notifications, or a background job/cron worker.
- Per-kind email preference matrix (single opt-out boolean only).
- Payments, escrow, or in-app transactions.
- Public user-to-user following/social graph beyond saved searches & favorites.
- An admin dashboard beyond the minimal moderation queue.
- Image moderation/AI categorization.

If a feature above tempts scope creep, cut it to its acceptance criteria and ship.

---

*End of V2 build prompt. Build top-to-bottom, verify §9, keep it calm.*
