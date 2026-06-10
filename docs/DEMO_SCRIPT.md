# Showcase walkthrough — 5 minutes, every feature

**Before you start:** run `npm run db:seed` once (locally, with `.env`
pointing at the production database) to reset the demo stage. This restores
the unread messages, the pending meetup proposal, the pending lost & found
claim, and the open rating prompt. Do this after every practice run.

**Sign in:** https://2ndtime-around.vercel.app/demo → password
`Bearcats2026!` → you're **Alex Demo**, a junior in IT.

---

### 1. Trust: UC-only access (30s)

Before signing in, show `/signin`: type a `gmail.com` address — friendly
inline rejection. The same rule is enforced server-side (the form is a
courtesy, the auth callback is the gate). Then sign in via `/demo`.

*Talking point: every account maps to a verified UC email — the .edu domain
**is** the identity check.*

### 2. Browse & search (45s)

Land on **Browse**. Walk the three tabs: **Marketplace · Donations ·
Lost & Found**.

- Search `textbook`, then filter category **Textbooks**, sort by price.
- Donations tab: everything free, same categories.
- Lost & Found tab: flip the **Lost / Found** chips; cards show *where*
  and *when*.

*Talking point: filters live in the URL — any filtered view is shareable.*

### 3. Messages: meetup proposal (45s)

Open **Messages** (note the unread badge). Open the thread with **Maya C.**
about the headphones — the listing is pinned on top for context. Maya
proposed a meetup: **Langsam Library lobby**, with a time.

→ Tap **Accept**. The card flips to "Meetup confirmed — see you there!"

*Talking point: coordination never leaves the platform, and the five
suggested spots are well-lit, staffed campus locations.*

### 4. Lost & found claim — the signature flow (60s)

Back to **Messages** → thread with **Sam N.** about the **gray knit
beanie** you found. Sam filed an ownership claim describing a paint stain
and a torn tag — a detail only the real owner would know.

→ Tap **Approve claim**. Two things happen instantly: the item is marked
**Resolved**, and both parties see the contact-exchange confirmation.

Show the listing itself afterward — status badge now "Resolved".

*Talking point: this is a challenge–response ownership protocol; the
physical lost & found office can't do this at 11pm.*

### 5. Ratings (30s)

Open the thread with **Jordan R.** (the sold microwave). A one-tap rating
prompt sits at the top — tap stars, optional comment, **Rate**. Then open
Jordan's profile (or your own via the avatar menu) to show ratings received
and the average.

*Talking point: ratings unlock only after a completed exchange between the
two people who actually messaged — enforced by a database constraint.*

### 6. Post an item (45s)

Tap **Post item**. Walk the wizard: choose **Sell** → add a photo (or skip)
→ details with inline validation (leave the price empty to show the error)
→ review → **Publish**. It appears in Browse immediately. Mention
**Save as draft** → show the Drafts tab in **My items** (the skateboard).

### 7. My items + sustainability close (45s)

**My items**: Active / Sold & Resolved / Drafts tabs, view counts, quick
actions (Edit, Sold, Delete-with-confirm — destructive actions always
confirm).

Finish on the footer counter — "**N items kept out of landfills**" — click
it to open **Campus impact**: this semester vs all time, reuse by category.
The beanie you resolved in step 4 counts as a recovery, not reuse —
the counting method is explained on the page.

*Closing line: one trusted place to buy, sell, donate, and recover — and
every exchange keeps something out of a dumpster at move-out.*

---

## If something goes sideways

- **Used up the claim/meetup during practice?** `npm run db:seed` resets
  everything to this exact stage.
- **Signed out accidentally?** `/demo` + password gets you back in seconds.
- **Want a second account live** (to show both sides of a chat)? Sign in
  with any seeded student via magic link locally, or use two browsers —
  the other side of every staged thread is a real account.
