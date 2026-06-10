import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { DEMO_EMAIL } from "@/lib/constants";
import { db } from "@/lib/db";

const bodySchema = z.object({ password: z.string().min(1) });

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Showcase sign-in: creates a real database session for the demo account,
 * using the same Session table NextAuth reads, so everything downstream
 * (auth guards, sign-out) behaves identically to a magic-link session.
 * Disabled entirely unless DEMO_PASSWORD is configured.
 */
export async function POST(request: Request) {
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword) {
    return NextResponse.json({ error: "Demo sign-in is disabled." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the demo password." }, { status: 400 });
  }
  if (!safeEqual(parsed.data.password, demoPassword)) {
    return NextResponse.json(
      { error: "That demo password isn't right." },
      { status: 401 }
    );
  }

  const user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    return NextResponse.json(
      { error: "Demo account not found — run the seed script first." },
      { status: 500 }
    );
  }

  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  // NextAuth v4 prefixes the cookie with __Secure- on HTTPS origins.
  const secure = (process.env.NEXTAUTH_URL ?? "").startsWith("https");
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    secure ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    sessionToken,
    { httpOnly: true, sameSite: "lax", secure, expires, path: "/" }
  );
  return response;
}
