/**
 * Same-origin callback-URL validation for the sign-in flow.
 *
 * A `callbackUrl` is only ever a *relative* path within this app. Accepting an
 * absolute URL (or a protocol-relative `//host`) would turn sign-in into an
 * open redirect, so we require a single leading slash and reject anything that
 * could carry a scheme or host.
 */

/** True when `value` is a safe same-origin relative path. */
export function isSafeCallbackUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  // Must be root-relative: exactly one leading slash.
  if (value[0] !== "/") return false;
  // Reject protocol-relative ("//host") and backslash tricks ("/\host", which
  // some browsers normalize to "//host").
  if (value[1] === "/" || value[1] === "\\") return false;
  // No scheme anywhere.
  if (value.includes("://")) return false;
  // No control/whitespace/backslash characters: they could smuggle a host or
  // get normalized into one. Normal query chars (? = & #) are all above 0x20,
  // so this leaves valid filtered/paginated browse URLs intact.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f || code === 0x5c) return false;
  }
  return true;
}

/** Returns `value` if it is a safe callback path, else the fallback. */
export function safeCallbackUrl(value: unknown, fallback = "/browse"): string {
  return isSafeCallbackUrl(value) ? value : fallback;
}
