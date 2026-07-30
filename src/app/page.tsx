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
import { chipClasses } from "@/components/ui/Chip";
import { CATEGORIES, MEETUP_SPOTS } from "@/lib/constants";
import { db } from "@/lib/db";
import { photoList } from "@/lib/format";
import {
  isDiversionWindowOpen,
  MARKET_FACTS,
  UC_DIVERSION,
  UC_STANDING,
} from "@/lib/marketFacts";
import { campusMoment, type CampusPhase } from "@/lib/semester";
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

// Four, not eight. This section is read from the back of a room during a
// pitch, so it carries the pillars that differentiate us — the long tail
// (want ads, lost & found, impact tracking) is on /how-it-works.
const FEATURES = [
  {
    icon: TagIcon,
    title: "Buy, sell, and give away",
    body: "Textbooks, dorm gear, bikes, tickets. Set a price or give it away free. No shipping, no fees, no middleman.",
  },
  {
    icon: BadgeIcon,
    title: "UC students only",
    body: "Every account is verified by a @uc.edu address. You're trading with classmates, not strangers off the internet.",
  },
  {
    icon: ChatIcon,
    title: "Safe campus meetups",
    body: "Propose a time and a well-lit, staffed spot — TUC, Langsam, the CRC — right inside the chat.",
  },
  {
    icon: BoxIcon,
    title: "Move-out mode",
    body: "List your whole room in one pass at the end of the semester, instead of one item at a time.",
  },
];

/**
 * The three ways onto the marketplace, built from the category constants so a
 * rename breaks the build rather than silently rotting the link.
 *
 * Ordered by where campus is: someone arriving in move-out week should be
 * offered the bulk lister first, not dorm shopping.
 */
// `satisfies` makes TypeScript check each string really is a category, so
// renaming one fails the build here instead of quietly producing a filter that
// matches nothing. Referencing by value rather than index also survives a
// reorder of CATEGORIES.
const LINKED_CATEGORIES = {
  textbooks: "Textbooks & Course Materials",
  dorm: "Dorm & Apartment Essentials",
} satisfies Record<string, (typeof CATEGORIES)[number]>;

const ENTRY_POINTS = {
  movein: {
    label: "Furnishing a room",
    href: `/browse?category=${encodeURIComponent(LINKED_CATEGORIES.dorm)}`,
  },
  textbooks: {
    label: "Need your textbooks",
    href: `/browse?category=${encodeURIComponent(LINKED_CATEGORIES.textbooks)}`,
  },
  moveout: { label: "Clearing a room out", href: "/sell/moveout" },
} as const;

