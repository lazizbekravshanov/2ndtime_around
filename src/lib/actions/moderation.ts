"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { notify } from "@/lib/notify";
import type { ActionResult } from "@/lib/actions/listings";

async function requireModerator() {
  const user = await getSessionUser();
  if (!user) return null;
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { isModerator: true },
  });
  return row?.isModerator ? user : null;
}

export type OpenReport = {
  id: string;
  reason: string;
  detail: string | null;
  status: string;
  createdAt: Date;
  reporter: { displayName: string | null };
  listing: { id: string; title: string } | null;
  reportedUserId: string | null;
};

/** Moderator-only: list open reports for the queue. */
export async function listOpenReports(): Promise<OpenReport[]> {
  const mod = await requireModerator();
  if (!mod) return [];
  return db.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reporter: { select: { displayName: true } },
      listing: { select: { id: true, title: true } },
    },
  });
}

const resolveSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["REVIEWED", "ACTIONED", "DISMISSED"]),
});

/** Moderator-only: resolve a report; ACTIONED removes the reported listing. */
export async function resolveReport(input: unknown): Promise<ActionResult> {
  const mod = await requireModerator();
  if (!mod) return { ok: false, error: "Not authorized." };

  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const report = await db.report.findUnique({
    where: { id: parsed.data.reportId },
  });
  if (!report) return { ok: false, error: "Report not found." };

  await db.report.update({
    where: { id: report.id },
    data: { status: parsed.data.status },
  });

  if (parsed.data.status === "ACTIONED" && report.listingId) {
    await db.listing.update({
      where: { id: report.listingId },
      data: { status: "DELETED" },
    });
  }

  void notify({
    userId: report.reporterId,
    kind: "REPORT_RESOLVED",
    title: "Thanks — we reviewed your report",
    body:
      parsed.data.status === "ACTIONED"
        ? "We took action on the content you flagged."
        : "Our team has reviewed your report.",
    href: "/browse",
  });

  revalidatePath("/moderation");
  revalidatePath("/browse");
  return { ok: true };
}
