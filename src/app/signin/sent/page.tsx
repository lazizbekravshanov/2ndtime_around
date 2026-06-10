import Link from "next/link";
import { CheckIcon } from "@/components/icons";

export const metadata = { title: "Check your email" };

export default async function MagicLinkSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const devMode = !process.env.EMAIL_SERVER;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
        <CheckIcon className="h-6 w-6 text-success" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold">Check your email</h1>
      <p className="mt-2 max-w-sm text-sm text-faint">
        We sent a sign-in link to{" "}
        <strong className="font-medium text-ink">{email ?? "your inbox"}</strong>
        . Tap it on this device and you&apos;re in. The link works for one
        hour.
      </p>
      {devMode && (
        <p className="mt-4 max-w-sm rounded-lg border border-line bg-surface px-4 py-3 text-xs text-faint">
          Dev mode: no email server is configured, so the magic link was
          printed to the terminal running <code>npm run dev</code>.
        </p>
      )}
      <Link
        href="/signin"
        className="mt-8 text-sm font-medium text-ink underline underline-offset-4 hover:text-accent"
      >
        Use a different email
      </Link>
    </main>
  );
}
