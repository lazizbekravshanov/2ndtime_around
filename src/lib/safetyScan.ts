// Heuristics for surfacing an off-platform safety nudge on a message. This
// never blocks a message — it only decides whether to show a warning banner.

// Named payment services (with or without a domain), e.g. "Venmo", "pay me on
// paypal", "cashapp.com/$x", "zelle".
const PAYMENT =
  /\b(venmo|pay\s?pal|cash\s?app|zelle|apple\s?pay|google\s?pay)\b/i;
const PAYMENT_URL = /(venmo|paypal|cashapp|cash\.app|zelle)\.[a-z]{2,}/i;

// Loose North-American phone number: optional country code, area code, 7 more
// digits with common separators.
const PHONE = /(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;

/**
 * True if a message body mentions an off-platform payment service or includes
 * what looks like a phone number — the signals worth a "meet in person first"
 * reminder.
 */
export function hasContactOrPaymentRisk(body: string): boolean {
  return PAYMENT.test(body) || PAYMENT_URL.test(body) || PHONE.test(body);
}
