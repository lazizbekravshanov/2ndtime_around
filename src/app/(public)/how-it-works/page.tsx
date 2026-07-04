import Link from "next/link";
import {
  TagIcon,
  PinIcon,
  LeafIcon,
  CheckIcon,
  BadgeIcon,
} from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import { getImpactStats } from "@/lib/impact";

export const metadata = {
  title: "How it works",
  description:
    "How 2nd Time Around works: list it, meet on campus, keep it in circulation. A UC-student-only marketplace with no fees and safe campus meetups.",
};

const STEPS = [
  {
    icon: TagIcon,
    title: "1 · List it in a minute",
    body: "Snap a photo, set a price — or give it away free. Textbooks, dorm gear, bikes, tickets, and lost-and-found all live in one place. Selling a whole room at move-out? Post it in bulk with one shareable sale page.",
  },
  {
    icon: PinIcon,
    title: "2 · Meet on campus",
    body: "Chat in-app, agree on a named campus spot, and pick a time between classes. No handing your number to strangers, no driving across town — just a two-minute walk to a place you already know.",
  },
  {
    icon: LeafIcon,
    title: "3 · Keep it in circulation",
    body: "Every completed swap keeps something out of a Cincinnati landfill and money in a student's pocket instead of a big retailer's. Your impact adds up on your profile — and on the campus leaderboard.",
  },
];

const TRUST = [
  {
    icon: CheckIcon,
    title: "Verified UC students only",
    body: "Every account is gated to an @uc.edu email. No randoms, no bots, no marketplace scams from across the country — just Bearcats.",
  },
  {
    icon: PinIcon,
    title: "Safe campus meetups",
    body: "Trades happen at named, public spots on campus. It's the safety of a dorm-lobby handoff, built into the flow.",
  },
  {
    icon: BadgeIcon,
    title: "No fees, ever",
    body: "We don't take a cut. A $40 textbook puts $40 in your pocket — the whole point is keeping value inside the student community.",
  },
];

export default async function HowItWorksPage() {
  const impact = await getImpactStats();

  return (
    <div className="mx-auto max-w-3xl">
      {/* Narrative hero */}
      <section className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-faint">
          The UC-only marketplace
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
          Buy, sell, and give — without leaving campus.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-faint">
          2nd Time Around is where UC students pass their stuff on to the next
          Bearcat instead of a dumpster. Here&apos;s how it works.
        </p>
      </section>

      {/* Three steps */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-line bg-surface p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-ink">
              <s.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-faint">{s.body}</p>
          </div>
        ))}
      </section>

      {/* Why it's different — the trust story */}
      <section className="mt-12">
        <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
          Why students trust it
        </h2>
        <div className="mt-6 space-y-3">
          {TRUST.map((t) => (
            <div
              key={t.title}
              className="flex gap-4 rounded-xl border border-line bg-surface p-5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/5 text-accent">
                <t.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-faint">
                  {t.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real impact — the proof */}
      <section className="mt-12 rounded-2xl border border-line bg-surface px-6 py-10">
        <h2 className="text-center text-xs font-medium uppercase tracking-[0.12em] text-faint">
          <LeafIcon className="mr-1.5 inline h-4 w-4 text-success" />
          What Bearcats have kept in circulation
        </h2>
        <dl className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col-reverse gap-1.5 text-center">
            <dt className="text-sm text-faint">items kept out of landfills</dt>
            <dd className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {impact.itemsKept}
            </dd>
          </div>
          <div className="flex flex-col-reverse gap-1.5 text-center">
            <dt className="text-sm text-faint">kept among students</dt>
            <dd className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {formatPrice(impact.soldValue)}
            </dd>
          </div>
          <div className="flex flex-col-reverse gap-1.5 text-center">
            <dt className="text-sm text-faint">items given away free</dt>
            <dd className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {impact.donated}
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-center text-sm">
          <Link
            href="/leaderboard"
            className="font-medium text-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            See the campus leaderboard →
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="mt-12 flex flex-col items-center gap-4 pb-4 text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          Ready to pass something on?
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
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
      </section>
    </div>
  );
}
