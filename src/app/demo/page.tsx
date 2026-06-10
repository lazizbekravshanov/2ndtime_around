"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";

/**
 * Showcase sign-in — lets a reviewer enter the demo account with a password
 * instead of a magic link. The endpoint behind this is disabled unless the
 * deployment sets DEMO_PASSWORD.
 */
export default function DemoSignInPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setPending(false);
      setError(json?.error ?? "Something went wrong. Try again.");
      return;
    }
    router.push("/browse");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="flex items-center gap-2.5">
        <LogoMark className="h-7 w-7" />
        <span className="text-xl font-semibold tracking-tight">
          2nd Time Around
        </span>
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Showcase sign-in</h1>
      <p className="mb-8 mt-1 max-w-sm text-center text-sm text-faint">
        For demo reviews: signs you in as the demo student account, no email
        required.
      </p>
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
        <Field
          label="Demo password"
          htmlFor="demo-password"
          error={error ?? undefined}
        >
          <input
            id="demo-password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            className={inputClasses}
          />
        </Field>
        <Button type="submit" disabled={pending} className="mt-4 w-full">
          {pending ? "Signing in…" : "Enter the demo"}
        </Button>
      </form>
      <Link
        href="/signin"
        className="mt-8 text-sm font-medium text-ink underline underline-offset-4 hover:text-accent"
      >
        Sign in with a UC email instead
      </Link>
    </main>
  );
}
