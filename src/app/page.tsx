import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChatIcon, LeafIcon, LogoMark, PinIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import { ListingCard } from "@/components/ListingCard";
import { db } from "@/lib/db";
import { formatPrice, photoList } from "@/lib/format";
import { getImpactStats } from "@/lib/impact";
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

  // Pull a few real, recent listings so the page shows live campus activity,
  // plus the real campus-impact numbers for the hero band.
  const [recent, impact] = await Promise.all([
    db.listing.findMany({
      where: { status: "ACTIVE" },
      include: { owner: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    getImpactStats(),
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

      <main className="relative mx-auto w-full max-w-[1100px] flex-1 px-4">
        {/* Soft warm atmosphere behind the hero — depth from light, kept quiet. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(70%_55%_at_78%_12%,rgba(224,1,34,0.05),transparent_72%)]"
        />
        <div className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-12 lg:py-20">
          {/* Pitch */}
          <div>
            <span className="reveal inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-faint shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              University of Cincinnati
            </span>
            <h1
              className="reveal mt-5 font-display text-[2.75rem] font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl"
              style={{ "--reveal-delay": "80ms" } as CSSProperties}
            >
              Buy, sell &amp; donate{" "}
              <span className="text-accent">right on campus.</span>
            </h1>
            <p
              className="reveal mt-5 max-w-md text-base leading-relaxed text-faint"
              style={{ "--reveal-delay": "160ms" } as CSSProperties}
            >
              The UC-only marketplace. Every account is a verified Bearcat — chat
              in-app, meet at safe campus spots, and keep good stuff out of the
              dumpster.
            </p>
            <div
              className="reveal mt-8"
              style={{ "--reveal-delay": "240ms" } as CSSProperties}
            >
              <Link href="/signin" className={buttonClasses("primary", "lg")}>
                Get started
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Live preview of real listings */}
          {preview.length > 0 && (
            <div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {preview.map((l, i) => (
                  <div
                    key={l.id}
                    className="reveal"
                    style={{ "--reveal-delay": `${220 + i * 90}ms` } as CSSProperties}
                  >
                    <ListingCard
                      listing={{
                        ...l,
                        type: l.type as never,
                        status: l.status as never,
                      }}
                    />
                  </div>
                ))}
              </div>
              <p
                className="reveal mt-3 text-center text-xs text-faint"
                style={{ "--reveal-delay": "580ms" } as CSSProperties}
              >
                Live from campus, updated all day
              </p>
            </div>
          )}
        </div>

        {/* Campus impact — real numbers; the city-level "why this matters". */}
        <section className="reveal rounded-2xl border border-line bg-surface px-6 py-10 shadow-card sm:py-12">
          <p className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
            <LeafIcon className="mr-1.5 inline h-4 w-4 text-success" />
            What Bearcats keep in circulation
          </p>
          <dl className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col-reverse gap-1.5 text-center">
              <dt className="text-sm text-faint">
                items kept out of Cincinnati landfills
              </dt>
              <dd className="font-display text-5xl font-medium tracking-tight sm:text-6xl">
                {impact.itemsKept}
              </dd>
            </div>
            <div className="flex flex-col-reverse gap-1.5 text-center">
              <dt className="text-sm text-faint">
                traded between students, not big retail
              </dt>
              <dd className="font-display text-5xl font-medium tracking-tight sm:text-6xl">
                {formatPrice(impact.soldValue)}
              </dd>
            </div>
            <div className="flex flex-col-reverse gap-1.5 text-center">
              <dt className="text-sm text-faint">items given away free</dt>
              <dd className="font-display text-5xl font-medium tracking-tight sm:text-6xl">
                {impact.donated}
              </dd>
            </div>
          </dl>
        </section>

        {/* Trust row */}
        <ul className="mt-4 flex flex-col items-center justify-center gap-4 border-t border-line py-8 text-sm sm:flex-row sm:gap-10">
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
