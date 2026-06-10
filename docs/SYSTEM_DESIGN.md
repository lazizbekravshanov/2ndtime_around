# System Design: 2nd Time Around

### A campus marketplace for the University of Cincinnati, modeled on Facebook Marketplace

**Team 4 — IT2021 · University of Cincinnati**

This document describes the system design of 2nd Time Around: what we borrow
from Facebook Marketplace, what we deliberately do differently because we
serve one campus instead of the planet, and the product category taxonomy
designed around how UC students actually buy, sell, and lose things.

---

## 1. Problem & goals

UC students currently trade through Facebook Marketplace (full of non-students,
scams, far-away buyers), GroupMe class chats (unsearchable, items vanish in
scroll), bulletin boards, and a physical lost & found office with limited
hours. The goals:

1. **Trust by default** — every account belongs to a verified UC student.
2. **One searchable place** — all campus listings, donations, and lost & found.
3. **Coordination stays in-app** — messaging plus suggested safe meetup spots.
4. **Recovery** — digital lost & found with an ownership-claim protocol.
5. **Sustainability** — measure and celebrate items kept out of landfills.

### Scale assumptions (and why they shape everything)

| Metric | Facebook Marketplace | 2nd Time Around (UC) |
| --- | --- | --- |
| Potential users | ~1B+ | ~53,000 students |
| Realistic MAU | hundreds of millions | ~5,000–10,000 (10–20%) |
| Active listings | hundreds of millions | ~2,000–5,000 |
| Peak traffic | continuous, global | **bursty**: move-in (Aug), move-out (Apr–May), semester starts, finals |
| Geography | worldwide, shipping | one square mile; everything is "local pickup" |
| Discovery | ML-ranked personalized feed | recency + filters is genuinely enough |
| Payments | Checkout, shipping, escrow | cash/Venmo in person — out of scope on purpose |

The honest design insight: **at campus scale, most of Facebook Marketplace's
hard problems disappear**. No ML ranking infrastructure, no sharded fan-out,
no payment escrow. What remains — and what FB *can't* do — is identity
(.edu verification), physical safety (campus meetup spots), lost & found,
and a sustainability story. Those are our differentiators, so the
architecture spends its complexity budget there.

---

## 2. Product categories

Facebook Marketplace's taxonomy (Vehicles, Property Rentals, Home Goods,
Pet Supplies, …) is built for households. A campus taxonomy should mirror a
student's life instead. Two-level design: **top-level categories** for the
filter bar (must stay scannable on a phone), with **subcategories** used as
search keywords/chips rather than deep navigation — depth kills mobile UX.

### 2.1 Marketplace & Donations categories

| # | Category | Subcategories | UC-specific notes |
| --- | --- | --- | --- |
| 1 | **Textbooks & Course Materials** | By college: A&S, Lindner (Business), CEAS (Engineering), DAAP, CCM, CAHS/Nursing, Law, Medicine; study guides; lab kits; iClickers | Highest-velocity category; resale price anchors to bookstore price. Listing field: course code (e.g. MATH 1061) for search |
| 2 | **Electronics** | Laptops & tablets; monitors; calculators (TI-84 economy!); audio & headphones; gaming; chargers & cables; phones | Calculators and monitors dominate; "works/condition" honesty matters most here |
| 3 | **Furniture** | Desks & chairs; futons & sofas; shelving; tables; bed frames & mattress toppers | Peaks violently at move-out; "you haul" is the default |
| 4 | **Dorm & Apartment Essentials** | Mini fridges & microwaves; storage & organizers; lighting; decor & posters; bedding (Twin XL!); fans & heaters | Twin XL is its own economy; mini fridges are the classic dorm hand-me-down |
| 5 | **Kitchen & Appliances** | Cookware; small appliances (kettles, air fryers); dishes & utensils | Splits from Dorm Essentials because apartment dwellers shop differently |
| 6 | **Clothing & Accessories** | UC / Bearcats gear; men's; women's; shoes; winter wear; bags & backpacks; jewelry & watches | Bearcats spirit wear and Cincinnati-winter gear are the campus staples |
| 7 | **Tickets & Events** | Bearcats athletics; concerts (incl. CCM performances); campus events; MainStreet/local venues | Policy: face value or below — anti-scalping keeps it student-friendly |
| 8 | **Bikes & Transit** | Bikes; e-scooters & skateboards; helmets & locks; parts | Uphill campus = real demand; serial-number field nudges against stolen-bike resale |
| 9 | **Sports & Fitness** | Gym equipment; intramural & club gear; outdoor & camping; game-day tailgate gear | CRC culture; cornhole boards every fall |
| 10 | **School & Office Supplies** | Backpacks; desk supplies; planners; whiteboards | Cheap, high-volume, perfect for Donations |
| 11 | **Music & Instruments** | Instruments; amps & accessories; sheet music | CCM (the conservatory) makes this disproportionately large at UC |
| 12 | **Art & Design Supplies** | Drafting tools; markers & paint; portfolios; fabric & materials; 3D-printing filament | DAAP students burn through expensive supplies every studio cycle |
| 13 | **Other** | Everything else | Catch-all; review periodically — if a subcategory grows, promote it |

