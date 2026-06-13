import Link from "next/link";
import { redirect } from "next/navigation";
import { ChatIcon, LeafIcon, LogoMark, PinIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import { ListingCard } from "@/components/ListingCard";
import { db } from "@/lib/db";
import { photoList } from "@/lib/format";
import { getImpactCount } from "@/lib/impact";
import { getSessionUser } from "@/lib/session";

const TRUST = [
  { icon: PinIcon, label: "UC students only" },
  { icon: ChatIcon, label: "Safe campus meetups" },
  { icon: LeafIcon, label: "Nothing goes to waste" },
];

export default async function LandingPage() {
  // Signed-in students skip the pitch and land on Browse.
  const user = await getSessionUser();
  if (user) redirect("/browse");

  // Pull a few real, recent listings so the page shows live campus activity.
  const [recent, impact] = await Promise.all([
    db.listing.findMany({
      where: { status: "ACTIVE" },
      include: { owner: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    getImpactCount(),
  ]);

  // Prefer listings with photos for the preview; fall back to recent if needed.
  const withPhotos = recent.filter((l) => photoList(l.photos).length > 0);
  const preview = (withPhotos.length >= 4 ? withPhotos : recent).slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="text-base font-semibold tracking-tight">
            2nd Time Around
          </span>
        </div>
        <Link
          href="/signin"
          className="text-sm font-medium text-faint transition-colors hover:text-ink"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4">
        <div className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-12 lg:py-20">
          {/* Pitch */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              University of Cincinnati
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Buy, sell &amp; donate{" "}
              <span className="text-accent">right on campus.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-faint">
              The UC-only marketplace. Every account is a verified Bearcat — chat
              in-app, meet at safe campus spots, and keep good stuff out of the
              dumpster.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/signin" className={buttonClasses("primary", "lg")}>
                Get started
                <span aria-hidden="true">→</span>
              </Link>
              <span className="inline-flex items-center gap-2 text-sm text-faint">
                <LeafIcon className="h-4 w-4 text-success" />
                <strong className="font-semibold text-ink">{impact}</strong>
                {impact === 1 ? "item" : "items"} kept out of landfills
              </span>
            </div>
          </div>

          {/* Live preview of real listings */}
          {preview.length > 0 && (
            <div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {preview.map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={{
                      ...l,
                      type: l.type as never,
                      status: l.status as never,
                    }}
                  />
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-faint">
                Live from campus, updated all day
              </p>
            </div>
          )}
        </div>

        {/* Trust row */}
        <ul className="flex flex-col items-center justify-center gap-4 border-t border-line py-8 text-sm sm:flex-row sm:gap-10">
          {TRUST.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2 text-faint"
            >
              <Icon className="h-4 w-4 text-accent" />
              {label}
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-[1100px] px-4 py-6 text-center text-sm text-faint">
          Built by Team 4 — IT2021 · University of Cincinnati
        </p>
      </footer>
    </div>
  );
}
