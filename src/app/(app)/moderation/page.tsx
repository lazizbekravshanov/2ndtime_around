import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { timeAgo } from "@/lib/format";
import { listOpenReports } from "@/lib/actions/moderation";
import { ResolveActions } from "./ResolveActions";

export const metadata = { title: "Moderation" };

export default async function ModerationPage() {
  const user = await requireUser();
  const me = await db.user.findUnique({
    where: { id: user.id },
    select: { isModerator: true },
  });
  if (!me?.isModerator) notFound();

  const reports = await listOpenReports();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
      <p className="mt-1 text-sm text-faint">
        {reports.length} open {reports.length === 1 ? "report" : "reports"}.
      </p>

      <div className="mt-5">
        {reports.length === 0 ? (
          <EmptyState
            icon={<CheckIcon className="h-6 w-6" />}
            title="Nothing to review"
            hint="Reports from the community will appear here for you to action or dismiss."
          />
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="neutral">{r.reason}</Badge>
                  <span className="text-xs text-faint">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm">
                  {r.listing ? (
                    <>
                      Listing:{" "}
                      <Link
                        href={`/listing/${r.listing.id}`}
                        className="font-medium hover:underline"
                      >
                        {r.listing.title}
                      </Link>
                    </>
                  ) : r.reportedUserId ? (
                    <>
                      User:{" "}
                      <Link
                        href={`/profile/${r.reportedUserId}`}
                        className="font-medium hover:underline"
                      >
                        view profile
                      </Link>
                    </>
                  ) : (
                    "Unknown target"
                  )}
                </p>
                {r.detail && (
                  <p className="mt-1 text-sm text-faint">“{r.detail}”</p>
                )}
                <p className="mt-1 text-xs text-faint">
                  Reported by {r.reporter.displayName ?? "someone"}
                </p>
                {r.listing && (
                  <div className="mt-3">
                    <ResolveActions reportId={r.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