Notes on mechanics:

- **"Free" is not a category.** Donations are a listing *type* (the Donations
  tab) that reuses the same categories — matching how our data model already
  works, and avoiding FB's "Free Stuff" ghetto where donated items get buried.
- **Lost & Found uses the same category list** for filtering (a lost TI-84 is
  Electronics) plus location and date fields — the categories double as a
  recognition vocabulary.
- **Future, policy-gated categories** (not in MVP): *Sublets & Roommates*
  (huge demand, but housing listings need different fields, fraud checks, and
  fair-housing care) and *Services & Gigs* (tutoring, moving help — academic
  integrity and liability review first).

### 2.2 Prohibited items (campus-specific trust & safety)

Standard marketplace bans (weapons, drugs, counterfeits, recalled goods) plus
campus-specific ones:

- **Completed coursework, exam banks, paper-writing** — academic integrity
- **Alcohol, vapes, fake IDs** — campus policy and law
- **Bearcat Card / meal-plan transfers, dorm keys/fobs** — university property
- **Prescription items** (including ADHD medication — a real campus problem)
- **Live animals** (dorm policy; rehoming pointed to proper channels)

Enforcement path at MVP scale: a Report button on every listing feeding a
moderation queue + keyword flagging at listing creation. Human review is
viable when the campus produces tens of reports a week, not millions.

---

## 3. High-level architecture

### 3.1 What Facebook Marketplace runs (simplified)

```
Clients → Edge/CDN → API Gateway → [Listing svc | Search svc (inverted index)
| ML Ranking & Recs | Messaging (Messenger infra) | Payments/Shipping
| Trust&Safety ML | Ads] → sharded MySQL/TAO graph + blob CDN + data pipelines
```

Thousands of services, ML at every layer, regional sharding — justified by a
billion users and a feed that must *guess* what you want.

### 3.2 What a campus needs (what we built)

A **modular monolith** with the same conceptual services as in-process
modules. At 10k MAU, this is not a compromise — it's the correct design:
one deploy, one database, transactional integrity for free, and each module
can be extracted later if a real bottleneck appears.

```
                ┌─────────────────────────────────────────────┐
   Student      │                Vercel (iad1)                │
   (mobile-     │  ┌───────────────────────────────────────┐  │
   first web)   │  │        Next.js App (monolith)         │  │
      │         │  │                                       │  │
      ├ HTTPS ──┼─▶│  Identity ── NextAuth, .edu allowlist │  │
      │         │  │  Listings ── CRUD, categories, status │  │
   CDN/static ◀─┼──│  Discovery ─ search, filters, tabs    │  │
   (Next.js     │  │  Messaging ─ threads, meetups, claims │  │
    assets)     │  │  Trust ───── ratings, claims, reports │  │
                │  │  Impact ──── sustainability counters  │  │
                │  └───────┬──────────────┬────────────────┘  │
                └──────────┼──────────────┼───────────────────┘
                           │              │
                ┌──────────▼───────┐  ┌───▼──────────────┐
                │ Postgres (Neon)  │  │ Vercel Blob      │
                │ users, listings, │  │ listing photos   │
                │ convos, messages,│  └──────────────────┘
                │ ratings, tokens  │      ┌──────────────┐
                └──────────────────┘      │ Email (SMTP) │
                                          │ magic links, │
                                          │ notifications│
                                          └──────────────┘
```

