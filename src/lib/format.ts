/** "$25" or "$25.50" — whole dollars stay clean. */
export function formatPrice(price: number): string {
  return Number.isInteger(price)
    ? `$${price.toLocaleString("en-US")}`
    : `$${price.toFixed(2)}`;
}

/**
 * The listing card's price line.
 *
 * Always returns something. The slot is the first line of every card body, so
 * a card that rendered nothing there would break the row's rhythm — and on the
 * Lost & Found tab, where no listing has a price, a grid of blank lines would
 * read as a rendering bug rather than an absent price.
 *
 * `muted` marks the values that aren't money, so the card can render them at
 * the same size without giving a type label the visual weight of a price.
 */
export function priceSlot(
  type: string,
  price: number | null
): { text: string; muted: boolean } {
  if (type === "DONATE") return { text: "Free", muted: false };
  if (type === "LOST") return { text: "Lost", muted: true };
  if (type === "FOUND") return { text: "Found", muted: true };
  if (type === "WANTED") return { text: "Looking for", muted: true };
  // A sale without a price shouldn't exist — validation requires one — so this
  // is a defensive fallback rather than a state we expect to render.
  return price === null
    ? { text: "—", muted: true }
    : { text: formatPrice(price), muted: false };
}

/** Compact relative time: "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(date: Date | string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "September 2025" — for member-since lines. */
export function monthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** "Sat, Apr 12 at 3:30 PM" — for meetup proposals. */
export function meetupTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} at ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

/** Parse the photos Json column into a string array, defensively. */
export function photoList(photos: unknown): string[] {
  if (Array.isArray(photos)) return photos.filter((p) => typeof p === "string");
  if (typeof photos === "string") {
    try {
      const parsed = JSON.parse(photos);
      return Array.isArray(parsed)
        ? parsed.filter((p) => typeof p === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}
