# HCI / UX Report — 2nd Time Around

**Team 4 · IT2021 · University of Cincinnati**
A usability evaluation of the *2nd Time Around* campus marketplace, the
problems it surfaced, and the changes we made — each tied to an established
HCI principle.

---

## 1. Purpose & method

This document records how we evaluated *2nd Time Around* against recognized
usability and accessibility standards, what we found, and how we fixed it. The
goal is not "the app looks nice" — it's to show **deliberate application of HCI
principles**, with each change traceable to a named heuristic and a measurable
or observable improvement.

**Frameworks used**

- **Nielsen's 10 Usability Heuristics** — visibility of system status, match
  with the real world, user control & freedom, consistency & standards, error
  prevention, recognition over recall, flexibility, aesthetic & minimalist
  design, error recovery, help.
- **WCAG 2.1** (Web Content Accessibility Guidelines) — concrete, testable
  success criteria for contrast, keyboard access, focus, target size, etc.
- **Fitts's Law & Hick's Law** — predictive models for target acquisition
  (how big/near a control must be) and choice complexity (how many options a
  screen should present at once).
- **WAI-ARIA Authoring Practices** — correct keyboard semantics for custom
  widgets.

**Process.** We ran a *heuristic evaluation*: walking each screen as different
personas (buyer, seller, finder, moderator) on both desktop and a phone
viewport, cataloguing every violation with its location, the principle it
breaks, and a severity rating (Nielsen's 0–4 scale, where 4 = usability
catastrophe). We then implemented fixes and re-verified, including an
automated check on the live deployment that the page produced no
runtime/accessibility console errors.

---

## 2. What was already done well (baseline)

Good HCI is not only fixing mistakes — it's recognizing sound decisions and
keeping them. The starting design already got several things right, and we
preserved them:

- **Skeleton loaders sized to real content** prevent layout shift (CLS) on
  load — better than spinners for perceived performance.
