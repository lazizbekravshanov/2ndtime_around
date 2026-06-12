import { db } from "@/lib/db";

/**
 * Single entry point for notifications. Writes the in-app row and fires a
 * best-effort email. NEVER call this inside a Prisma $transaction that gates a
 * user action — call it after the transaction commits, and never await its
 * result inside a request the user is waiting on (use `void notify(...)`).
 */
export type NotifyKind =
  | "MESSAGE"
  | "CLAIM"
  | "MEETUP"
  | "RATING"
  | "SAVED_SEARCH_HIT"
  | "PRICE_DROP"
  | "FAVORITE_SOLD"
  | "REPORT_RESOLVED";

type NotifyInput = {
  userId: string; // recipient
  kind: NotifyKind;
  title: string;
  body?: string;
  href: string; // internal path
  /** Coalesce with an existing unread notification of the same kind+href. */
  dedupe?: boolean;
};

export async function notify(input: NotifyInput): Promise<void> {
  const { userId, kind, title, body, href, dedupe } = input;

  if (dedupe) {
    const existing = await db.notification.findFirst({
      where: { userId, kind, href, readAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      await db.notification.update({
        where: { id: existing.id },
        data: { title, body: body ?? null, createdAt: new Date() },
      });
      void sendNotificationEmail({ userId, title, body, href }).catch(() => {});
      return;
    }
  }

  await db.notification.create({
    data: { userId, kind, title, body: body ?? null, href },
  });
  void sendNotificationEmail({ userId, title, body, href }).catch(() => {});
}

/** Best-effort email mirror — logs to console when no SMTP is configured. */
async function sendNotificationEmail(args: {
  userId: string;
  title: string;
  body?: string;
  href: string;
}): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: args.userId },
    select: { email: true, emailOptOut: true },
  });
  if (!user?.email || user.emailOptOut) return;

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${base}${args.href}`;
  const text = `${args.body ? `${args.body}\n\n` : ""}${link}`;

  if (!process.env.EMAIL_SERVER) {
    console.log(`\n[notify] ${user.email}: ${args.title}\n  ${link}\n`);
    return;
  }

  const { createTransport } = await import("nodemailer");
  const transport = createTransport(process.env.EMAIL_SERVER);
  await transport.sendMail({
    to: user.email,
    from: process.env.EMAIL_FROM ?? "2nd Time Around <no-reply@localhost>",
    subject: args.title,
    text,
  });
}
