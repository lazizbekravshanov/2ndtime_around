import Link from "next/link";
import { redirect } from "next/navigation";
import { ChatIcon, LeafIcon, LogoMark, PinIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/session";

const HIGHLIGHTS = [
  {
    icon: PinIcon,
    title: "UC students only",
    body: "Everyone here signed in with a verified UC email. No strangers from across town.",
  },
  {
    icon: ChatIcon,
    title: "Meet somewhere safe",
    body: "Chat in the app and pick from suggested on-campus meetup spots like TUC or Langsam.",
  },
  {
    icon: LeafIcon,
    title: "Nothing goes to waste",
    body: "Sell it, donate it, or return a lost item to its owner — every item gets a second time around.",
  },
];

export default async function LandingPage() {
  // Signed-in students skip the pitch and land on Browse.
  const user = await getSessionUser();
  if (user) redirect("/browse");

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex items-center gap-3">
          <LogoMark className="h-9 w-9" />
          <span className="text-2xl font-semibold tracking-tight">
            2nd Time Around
          </span>
        </div>

        <p className="mt-6 max-w-md text-base text-faint">
          The UC-only marketplace for buying, selling, donating, and finding
          lost items.
        </p>

        <Link href="/signin" className={`${buttonClasses("primary", "lg")} mt-8`}>
          Sign in
        </Link>

        <div className="mt-20 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-line bg-surface p-5 text-left"
            >
              <Icon className="h-5 w-5 text-accent" />
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-faint">{body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-[1100px] px-4 py-6 text-center text-sm text-faint">
          Built by Team 4 — IT2021 · University of Cincinnati
        </p>
      </footer>
    </div>
  );
}
