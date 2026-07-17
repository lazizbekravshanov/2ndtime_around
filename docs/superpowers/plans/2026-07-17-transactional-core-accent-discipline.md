# Transactional-Core Accent-Discipline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the minimal design pass's "accent means one thing" rule to the five signed-in transactional surfaces by removing accent from data/decoration and adopting the shared pill primitive.

**Architecture:** Presentation-only Tailwind class edits across five existing files. No new files, no schema, no behavior change. Each task is one surface; verification is grep-based (the offending class is gone), plus typecheck + build green, plus in-app visual check for the two interactive surfaces.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`), TypeScript.

## Global Constraints

- **Accent means one thing:** `--color-accent` (UC Red) is ONLY for buttons, active/selected states, and StatusBadge. Never data-viz or decoration. Data signals use bold ink (`text-ink` / `bg-ink`).
- **Presentation-only:** no schema, data-model, or behavior changes. `aria-*`, `onClick`, and handler logic stay identical.
- **Do NOT touch the "Explicitly unchanged" sites** listed in the spec (`docs/superpowers/specs/2026-07-17-transactional-core-accent-discipline-design.md`): messages unread-count badge, thread safety `AlertIcon`, selected-state accents, active-tab underlines, accent error text, bordered rows/cards.
- **Verification tooling:** `npm run typecheck`, `npm run build`, `npm test`, and `grep` for class assertions. (Confirm exact script names against `package.json` in Task 1 Step 1.)
- Commit messages use `refactor:` (presentation change, no behavior delta).

---

### Task 1: Sell wizard — progress bar off accent

**Files:**
- Modify: `src/app/(app)/sell/SellWizard.tsx:87`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Confirm verification script names**

Run: `cat package.json | grep -A20 '"scripts"'`
Expected: see the names for typecheck / build / test. Use those exact names wherever this plan writes `npm run typecheck`, `npm run build`, `npm test`.

- [ ] **Step 2: Write the failing grep assertion**

Run: `grep -n 'i <= step ? "bg-accent"' "src/app/(app)/sell/SellWizard.tsx"`
Expected: MATCHES line 87 (the accent-on-data violation is present). This is the "red" state — the class we intend to remove still exists.

- [ ] **Step 3: Make the edit**

In `src/app/(app)/sell/SellWizard.tsx`, the `ProgressBar` component's segment span (line 87) currently reads:

```tsx
className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`}
```

Change the completed-segment fill from accent to ink:

```tsx
className={`h-1 rounded-full ${i <= step ? "bg-ink" : "bg-line"}`}
```

Leave the incomplete state (`bg-line`), the `h-1 rounded-full` shape, and the surrounding `<ol>`/`aria-current` markup exactly as-is.

- [ ] **Step 4: Run the grep assertion (now green)**