function entryPointsFor(
  phase: CampusPhase
): { label: string; href: string }[] {
  const { movein, textbooks, moveout } = ENTRY_POINTS;
  if (phase === "moveout") return [moveout, movein, textbooks];
  if (phase === "movein") return [movein, textbooks, moveout];
  return [textbooks, movein, moveout];
}

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

  // The opportunity figures are external constants now, so the landing page
  // no longer queries our own impact stats.
  // Evaluated per request, so the wedge copy stops claiming "right now"
  // the day UC's window closes.
  const now = new Date();
  const diversionOpen = isDiversionWindowOpen(now);
  const moment = campusMoment(now);
  const entryPoints = entryPointsFor(moment.phase);
  const cached = await getRecentListings();
  const recent = cached.map((l) => ({ ...l, createdAt: new Date(l.createdAt) }));
  const withPhotos = recent.filter((l) => photoList(l.photos).length > 0);
  const preview = (withPhotos.length >= 4 ? withPhotos : recent).slice(0, 4);
  const browseSignIn = signInHref("/browse");

  return (
    <div className="flex min-h-dvh flex-col">
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
          {/* The page knows what week of the academic year it is. A stranger
              landing in August sees move-in; in December, move-out. It runs on
              the same clock as the in-app banner, so it can't claim a moment
              that isn't happening. */}
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.14em] text-faint">
            {moment.label}
          </p>

          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Everything students need,{" "}
            <span className="text-accent">second time around.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-faint sm:text-lg">
            {moment.lede}
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

          {/* No activity counters here: ours are pilot data, and a seeded
              number under the hero reads as traction. The opportunity section
              below carries sourced, external figures instead. */}
          {/* Three ways in, ordered by where campus actually is right now.
              Every one is a working filter, not a decorative tile. */}
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {entryPoints.map((e) => (
              <Link key={e.href} href={e.href} className={chipClasses()}>
                {e.label}
              </Link>
            ))}
          </div>

          <p className="mt-8 text-sm text-faint">
            <LeafIcon className="mr-1.5 inline h-4 w-4 text-success" />
            Free to use · UC students only · Nothing shipped, nothing wasted
          </p>
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

        {/* The opportunity — external, citable figures only.
            This section used to show our own seeded pilot counts, which read
            as traction. Every number here belongs to someone else and links to
            its source, so it holds up when someone checks. */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-page px-4 py-20 sm:py-28">
            <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
              The opportunity
            </h2>
            {/* "every move-out", not "every May": dorms empty in May, but the
                Uptown leases that drive the real pile-up end in July. */}
            <p className="mx-auto mt-4 max-w-3xl text-center text-3xl font-semibold tracking-tight sm:text-5xl">
              One campus throws away a small fortune every move-out.
            </p>
            <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-12 sm:grid-cols-3">
              {MARKET_FACTS.map((f) => (
                <div key={f.value} className="text-center">
                  <dd className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
                    {f.value}
                  </dd>
                  <dt className="mx-auto mt-3 max-w-56 text-sm leading-relaxed text-faint">
                    {f.label}
                  </dt>
                  <a
                    href={f.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-faint underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    {f.source}
                  </a>
                </div>
              ))}
            </dl>
            {/* Context, so the STARS number reads as an opening rather than an
                attack on a university that is demonstrably good at this. */}
            <p className="mx-auto mt-14 max-w-2xl text-center text-sm leading-relaxed text-faint">
              That last number is not neglect. UC is the{" "}
              <a
                href={UC_STANDING.greenRankHref}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
              >
                {UC_STANDING.greenRank} {UC_STANDING.greenRankBody}
              </a>
              . Minimization is scored separately from diversion — and nothing
              upstream of the dumpster is being measured yet.
            </p>
          </div>
        </section>

        {/* Why now — the wedge. UC already funds a downstream answer to this
            problem; the interesting move is upstream. */}
        <section className="border-t border-line bg-surface/60">
          <div className="mx-auto max-w-page px-4 py-20 sm:py-28">
            <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
              Why now
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-center text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Every Uptown lease ends{" "}
              <span className="text-accent">{UC_DIVERSION.leaseEnd}.</span>
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-faint sm:text-lg">
              The neighborhood empties in a single week, and it has always meant
              the same thing: furniture on the sidewalk and dumpsters running
              over.{" "}
              {/* "Right now" is only true inside the window. Outside it the
                  sentence states the annual fact instead, so a dated claim
                  can't outlive the date. */}
              {diversionOpen ? (
                <>
                  Right now — {UC_DIVERSION.windowLabel} — the university and{" "}
                </>
              ) : (
                <>
                  Every summer — {UC_DIVERSION.windowLabel} — the university
                  and{" "}
                </>
              )}
              {UC_DIVERSION.partners} partners answer it at{" "}
              {UC_DIVERSION.location} with extra dumpsters, e-waste bins, and a
              donation drop-off. It works, and it is entirely downstream.
              Everything it handles has already become garbage.
            </p>
            <div className="mx-auto mt-14 grid max-w-3xl gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              <div className="bg-surface p-8">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-faint">
                  Today
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight">
                  Haul it to a dumpster on McMillan.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-faint">
                  Ten days a year, one location, and the couch is already waste
                  by the time anyone sees it.
                </p>
              </div>
              <div className="bg-surface p-8">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-faint">
                  With 2nd Time Around
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight">
                  A sophomore two blocks away takes it.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-faint">
                  All year, every dorm, and it never becomes waste at all —
                  because someone who needed it got there first.
                </p>
              </div>
            </div>
            <p className="mt-8 text-center text-sm">
              <a
                href={UC_DIVERSION.href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                UC Uptown Waste Diversion →
              </a>
            </p>
          </div>
        </section>

        {/* Real places, named. These constants already drive the meetup
            picker inside chats; on the landing page the specificity — "open
            late, security desk" — is what signals a student built this. */}
        <section className="border-t border-line bg-surface/60">
          <div className="mx-auto max-w-page px-4 py-20 sm:py-28">
            <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
              Where trades happen
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              On campus, in daylight, somewhere staffed.
            </p>
            <ul className="mx-auto mt-14 grid max-w-3xl gap-x-10 gap-y-6 sm:grid-cols-2">
              {MEETUP_SPOTS.map((spot) => (
                <li key={spot.name} className="flex items-start gap-2.5">
                  <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
                  <span className="text-sm">
                    <span className="font-medium">{spot.name}</span>
                    <span className="text-faint"> — {spot.blurb}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

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

        {/* Final CTA — plain paper so it alternates against "How it works"
            above it, now that the section order puts the wedge up front. */}
        <section className="border-t border-line">
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
          University of Cincinnati
        </p>
      </footer>
    </div>
  );
}
