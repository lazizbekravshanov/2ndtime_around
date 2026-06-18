import Link from "next/link";
import { redirect } from "next/navigation";
import { LeafIcon, LogoMark } from "@/components/icons";
import { ListingCard } from "@/components/ListingCard";
import { LandingHero } from "@/components/LandingHero";
import { db } from "@/lib/db";
import { formatPrice, photoList } from "@/lib/format";
import { getImpactStats } from "@/lib/impact";
import { getSessionUser } from "@/lib/session";

export default async function LandingPage() {
  // Signed-in students skip the pitch and land on Browse.
  const user = await getSessionUser();
  if (user) redirect("/browse");

  // Real recent listings + real campus-impact numbers for the sections below
  // the hero.
  const [recent, impact] = await Promise.all([
    db.listing.findMany({
      where: { status: "ACTIVE" },
      include: { owner: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    getImpactStats(),
  ]);
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

      <LandingHero />

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4">
        {/* Live listing strip — real activity from campus. */}
        {preview.length > 0 && (
          <section className="py-12">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
          </section>
        )}

        {/* Campus impact — real numbers; the city-level "why this matters". */}
        <section className="mb-14 rounded-2xl border border-line bg-surface px-6 py-10 sm:py-12">
          <p className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
            <LeafIcon className="mr-1.5 inline h-4 w-4 text-success" />
            What Bearcats keep in circulation
          </p>
          <dl className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col-reverse gap-1.5 text-center">
              <dt className="text-sm text-faint">
                items kept out of Cincinnati landfills
              </dt>
              <dd className="text-5xl font-semibold tracking-tight sm:text-6xl">
                {impact.itemsKept}
              </dd>
            </div>
            <div className="flex flex-col-reverse gap-1.5 text-center">
              <dt className="text-sm text-faint">
                traded between students, not big retail
              </dt>
              <dd className="text-5xl font-semibold tracking-tight sm:text-6xl">
                {formatPrice(impact.soldValue)}
              </dd>
            </div>
            <div className="flex flex-col-reverse gap-1.5 text-center">
              <dt className="text-sm text-faint">items given away free</dt>
              <dd className="text-5xl font-semibold tracking-tight sm:text-6xl">
                {impact.donated}
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-[1100px] px-4 py-6 text-center text-sm text-faint">
          Built by Team 4 — IT2021 · University of Cincinnati
        </p>
      </footer>
    </div>
  );
}
