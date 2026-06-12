# Showcase walkthrough — 5 minutes, every feature

**Before you start:** run `npm run db:seed` once (locally, with `.env`
pointing at the production database) to reset the demo stage. This restores
the unread messages, the pending meetup proposal, the pending lost & found
claim, and the open rating prompt. Do this after every practice run.

**Sign in:** https://2ndtime-around.vercel.app/signin → pick **Alex Demo**
→ password `Bearcats2026!`. (The **Professor** persona is a clean account —
hand it to your reviewer so they can explore on their own device while you
present.)

---

### 1. Trust: UC-only by design (30s)

Show the persona picker and explain the posture: the platform is in demo
mode, open registration deliberately switched off. The real flow — UC email
magic links with the `@uc.edu` domain gate enforced server-side in the auth
callback — is implemented and shown in the design doc; flipping it on is an
env var, not a rebuild.

*Talking point: every account maps to a UC email — the .edu domain **is**
the identity check. Demo mode just pre-creates the accounts.*

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

## V2 walkthrough — the killer features (3 minutes)

Run after the core demo, still signed in as **Alex Demo**.

1. **Instant search + filters.** On **Browse**, type in the search box — results
   update as you type. Add a category and condition; watch the dismissible
   filter pills appear and the result count update. Everything lives in the URL.
2. **Save the search.** With filters active, tap **Save this search** → name it,
   keep notify on. Open the user menu → **Saved** to see it under *Searches*.
3. **Favorites.** Tap the heart on any card (or on a listing page). Open
   **Saved → Items** to see your watchlist. Price drops and sold items notify you.
4. **Notifications.** The bell shows a dot — open **Notifications** to see the
   seeded saved-search hit and message, grouped by day. Tap one to jump to it.
5. **Want ad.** Browse → **Wanted** tab shows the "Looking for a mini fridge"
   post. From a seller's view the CTA reads **I have this**.
6. **Real-time chat.** Open the unread thread; in a second browser (or as the
   other persona) send a message — it appears in ~1–2s with a **Seen** marker.
   Propose a meetup with the spot picker, accept it, then **Add to calendar**.
7. **Move-out mode.** **Post item → Moving out? Post in bulk** → add a few rows,
   mark one **Free**, post. You land on the shareable move-out sale page.
8. **Price suggestion.** Start a normal **Sell** listing; on the price step,
   pick a category with history (e.g. Electronics) and see the suggested range.
9. **Trust & safety.** On a listing, open the **⋯** menu → **Report**. On a
   profile, **Block**. Then sign in as **Professor** (a moderator) and open
   **Moderation** to action the seeded report.
10. **Badges & impact.** Your profile shows the **Good Samaritan** badge (from a
    returned found item); **Campus impact** adds a personal panel with progress
    toward the rest.

---

## If something goes sideways

- **Used up the claim/meetup during practice?** `npm run db:seed` resets
  everything to this exact stage.
- **Signed out accidentally?** `/demo` + password gets you back in seconds.
- **Want a second account live** (to show both sides of a chat)? Sign in
  with any seeded student via magic link locally, or use two browsers —
  the other side of every staged thread is a real account.
