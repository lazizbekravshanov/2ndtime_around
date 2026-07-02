export const LISTING_TYPES = [
  "SELL",
  "DONATE",
  "LOST",
  "FOUND",
  "WANTED",
] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

// DRAFT extends the spec's status set so unfinished posts can live in
// My Items → Drafts without appearing in Browse.
export const LISTING_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SOLD",
  "RESOLVED",
  "DELETED",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

// Campus-life taxonomy — see docs/SYSTEM_DESIGN.md §2 for the full design
// (subcategories, UC-specific rationale, prohibited items).
export const CATEGORIES = [
  "Textbooks & Course Materials",
  "Electronics",
  "Furniture",
  "Dorm & Apartment Essentials",
  "Kitchen & Appliances",
  "Clothing & Accessories",
  "Tickets & Events",
  "Bikes & Transit",
  "Sports & Fitness",
  "School & Office Supplies",
  "Music & Instruments",
  "Art & Design Supplies",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS = [
  "New",
  "Like new",
  "Good",
  "Fair",
  "Well loved",
] as const;
export type Condition = (typeof CONDITIONS)[number];

// Suggested safe on-campus meetup spots — well-lit, staffed, high-traffic.
// Coords are approximate, used only to render a static pin/illustration.
export const MEETUP_SPOTS = [
  {
    name: "TUC main entrance",
    walk: "Center of campus",
    blurb: "Busy, staffed, cameras",
    lat: 39.131,
    lng: -84.5169,
  },
  {
    name: "Langsam Library lobby",
    walk: "~4 min walk from TUC",
    blurb: "Open late, security desk",
    lat: 39.1318,
    lng: -84.5159,
  },
  {
    name: "CRC front desk",
    walk: "~5 min walk from TUC",
    blurb: "Staffed, high-traffic",
    lat: 39.1297,
    lng: -84.5142,
  },
  {
    name: "MarketPointe entrance",
    walk: "~6 min walk from TUC",
    blurb: "Dining hall, always busy",
    lat: 39.1284,
    lng: -84.5151,
  },
  {
    name: "Steger Student Life Center",
    walk: "~2 min walk from TUC",
    blurb: "Central, well-lit",
    lat: 39.1305,
    lng: -84.5163,
  },
] as const;
export type MeetupSpot = (typeof MEETUP_SPOTS)[number];

/** Just the spot names — for Zod enums and select options. */
export const MEETUP_SPOT_NAMES = MEETUP_SPOTS.map((s) => s.name) as [
  string,
  ...string[],
];

export const ALLOWED_EMAIL_DOMAINS = ["uc.edu", "mail.uc.edu"] as const;

export function isUcEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  return ALLOWED_EMAIL_DOMAINS.some((d) => domain === d);
}

export const TYPE_LABELS: Record<ListingType, string> = {
  SELL: "For sale",
  DONATE: "Donation",
  LOST: "Lost item",
  FOUND: "Found item",
  WANTED: "Looking for",
};

export const MAX_PHOTOS = 4;

// Showcase personas — the only sign-in path while the platform is in
// demo mode. All share DEMO_PASSWORD; the endpoint rejects any email
// not on this list.
export const DEMO_ACCOUNTS = [
  {
    email: "demo@mail.uc.edu",
    name: "Alex Demo",
    role: "Demo student — staged with messages, a claim, and listings",
  },
  {
    email: "professor@mail.uc.edu",
    name: "Professor",
    role: "Reviewer — clean account, explore freely",
  },
] as const;