Run: `grep -n 'i <= step ? "bg-accent"' "src/app/(app)/sell/SellWizard.tsx"`
Expected: NO MATCH (violation removed).
Run: `grep -n 'i <= step ? "bg-ink"' "src/app/(app)/sell/SellWizard.tsx"`
Expected: MATCHES line 87 (ink fill in place).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/sell/SellWizard.tsx"
git commit -m "refactor: sell-wizard progress bar fills with ink, not accent"
```

---

### Task 2: Message thread — pins off accent + adopt the pill primitive

**Files:**
- Modify: `src/app/(app)/messages/[conversationId]/Thread.tsx` (lines 87, 595, and the quick-slot buttons around 610–625)

**Interfaces:**
- Consumes: `chipClasses` from `src/components/ui/Chip.tsx` — signature `chipClasses(state?: "default" | "active"): string`. `"active"` renders `border-ink bg-ink text-white`; `"default"` renders `border-line bg-surface text-faint hover:border-faint/40 hover:text-ink`. Base includes `h-8 ... rounded-full border px-3 text-sm font-medium`.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Write the failing grep assertions**

Run: `grep -n 'PinIcon className="h-3.5 w-3.5 text-accent"\|PinIcon className="h-3.5 w-3.5 shrink-0 text-accent"' "src/app/(app)/messages/[conversationId]/Thread.tsx"`
Expected: MATCHES two lines (87 and 595 — the decorative-accent pins).
Run: `grep -n 'rounded-full border px-3 py-1.5 text-xs font-medium' "src/app/(app)/messages/[conversationId]/Thread.tsx"`
Expected: MATCHES the quick-slot button (~line 616 — the hand-rolled pill).

- [ ] **Step 2: Confirm `chipClasses` is not yet imported**

Run: `grep -n 'chipClasses' "src/app/(app)/messages/[conversationId]/Thread.tsx"`
Expected: NO MATCH (import will be added in Step 4).

- [ ] **Step 3: Recolor the two decorative pin icons**

At line 87, change:

```tsx
<PinIcon className="h-3.5 w-3.5 text-accent" />
```
to:
```tsx
<PinIcon className="h-3.5 w-3.5 text-faint" />
```

At line 595, change:

```tsx
<PinIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
```
to:
```tsx
<PinIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
```

Do NOT touch the `AlertIcon ... text-accent` at line 515 (safety warning — kept per spec).

- [ ] **Step 4: Add the `chipClasses` import**

Find the existing UI-component import block near the top of the file and add:

```tsx
import { chipClasses } from "@/components/ui/Chip";
```

(Match the project's `@/` alias style already used in the file's other imports.)

- [ ] **Step 5: Swap the hand-rolled quick-slot pill for `chipClasses`**

The quick-slot button (around lines 610–625) currently reads:

```tsx
<button
  key={slot.value}
  type="button"
  aria-pressed={meetupTimeValue === slot.value}
  onClick={() => setMeetupTimeValue(slot.value)}
  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    meetupTimeValue === slot.value
      ? "border-ink bg-ink text-white"
      : "border-line bg-surface text-faint hover:text-ink"
  }`}
>
  {slot.label}
</button>
```

Replace the `className` expression with a `chipClasses` call, keeping `key`, `type`, `aria-pressed`, `onClick`, and the label unchanged:

```tsx
<button
  key={slot.value}
  type="button"
  aria-pressed={meetupTimeValue === slot.value}
  onClick={() => setMeetupTimeValue(slot.value)}
  className={chipClasses(meetupTimeValue === slot.value ? "active" : "default")}
>
  {slot.label}
</button>
```

Note: this intentionally normalizes the pill from `text-xs`/`py-1.5` to the shared `h-8 text-sm` — the point of the one-pill primitive.

- [ ] **Step 6: Run the grep assertions (now green)**

Run: `grep -n 'text-accent' "src/app/(app)/messages/[conversationId]/Thread.tsx"`
Expected: the ONLY remaining matches are the safety `AlertIcon` (line ~515) and the accent error text (`role="alert"`, line ~555). The two `PinIcon` matches are gone.
Run: `grep -n 'rounded-full border px-3 py-1.5 text-xs font-medium' "src/app/(app)/messages/[conversationId]/Thread.tsx"`
Expected: NO MATCH (hand-rolled pill replaced).
Run: `grep -n 'chipClasses' "src/app/(app)/messages/[conversationId]/Thread.tsx"`
Expected: MATCHES the import line and the button usage.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/messages/[conversationId]/Thread.tsx"
git commit -m "refactor: thread pins use ink; quick-slots adopt the shared pill"
```

---

### Task 3: Notifications — unread dot to ink

**Files:**
- Modify: `src/app/(app)/notifications/NotificationRow.tsx:66`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Write the failing grep assertion**

Run: `grep -n 'h-2 w-2 shrink-0 rounded-full bg-accent' "src/app/(app)/notifications/NotificationRow.tsx"`
Expected: MATCHES line 66 (accent unread dot present).

- [ ] **Step 2: Make the edit**

At line 66, change:

```tsx
<span className="h-2 w-2 shrink-0 rounded-full bg-accent">
```
to:
```tsx
<span className="h-2 w-2 shrink-0 rounded-full bg-ink">
```

Leave the nested `<span className="sr-only">Unread</span>` and everything else unchanged.

- [ ] **Step 3: Run the grep assertion (now green)**

Run: `grep -n 'rounded-full bg-accent' "src/app/(app)/notifications/NotificationRow.tsx"`
Expected: NO MATCH.
Run: `grep -n 'rounded-full bg-ink' "src/app/(app)/notifications/NotificationRow.tsx"`
Expected: MATCHES line 66.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/notifications/NotificationRow.tsx"
git commit -m "refactor: notification unread dot reads ink, not accent"
```

