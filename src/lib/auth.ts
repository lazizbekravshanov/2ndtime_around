import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import { db } from "@/lib/db";
import { isUcEmail } from "@/lib/constants";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "2nd Time Around <no-reply@localhost>",
      maxAge: 60 * 60, // magic links valid for 1 hour
      async sendVerificationRequest({ identifier, url, provider }) {
        // Without an SMTP server configured (local dev), print the magic
        // link to the server console instead of sending real email.
        if (!process.env.EMAIL_SERVER) {
          console.log(
            `\n──────────────────────────────────────────────\n` +
              `  Magic sign-in link for ${identifier}:\n  ${url}\n` +
              `──────────────────────────────────────────────\n`
          );
          return;
        }
        const { createTransport } = await import("nodemailer");
        const transport = createTransport(process.env.EMAIL_SERVER);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "Sign in to 2nd Time Around",
          text: `Sign in to 2nd Time Around:\n\n${url}\n\nThis link expires in 1 hour. If you didn't request it, you can ignore this email.`,
        });
      },
    }),
  ],
  callbacks: {
    // Hard server-side gate: only UC email addresses may sign in,
    // regardless of what the client form allowed.
    async signIn({ user }) {
      return user.email ? isUcEmail(user.email) : false;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.displayName =
        (user as { displayName?: string | null }).displayName ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/sent",
    error: "/signin",
  },
};