- **Empty states always offer a next action** (e.g. "Nothing saved yet → Browse
  items") — no dead ends (Nielsen #1, #9).
- **Optimistic UI with graceful revert** on favorites and message send — the
  interface responds instantly and rolls back on failure.
- **URL-driven filters** make filtered views shareable and the browser Back
  button work — respects user control (Nielsen #3).
- **Focus-trapped, Escape-to-close modals** (`Sheet`) — correct dialog hygiene.
- **Safety-forward microcopy** in chat ("Meet at a busy campus spot in
  daylight…") — match between system and the real world (Nielsen #2).
- **Step progress indicator** in the sell wizard with `aria-current="step"` —
  visibility of where you are in a flow.

---

## 3. Findings & fixes

Grouped by the principle each addresses. Severity is Nielsen's 0–4 scale.

### 3.1 Accessibility (WCAG)

| # | Mistake | Principle | Fix | Sev |
|---|---------|-----------|-----|-----|
| A1 | Tap targets 8–36px on a phone-first app (favorite heart, carousel arrows & dots, icon buttons, photo-remove) | **WCAG 2.5.5 Target Size · Fitts's Law** | Standardized interactive controls to a ≥44px hit area; for tiny visuals (carousel dots) the dot stays small but the *tap target* is padded to 44px | 4 |
| A2 | Single near-black focus outline was invisible on the red primary button and dark message bubbles | **WCAG 2.4.7 / 2.4.11 Focus Visible/Appearance** | Two-tone focus ring (light gap + ink outline) that contrasts on any background; uses `outline` so it survives `overflow-hidden` cards | 4 |
| A3 | Secondary text (`#78716c`) and `/70`-opacity placeholders failed contrast | **WCAG 1.4.3 Contrast** | Darkened `--color-faint` to ~7:1; removed sub-opacity on placeholder text | 2 |
| A4 | No reduced-motion support — skeleton pulse & hover transforms ran regardless of OS setting | **WCAG 2.3.3 Animation from Interactions** | `@media (prefers-reduced-motion: reduce)` disables animations/transitions/smooth-scroll | 2 |
| A5 | Whole chat transcript marked `aria-live` → screen readers re-announced everything on each update | **WCAG 4.1.3 Status Messages** | Scoped a dedicated live region that announces only the newest *incoming* message | 4 |
| A6 | Required form fields had no programmatic indication | **WCAG 3.3.2 Labels/Instructions** | `aria-required` on every required field in the Sell wizard **and** the Edit form | 3 |
| A7 | Custom radio groups (persona picker, star rating, meetup-spot picker) had no arrow-key navigation and every option was a tab stop | **WAI-ARIA 4.1.2 · radiogroup pattern** | Roving `tabIndex` + Arrow-key selection; only the selected option is tabbable | 2 |
| A8 | Header Saved/Notifications icons were removed from tab order (`tabIndex={-1}`); Notifications was buried in a menu on mobile | **WCAG 2.1.1 Keyboard** | Made them real focusable links; surfaced **Notifications in the mobile bottom nav** with its unread dot | 3 |
| A9 | No way to skip the header nav with a keyboard | **WCAG 2.4.1 Bypass Blocks** | Added a "Skip to content" link (hidden until focused) jumping to `#main-content` | 2 |
| A10 | React hydration mismatch on timestamps (server UTC vs client local TZ) threw console errors | **Robustness / 4.1.1** | `suppressHydrationWarning` on the three client-rendered time nodes | 1 |

### 3.2 Visibility of system status & feedback (Nielsen #1)

| # | Mistake | Principle | Fix | Sev |
|---|---------|-----------|-----|-----|
| F1 | One toast channel for everything; errors used the same low-priority region and a **green check icon** | **Nielsen #1 · WCAG 4.1.3** | Split into assertive (error) vs polite (success) live regions; errors get a distinct alert icon and longer dwell time; all toasts dismissable | 3 |
| F2 | Listing status (sold/resolved) didn't update in an open chat without a reload | **Nielsen #1 Visibility of system status** | Wired the live status into the thread; a notice appears when the item is marked sold/resolved | 2 |

### 3.3 User control & freedom (Nielsen #3)

| # | Mistake | Principle | Fix | Sev |
|---|---------|-----------|-----|-----|
| U1 | Removing a saved item was irreversible | **Nielsen #3 — support undo** | "Removed — **Undo**" action on the favorite toast | 3 |

### 3.4 Error prevention (Nielsen #5)

| # | Mistake | Principle | Fix | Sev |
|---|---------|-----------|-----|-----|
| E1 | **Blocking a user fired on one tap** (severs all conversations), while Delete required confirmation — the more consequential action was *less* protected | **Nielsen #5 Error Prevention · #4 Consistency** | Two-step inline confirmation on Block, matching Delete | 3 |
| E2 | The multi-step Sell wizard lost all input on refresh/close with no warning | **Nielsen #5 Error Prevention** | `beforeunload` warning while there's unsaved in-progress work | 3 |
| E3 | A meetup could be proposed in the past | **Nielsen #5 · #2 real-world match** | `min` on the datetime input + a client future-time check (mirrors the server) | 3 |
| E4 | The **Edit Listing form had no client-side validation** — problems only surfaced after a server round-trip, unlike every other form | **Nielsen #5 · #4 Consistency** | Added a `zodResolver` schema (parity with the Sell wizard); the server still re-validates | 2 |
| E5 | Message composer had no length cap (server limit 2000) | **Nielsen #5** | `maxLength` on the input matching the server | 1 |

### 3.5 Consistency & standards (Nielsen #4)

| # | Mistake | Principle | Fix | Sev |
|---|---------|-----------|-----|-----|
| C1 | Two delete flows used different copy ("Delete?/Yes/No" vs "Delete for good?/Yes, delete/Cancel") | **Nielsen #4 Consistency** | Standardized to one wording everywhere | 1 |
| C2 | A broken Unicode combining character (`⃠`) and a raw text "✕" were used as icons, rendering inconsistently across platforms | **Nielsen #4 · aesthetic consistency** | Replaced with proper SVG icons from the icon set (`BanIcon`, `XIcon`) | 2 |

### 3.6 Choice complexity & mobile layout (Hick's & Fitts's Laws)

| # | Mistake | Principle | Fix | Sev |
|---|---------|-----------|-----|-----|
| H1 | Browse packed several `w-auto` `<select>`s in a cramped row on mobile | **Fitts's Law · Hick's Law** | Filters stack into comfortable full-width targets on phones, collapse inline on desktop | 2 |

---

## 4. Decisions we made *not* to change (and why)

Critical judgment includes knowing when a perceived issue is actually correct.

- **`ListingCard` thumbnail uses `alt=""`** (WCAG 1.1.1). A naïve "fix" would add
  the listing title as alt text — but the title already appears as visible text
  right beside the image. A descriptive alt would make a screen reader announce
  the title **twice**. An empty alt correctly marks the thumbnail as decorative.
  We evaluated it, confirmed it's right, and kept it. (By contrast, the
  full-size `PhotoCarousel` image *does* get descriptive alt — "photo 2 of 4" —
  because there it carries information the user can't otherwise get.)

This contrast — decorative vs informative images treated differently — is
itself an application of WCAG 1.1.1, not an oversight.

---

## 5. Evidence (before / after)

- The README's **v1 → v2 comparison** section shows before/after screenshots of
  Browse and Listing detail.
- The full screenshot gallery (landing, browse, listing, chat threads, sell
  wizard, moderation, etc.) reflects the post-improvement UI.
- The improvements are **live** at <https://2ndtime-around.vercel.app> — the
  focus ring (tab through the page), the Undo toast (un-save a favorite), the
  mobile bottom nav, and the keyboard-navigable radio groups can all be
  exercised directly.
- Post-deploy verification confirmed **zero hydration/accessibility console
  errors** on the chat and notifications pages.

---

## 6. What we learned

1. **Phone-first is a measurable constraint, not a vibe.** "Looks fine on my
   laptop" hid 8px tap targets that are unusable with a thumb. Fitts's Law and
   WCAG 2.5.5 turn "feels small" into "must be ≥44px," which is actionable.
2. **Accessibility and good UX are the same thing.** Every WCAG fix above also
   made the app better for sighted mouse users — a visible focus ring, readable
   secondary text, an undo, a skip link.
3. **Consistency is invisible until it breaks.** Two different delete dialogs and
   one form lacking validation didn't look broken in isolation; the heuristic
   walkthrough is what surfaced them.
4. **The most dangerous action should be the most protected.** We had it
   backwards — Delete was confirmed, Block (which severs relationships) wasn't.
5. **Know when not to "fix" something.** The `alt=""` decision shows that
   applying a principle correctly sometimes means leaving code alone — and being
   able to explain why.

---

*Prepared as the HCI/UX deliverable for IT2021. All findings were implemented
and deployed to production; see commit history for the per-change diffs.*
