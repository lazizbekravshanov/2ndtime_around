/**
 * Runs once at server startup (Next.js instrumentation hook). Fail fast with
 * a clear message when a production deployment is missing required env —
 * a misconfigured NEXTAUTH_SECRET otherwise surfaces as cryptic JWT errors
 * deep in the first sign-in attempt.
 */
export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET");
  if (!process.env.NEXTAUTH_URL) missing.push("NEXTAUTH_URL");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? "s" : ""}: ` +
        `${missing.join(", ")}. See the "env vars" table in README.md.`
    );
  }

  if (!process.env.DEMO_PASSWORD) {
    // Not fatal — demo sign-in simply stays disabled — but say so plainly.
    console.warn(
      "DEMO_PASSWORD is not set: /signin persona login is disabled."
    );
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Not fatal — rate limiting degrades to per-instance in-memory limiting.
    console.warn(
      "[startup] Upstash not configured — rate limiting will use the in-memory (per-instance) adapter. " +
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed limiting."
    );
  }

  if (!process.env.EMAIL_SERVER) {
    // Not fatal — real sign-ups simply stay off (the /signin form hides
    // itself); demo login remains available if configured.
    console.warn(
      "[startup] EMAIL_SERVER not set — real magic-link sign-up is disabled. " +
        "Set EMAIL_SERVER and EMAIL_FROM to enable it."
    );
  }
}
