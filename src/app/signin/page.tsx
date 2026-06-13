"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LogoMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { DEMO_ACCOUNTS } from "@/lib/constants";

/**
 * Demo-mode sign-in: pick a persona, enter the shared demo password.
 * Open registration is intentionally out of scope while the platform is
 * shown to teammates and reviewers; the magic-link email flow still exists
 * server-side and returns when real sign-ups open up.
 */
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const personaRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move selection within the radio group (WAI-ARIA radiogroup
  // pattern); only the selected option is in the tab order (roving tabindex).
  function onPersonaKey(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      next = (index + 1) % DEMO_ACCOUNTS.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      next = (index - 1 + DEMO_ACCOUNTS.length) % DEMO_ACCOUNTS.length;
    } else {
      return;
    }
    e.preventDefault();
    setEmail(DEMO_ACCOUNTS[next].email);
    personaRefs.current[next]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Enter the demo password.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
      <h1 className="mt-8 text-2xl font-semibold">Who&apos;s signing in?</h1>
      <p className="mb-8 mt-1 max-w-sm text-center text-sm text-faint">
        Demo environment — pick your account. Open sign-up comes later.
      </p>

      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm">
        <div role="radiogroup" aria-label="Account" className="space-y-3">
          {DEMO_ACCOUNTS.map((account, i) => {
            const selected = email === account.email;
            return (
              <button
                key={account.email}
                ref={(el) => {
                  personaRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onKeyDown={(e) => onPersonaKey(e, i)}
                onClick={() => setEmail(account.email)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-accent bg-surface"
                    : "border-line bg-surface hover:border-faint"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase ${
                    selected ? "bg-accent text-white" : "border border-line bg-paper"
                  }`}
                >
                  {account.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {account.name}
                  </span>
                  <span className="block text-xs text-faint">
                    {account.role}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <Field
            label="Demo password"
            htmlFor="password"
            error={error ?? undefined}
          >
            <input
              id="password"
              type="password"
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
        </div>

        <Button type="submit" disabled={pending} className="mt-4 w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
