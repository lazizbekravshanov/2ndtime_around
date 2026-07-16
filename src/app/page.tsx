import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import {
  BadgeIcon,
  BoxIcon,
  ChatIcon,
  LeafIcon,
  LogoMark,
  PinIcon,
  SearchIcon,
  TagIcon,
} from "@/components/icons";
import { ListingCard } from "@/components/ListingCard";
import { buttonClasses } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { formatPrice, photoList } from "@/lib/format";
import { getImpactStats } from "@/lib/impact";
import { getSessionUser } from "@/lib/session";
import { signInHref } from "@/lib/url";

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

const FEATURES = [
  {
    icon: TagIcon,
    title: "Buy and sell",
    body: "Textbooks, dorm gear, bikes, tickets. Set a price, meet on campus, done. No shipping, no fees.",
  },
  {
    icon: LeafIcon,
    title: "Donations",
    body: "Free stuff gets its own tab, not a footnote. Give away what you can't carry home at move-out.",
  },
  {
    icon: PinIcon,
    title: "Lost & found",
    body: "Report what you lost or found. Claims are verified by a detail only the real owner would know.",
  },
  {
    icon: SearchIcon,
    title: "Want ads",
    body: "Can't find it? Post what you're looking for and let the person who has it come to you.",
  },
  {
    icon: ChatIcon,
    title: "Safe campus meetups",
    body: "Propose a time and a well-lit, staffed spot — TUC, Langsam, the CRC — right inside the chat.",
  },
  {
    icon: BadgeIcon,
    title: "UC students only",
    body: "Every account is verified by a @uc.edu address. You're trading with classmates, not strangers.",
  },
  {
    icon: BoxIcon,
    title: "Move-out mode",
    body: "List your whole room in one pass when the semester ends, instead of one item at a time.",
  },
  {
    icon: LeafIcon,
    title: "Impact you can see",
    body: "Every completed swap is counted — what you kept out of a Cincinnati landfill, tracked per semester.",
  },
];

const STEPS = [
  {
    title: "Sign in with your UC email",
    body: "One magic link, no password. The @uc.edu check is what keeps the marketplace to campus.",
  },
  {
    title: "Post it or find it",
    body: "Photos, a price, a category. Posting takes under a minute — or search what's already listed.",
  },
  {
    title: "Agree on a campus spot",
    body: "Message inside the app and propose a safe, staffed meetup location and time.",
  },
  {
    title: "Hand it over",
    body: "Mark it sold or given. It counts toward your impact and stays out of the dumpster.",
  },
];

