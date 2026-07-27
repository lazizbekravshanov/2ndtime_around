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
    value: "113 tons",
    label: "diverted from landfill at a single peer campus in one move-out",
    source: "Boston University, 2024",
    href: "https://www.bu.edu/articles/2026/donate-unwanted-goods-move-out/",
  },
];

/**
 * UC's own move-out program — the wedge. The university and eight partners
 * already fund a downstream answer to this problem (dumpsters and a donation
 * drop-off on McMillan). We are the upstream half.
 */
export const UC_DIVERSION = {
  window: "July 24 – August 2, 2026",
  location: "121 E McMillan Street",
  partners: 8,
  href: "https://www.uc.edu/about/admin-finance/planning-design-construction/sustainability/get-involved/events-&-programming/uptown-waste-diversion.html",
};