---

### Task 4: Move-out heading — typography consistency

**Files:**
- Modify: `src/app/(app)/sell/moveout/page.tsx:17`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Write the failing grep assertion**

Run: `grep -n 'text-2xl font-semibold">Move-out mode' "src/app/(app)/sell/moveout/page.tsx"`
Expected: MATCHES line 17 (missing `tracking-tight`).

- [ ] **Step 2: Make the edit**

At line 17, change:

```tsx
<h1 className="mt-3 text-2xl font-semibold">Move-out mode</h1>
```
to:
```tsx
<h1 className="mt-3 text-2xl font-semibold tracking-tight">Move-out mode</h1>
```

- [ ] **Step 3: Run the grep assertion (now green)**

Run: `grep -n 'text-2xl font-semibold tracking-tight">Move-out mode' "src/app/(app)/sell/moveout/page.tsx"`
Expected: MATCHES line 17.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/sell/moveout/page.tsx"
git commit -m "refactor: move-out heading matches app-wide title tracking"
```

---

### Task 5: Full verification — build, tests, and in-app check

**Files:**
- No source changes. Verification only.

**Interfaces:**
- Consumes: the edits from Tasks 1–4.
- Produces: confidence that the "Definition of done" in the spec is met.

- [ ] **Step 1: Typecheck + full build**

Run: `npm run typecheck && npm run build`
Expected: both PASS with no errors.

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: PASS (no new failures — no tests target these presentation files, so the suite should be unchanged/green).

- [ ] **Step 3: Confirm no stray accent remains on the five surfaces**

Run:
```bash
grep -rn "accent" \
  "src/app/(app)/sell/" \
  "src/app/(app)/messages/" \
  "src/app/(app)/my-items/" \
  "src/app/(app)/saved/" \
  "src/app/(app)/notifications/" \
  --include="*.tsx"
```
Expected: EVERY remaining match is one of the documented "Explicitly unchanged" sites — messages unread-count badge (`messages/page.tsx`), thread safety `AlertIcon` + accent error text (`Thread.tsx`), sell-wizard selected-option card + accent error text (`SellWizard.tsx`), thread selected toggle (`Thread.tsx:664`), active-tab underlines (`my-items/page.tsx`, `saved/page.tsx`), move-out form error text + `accent-[var(--color-ink)]` checkbox (`MoveoutForm.tsx`), and the `ItemRowActions.tsx` code comment. NO accent on a progress bar, plain pin icon, unread dot, or hand-rolled pill.

- [ ] **Step 4: In-app visual verification (sell wizard)**

Start the dev server (`npm run dev`), sign in (demo persona), and open `/sell`. Step through the wizard.
Expected: the step-progress bar fills **ink/black**, not red, for completed steps.

- [ ] **Step 5: In-app visual verification (thread + notifications)**

With the dev server running: open a conversation that has a meetup proposal (`/messages/...`), and open `/notifications` with at least one unread item.
Expected: meetup pin icons render **faint grey** (not red); the meetup quick-time chips render as the standard `h-8` ink-on-white pills matching browse's chips; the notifications unread dot renders **ink/black** (not red). The unread-**count** badge in the messages list is still red (correct — unchanged).

- [ ] **Step 6: Final confirmation**

Confirm: all four surface commits are present (`git log --oneline -5`), working tree is clean (`git status`), and the "Definition of done" checklist in the spec is satisfied. No further commit needed for this task (verification-only).