export default async function LandingPage() {
  // Signed-in students skip the pitch and land on Browse.
  const user = await getSessionUser();
  if (user) redirect("/browse");

  const [cached, impact] = await Promise.all([
    getRecentListings(),
    getImpactStats(),
  ]);
  const recent = cached.map((l) => ({ ...l, createdAt: new Date(l.createdAt) }));
  const withPhotos = recent.filter((l) => photoList(l.photos).length > 0);
  const preview = (withPhotos.length >= 4 ? withPhotos : recent).slice(0, 4);
  const browseSignIn = signInHref("/browse");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-page items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="text-base font-semibold tracking-tight">
            2nd Time Around
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/how-it-works"
            className="hidden px-2 text-sm font-medium text-faint transition-colors hover:text-ink sm:block"
          >
            How it works
          </Link>
          <Link
            href="/browse"
            className="hidden px-2 text-sm font-medium text-faint transition-colors hover:text-ink sm:block"
          >
            Browse
          </Link>
          <Link
            href={browseSignIn}
            className={buttonClasses("secondary", "sm", "pill")}
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero — centered, near-white, one faint dot texture. The search card is
          the thesis: this is a marketplace, so the first thing you can do is
          look for your thing. */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(var(--color-line-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]"
        />
        <div className="mx-auto max-w-page px-4 pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Everything students need,{" "}
            <span className="text-accent">second time around.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-faint sm:text-lg">
            The UC-only marketplace for buying, selling, donating, and recovering
            what campus life runs on.
          </p>

          {/* Plain GET form — /browse already reads ?q=, so search works with no
              client JS at all. */}
          <form
            action="/browse"
            method="get"
            className="mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface p-2 transition-colors focus-within:border-faint/50"
          >
            <label htmlFor="q" className="sr-only">
              Search listings
            </label>
            <SearchIcon className="ml-2 h-5 w-5 shrink-0 text-faint" />
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Search textbooks, bikes, dorm stuff…"
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              aria-label="Search the marketplace"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink/90"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>

          {/* Real numbers only — these are the pilot's actual completed swaps. */}
          {impact.itemsKept > 0 && (
            <p className="mt-6 text-sm text-faint">
              <LeafIcon className="mr-1.5 inline h-4 w-4 text-success" />
              <span className="font-medium text-ink">{impact.itemsKept}</span>{" "}
              items kept in circulation ·{" "}
              <span className="font-medium text-ink">
                {formatPrice(impact.soldValue)}
              </span>{" "}
              traded between students
            </p>
          )}
        </div>
      </section>

      <main className="flex-1">
        {/* Live listing strip — real activity from campus. */}
        {preview.length > 0 && (
          <section className="border-t border-line bg-surface/60">
            <div className="mx-auto max-w-page px-4 py-20 sm:py-24">
              <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
                Live from campus
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
              <p className="mt-8 text-center text-sm">
                <Link
                  href="/browse"
                  className="font-medium text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  Browse everything on campus →
                </Link>
              </p>
            </div>
          </section>
        )}

        {/* Features — borderless grid, monochrome icons. */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-page px-4 py-20 sm:py-28">
            <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
              Everything you need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              One place for everything that outlives its owner.
            </p>
            <div className="mx-auto mt-16 grid max-w-3xl gap-x-12 gap-y-12 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <f.icon className="h-5 w-5 text-ink" />
                  <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-faint">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — a real sequence, so numbering earns its place. */}
        <section className="border-t border-line bg-surface/60">
          <div className="mx-auto max-w-page px-4 py-20 sm:py-28">
            <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
              How it works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              Four steps, start to handoff.
            </p>
            <ol className="mx-auto mt-14 max-w-2xl">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="flex gap-6 border-t border-line py-6 last:border-b"
                >
                  <span className="shrink-0 pt-0.5 text-xs tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-faint">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-center text-sm">
              <Link
                href="/how-it-works"
                className="font-medium text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Read the full walkthrough →
              </Link>
            </p>
          </div>
        </section>

        {/* Impact — the real campus numbers, borderless. */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-page px-4 py-20 sm:py-28">
            <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
              <LeafIcon className="mr-1.5 inline h-4 w-4 text-success" />
              What Bearcats keep in circulation
            </h2>
            <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-12 sm:grid-cols-3">
              <div className="flex flex-col-reverse gap-2 text-center">
                <dt className="text-sm text-faint">
                  items kept out of Cincinnati landfills
                </dt>
                <dd className="text-5xl font-semibold tracking-tight tabular-nums">
                  {impact.itemsKept}
                </dd>
              </div>
              <div className="flex flex-col-reverse gap-2 text-center">
                <dt className="text-sm text-faint">
                  traded between students, not big retail
                </dt>
                <dd className="text-5xl font-semibold tracking-tight tabular-nums">
                  {formatPrice(impact.soldValue)}
                </dd>
              </div>
              <div className="flex flex-col-reverse gap-2 text-center">
                <dt className="text-sm text-faint">items given away free</dt>
                <dd className="text-5xl font-semibold tracking-tight tabular-nums">
                  {impact.donated}
                </dd>
              </div>
            </dl>
            <p className="mt-12 text-center text-sm">
              <Link
                href="/leaderboard"
                className="font-medium text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                See which Bearcats keep the most in circulation →
              </Link>
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-line bg-surface/60">
          <div className="mx-auto max-w-page px-4 py-20 text-center sm:py-28">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next textbook is already on campus.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-faint">
              Sign in with your UC email and see what your classmates are passing
              on this week.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={browseSignIn}
                className={buttonClasses("primary", "lg", "pill")}
              >
                Sign in with your UC email
              </Link>
              <Link
                href="/browse"
                className={buttonClasses("secondary", "lg", "pill")}
              >
                Browse first
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-page px-4 py-8 text-center text-sm text-faint">
          Built by Team 4 — IT2021 · University of Cincinnati
        </p>
      </footer>
    </div>
  );
}
