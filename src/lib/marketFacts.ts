/**
 * External, citable figures used on the public landing page.
 *
 * These exist because the landing page previously sized the opportunity with
 * our OWN seeded pilot data, which reads as traction and does not survive a
 * follow-up question. Every number here is somebody else's published figure,
 * carries its source, and is rendered with a visible link so a reader can
 * check it.
 *
 * RULE: nothing goes in this file that we cannot link to. If a figure can't be
 * sourced, it doesn't belong on the page. Our own activity numbers live in
 * `impact.ts` and must always be labelled as pilot data.
 */

export type MarketFact = {
  value: string;
  label: string;
  source: string;
  href: string;
};

export const MARKET_FACTS: MarketFact[] = [
  {
    value: "53,682",
    label: "students at UC — the university's largest enrollment on record",
    source: "UC, Fall 2025",
    href: "https://www.uc.edu/news/articles/2025/09/another-record-year-of-enrollment-for-the-university-of-cincinnati.html",
  },
  {
    value: "$341",
    label: "average annual spend per student on course materials alone",
    source: "NACS Student Watch, 2024–25",
    href: "https://www.nacs.org/student-watch-report-course-materials-spending-stable",
  },
  {
    // The sharpest figure we have, because it is UC's own public scorecard and
    // can be opened live in the room. Framed as a gap, never as a criticism:
    // UC is Gold-rated and #8 greenest in the country, and STARS still scores
    // minimisation separately from diversion — which is exactly the space this
    // product occupies.
    value: "2.31 / 8",
    label:
      "points UC earns for waste minimization in its own sustainability report — while rated Gold overall",
    source: "AASHE STARS, 2023",
    href: "https://reports.aashe.org/institutions/university-of-cincinnati-oh/report/2023-03-03/",
  },
];

/**
 * UC's sustainability standing. This exists so the STARS gap above reads as an
 * opportunity rather than an attack: the university is demonstrably good at
 * this, which is the whole reason the remaining gap is worth funding.
 */
export const UC_STANDING = {
  greenRank: "#8",
  greenRankBody:
    "greenest college in the United States, and #1 in Ohio (Princeton Review, 2026)",
  greenRankHref:
    "https://www.uc.edu/news/articles/2025/10/the-princeton-review-ranks-uc-among-the-top-greenest-college-campuses.html",
};

/**
 * UC's own move-out program — the wedge. The university and eight partners
 * already fund a downstream answer to this problem (dumpsters and a donation
 * drop-off on McMillan). We are the upstream half.
 */
export const UC_DIVERSION = {
  /** Inclusive window, as published by UC. Update both when UC announces. */
  start: "2026-07-24",
  end: "2026-08-02",
  /** Dateless label, so the copy stays true after the window closes. */
  windowLabel: "July 24 – August 2",
  location: "121 E McMillan Street",
  partners: 8,
  // Why the window is where it is: UC and Keep Cincinnati Beautiful both
  // describe Uptown leases ending around July 31, which empties the
  // neighbourhood in a single week.
  leaseEnd: "July 31",
  href: "https://www.uc.edu/about/admin-finance/planning-design-construction/sustainability/get-involved/events-&-programming/uptown-waste-diversion.html",
};

/**
 * Is UC's diversion window open today?
 *
 * The landing copy claimed "Right now — July 24 – August 2, 2026". That is a
 * dated factual claim on a public page, and it goes false the moment the
 * window closes — days after it shipped, and embarrassingly so a year later.
 * The page now asks this and picks its wording, so the claim can never outlive
 * the fact.
 *
 * Compared on calendar dates (UTC midnight boundaries) — the window is a
 * published range of days, not an instant, so timezone precision is noise.
 */
export function isDiversionWindowOpen(now: Date): boolean {
  const day = now.toISOString().slice(0, 10);
  return day >= UC_DIVERSION.start && day <= UC_DIVERSION.end;
}
