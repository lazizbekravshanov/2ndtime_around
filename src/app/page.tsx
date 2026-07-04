import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { HeroMapBackdrop } from "@/components/HeroMapBackdrop";
import { LeafIcon, LogoMark } from "@/components/icons";
import { ListingCard } from "@/components/ListingCard";
import { buttonClasses } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { formatPrice, photoList } from "@/lib/format";
import { getImpactStats } from "@/lib/impact";
import { getSessionUser } from "@/lib/session";

const TRUST = ["UC-verified only", "No fees", "Safe campus meetups"];

// The public landing is the highest-traffic anonymous page; its preview strip
// is slow-moving, so cache it for a minute instead of querying per request.
// (Dates round-trip the cache as strings — revived below before render.)
const getRecentListings = unstable_cache(
  async () =>
    db.listing.findMany({
      where: { status: "ACTIVE" },
      include: { owner: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ["landing-recent-listings"],
  { revalidate: 60 }
);

// Social proof from real completed sales — titles/prices were public while
// the listings were live, so nothing private surfaces here.
const getRecentlySold = unstable_cache(
  async () =>
    db.listing.findMany({
      where: { type: "SELL", status: "SOLD", price: { not: null } },
      select: { id: true, title: true, price: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ["landing-recently-sold"],
  { revalidate: 60 }
);

export default async function LandingPage() {
  // Signed-in students skip the pitch and land on Browse.
  const user = await getSessionUser();
  if (user) redirect("/browse");

  // Real recent listings + real campus-impact numbers for the sections below
  // the hero.
  const [cached, impact, recentlySold] = await Promise.all([
    getRecentListings(),
    getImpactStats(),
    getRecentlySold(),
  ]);
  const recent = cached.map((l) => ({
    ...l,
    createdAt: new Date(l.createdAt),
  }));
  const withPhotos = recent.filter((l) => photoList(l.photos).length > 0);
  const preview = (withPhotos.length >= 4 ? withPhotos : recent).slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-page items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="text-base font-semibold tracking-tight">
            2nd Time Around
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-faint transition-colors hover:text-ink"
          >
            How it works
          </Link>
          <Link
            href="/signin"
            className="text-sm font-medium text-faint transition-colors hover:text-ink"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative isolate w-full overflow-hidden border-b border-line">
        {/* 3D UC-campus map backdrop — lazy, client-only, code-split. */}
        <HeroMapBackdrop />
        {/* Flat near-white wash (no gradient) so text clears 4.5:1 over the map. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-paper/65"
        />
        {/* Server-rendered hero content — paints immediately, is the LCP element. */}
        <div className="relative z-10 mx-auto flex min-h-[68vh] max-w-page flex-col justify-center px-4 py-16 sm:min-h-[80vh] sm:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Everything students need,
              <br className="hidden sm:block" /> second time around.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-faint sm:text-lg">
              Buy, sell, donate, and recover lost items. UC students only, all
              in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/signin" className={buttonClasses("primary", "lg")}>
                Sign in with your UC email
              </Link>
              <Link
                href="/browse"
                className="text-sm font-medium text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Browse the marketplace
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-faint">
              {TRUST.map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  {i > 0 && (
                    <span aria-hidden="true" className="h-3 w-px bg-line" />
                  )}
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-page flex-1 px-4">
        {/* Live listing strip — real activity from campus. */}
        {preview.length > 0 && (
          <section className="py-12">
            <h2 className="sr-only">Recent listings</h2>
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

            {/* Real recently-completed sales — quiet social proof. */}
            {recentlySold.length > 0 && (
              <p className="mt-2 text-center text-xs text-faint">
                <span className="font-medium text-ink">Recently sold:</span>{" "}
                {recentlySold.map((l, i) => (
                  <span key={l.id}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    {l.title} {formatPrice(l.price as number)}
                  </span>
                ))}
              </p>
            )}
          </section>
        )}

        {/* Campus impact — real numbers; the city-level "why this matters". */}
        <section className="mb-12 rounded-2xl border border-line bg-surface px-6 py-10 sm:py-12">
          <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
            <LeafIcon className="mr-1.5 inline h-4 w-4 text-success" />
            What Bearcats keep in circulation
          </h2>
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
          <p className="mt-8 text-center text-sm">
            <Link
              href="/leaderboard"
              className="font-medium text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              See which Bearcats keep the most in circulation →
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-page px-4 py-6 text-center text-sm text-faint">
          Built by Team 4 — IT2021 · University of Cincinnati
        </p>
      </footer>
    </div>
  );
}
