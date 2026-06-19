"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

// Leaflet touches `window`, so the map renders client-side only. `loading`
// returns null — until tiles arrive the hero is just the washed paper backdrop,
// so there's no hydration mismatch and no layout shift.
const HeroMap = dynamic(() => import("@/components/HeroMap"), {
  ssr: false,
  loading: () => null,
});

const TRUST = ["UC-verified only", "No fees", "Safe campus meetups"];

export function LandingHero() {
  return (
    <section className="relative isolate w-full overflow-hidden border-b border-line">
      {/* Faint campus-map texture + a flat near-white wash (no gradient) so
          the text clears 4.5:1 contrast over it. z-0 gives the map its own
          stacking context so Leaflet's internal panes can't cover the content. */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <HeroMap />
        <div className="absolute inset-0 bg-paper/75" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-[1100px] flex-col justify-center px-4 py-16 sm:min-h-[78vh] sm:py-24">
        <div className="max-w-2xl">
          <h1 className="text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.02em] sm:text-6xl">
            Everything students need,
            <br className="hidden sm:block" /> second time around.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-faint sm:text-lg">
            Buy, sell, donate, and recover lost items. UC students only, all in
            one place.
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
                {i > 0 && <span aria-hidden="true" className="h-3 w-px bg-line" />}
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
