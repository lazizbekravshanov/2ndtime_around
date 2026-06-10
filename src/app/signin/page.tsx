"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { LogoMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { isUcEmail } from "@/lib/constants";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    // NextAuth redirects back here with ?error=AccessDenied when the
    // server-side domain gate rejects a sign-in.
    params.get("error")
      ? "2nd Time Around is only available to UC students. Use your @uc.edu email."
      : null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter your UC email to get a sign-in link.");
      return;
    }
    if (!isUcEmail(trimmed)) {
      setError(
        "2nd Time Around is only available to UC students. Use your @uc.edu email."
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await signIn("email", {
      email: trimmed,
      redirect: false,
      callbackUrl: "/browse",
    });
    setSubmitting(false);
    if (res?.error) {
      setError("Something went wrong sending your link. Try again in a moment.");
      return;
    }
    router.push(`/signin/sent?email=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
      <Field
        label="UC email address"
        htmlFor="email"
        error={error ?? undefined}
        hint="We'll email you a one-tap sign-in link. No password needed."
      >
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="bearcat@mail.uc.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null); // clear stale error as the user types
          }}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
        />
      </Field>
      <Button type="submit" disabled={submitting} className="mt-4 w-full">
        {submitting ? "Sending link…" : "Send sign-in link"}
      </Button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="flex items-center gap-2.5">
        <LogoMark className="h-7 w-7" />
        <span className="text-xl font-semibold tracking-tight">
          2nd Time Around
        </span>
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Sign in</h1>
      <p className="mb-8 mt-1 text-sm text-faint">
        UC students only — verified by your university email.
      </p>
      <Suspense>
        <SignInForm />
      </Suspense>
      <Link
        href="/demo"
        className="mt-8 text-xs text-faint underline underline-offset-4 hover:text-ink"
      >
        Reviewing the project? Use the showcase sign-in
      </Link>
    </main>
  );
}
