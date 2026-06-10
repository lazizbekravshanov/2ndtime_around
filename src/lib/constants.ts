export const LISTING_TYPES = ["SELL", "DONATE", "LOST", "FOUND"] as const;
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
export const MEETUP_SPOTS = [
  "TUC main entrance",
  "Langsam Library lobby",
  "CRC front desk",
  "MarketPointe entrance",
  "Steger Student Life Center",
] as const;
export type MeetupSpot = (typeof MEETUP_SPOTS)[number];

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