**Module responsibilities** (mirroring FB Marketplace's service split):

| Module | FB Marketplace equivalent | Campus implementation |
| --- | --- | --- |
| Identity & Verification | FB account graph + Marketplace profile | NextAuth email magic links; **the `@uc.edu` domain *is* the verification** — no ID upload, no ML fake-account detection needed |
| Listings | Listing service + media pipeline | CRUD via server actions, Zod-validated; photos to Blob storage; statuses DRAFT→ACTIVE→SOLD/RESOLVED/DELETED |
| Discovery | Inverted index + ML ranking | Postgres queries: tab (type) → category → price range → text `contains`, newest-first. Upgrade path: Postgres FTS (`tsvector`), then Meilisearch — only if search feels slow, which it won't below ~50k listings |
| Messaging | Messenger integration | Threads keyed (listing, starter); 5s polling. Structured message kinds: `TEXT`, `MEETUP_PROPOSAL` (spot + time + accept/decline), `CLAIM` (detail + approve/deny). Upgrade path: SSE → WebSockets |
| Trust & Safety | ML fraud detection, human review at scale | Ratings (unique per buyer×listing), L&F claim protocol, safe-spot suggestions, report queue. Campus scale makes *human* review the primary tool |
| Impact | (none — FB has nothing like it) | Counters over completed sales+donations; semester-aware stats |

### 3.3 Key flows

**Listing creation** — wizard (type → photos → details → review) → photos
upload to Blob (interface-abstracted; local disk in dev) → server action
re-validates with Zod → row insert → cache revalidation. One transaction, no
queues; FB needs async media pipelines and ML policy scoring here, we don't.

**Discovery** — RSC renders Browse server-side from indexed Postgres queries
(`(type, status, category, createdAt)` composite index). Filters live in the
URL, so every filtered view is shareable and back-button-safe.

**Trade coordination** — "Message seller" finds-or-creates the thread
(unique `(listingId, starterId)`); meetup proposal is a structured message;
acceptance is in-thread state, no calendar service.

**Lost & found claim (our most distinctive flow)** —
claimant describes a detail only the owner would know → `CLAIM` message →
finder approves/denies → on approval: listing → RESOLVED + contact exchange
shown to both sides. This is a *challenge–response ownership protocol* over
the messaging rails — FB Marketplace has no equivalent.

**Ratings** — unlocked only when a listing is SOLD/RESOLVED *and* the rater
shares a conversation with the other party; enforced by a DB unique
constraint, not just UI.

---

## 4. Data model

```
User ──< Listing ──< Conversation >── User (starter)
  │         │             │
  │         │             └──< Message (kind: TEXT | MEETUP_PROPOSAL | CLAIM,
  │         │                           meta JSON for proposal/claim state)
  │         └──< Rating >── User
  └── identity tables (NextAuth: Account, Session, VerificationToken)

Listing: type SELL|DONATE|LOST|FOUND · status DRAFT|ACTIVE|SOLD|RESOLVED|DELETED
         category · condition? · price? · locationNote? · photos JSON · viewCount
Indexes: (type, status, category, createdAt) · (ownerId) · (conversationId, createdAt)
Constraints: unique (listingId, starterId) · unique (fromUserId, listingId)
```

The 13 top-level categories from section 2 ship as a validated string enum
(cheap, type-safe; one list drives the Zod schema, the browse filter, and
the sell wizard). The taxonomy maps to a
`Category(id, name, parentId?, sortOrder)` table when subcategories and
per-category fields (course code, bike serial) arrive.

---

## 5. Non-functional design

- **Mobile-first**: the primary session is a phone between classes; bottom
  tab navigation, card grids, one-question-per-screen posting.
- **Privacy**: emails are never shown publicly (display names only) until a
  mutually-accepted exchange (claim approval) intentionally reveals contact.
- **Security**: every mutation re-validates (Zod) and re-authorizes
  (ownership/participant checks) server-side; uploads are auth-gated and
  type/size-limited; domain gate enforced in the auth callback, not the form.
- **Burst readiness**: move-in week traffic is maybe 10× baseline — trivially
  absorbed by serverless compute + pooled Postgres; the design's real burst
  concern is *content quality* (duplicate spam at move-out), a moderation
  problem rather than a capacity one.
- **Availability**: campus-tool SLO, not five-nines. The one flow that must
  never silently fail is sign-in email delivery.

## 6. Growth path (in honest order)

1. **Notifications** — email digest for unread messages; then web push.
2. **Saved searches & favorites** — "tell me when a Twin XL futon appears."
3. **Category table + per-category fields** — course codes, bike serials.
4. **Real-time messaging** — SSE first; WebSockets only if SSE feels laggy.
5. **Search upgrade** — Postgres FTS with typo tolerance via `pg_trgm`.
6. **Multi-campus** — tenant table (campus, allowed domains, meetup spots);
   the `.edu`-domain verification model generalizes to any university.
7. **Auto-expiry** — cron marks 60-day-stale listings for renewal, keeping
   the marketplace fresh (FB's relisting nag, minus the dark patterns).
