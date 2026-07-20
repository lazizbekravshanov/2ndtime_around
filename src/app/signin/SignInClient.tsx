"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { LogoMark } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { DEMO_ACCOUNTS, isUcEmail } from "@/lib/constants";
import { safeCallbackUrl } from "@/lib/url";

/**
 * Sign-in: a real @uc.edu magic-link request is the primary path; the demo
 * personas are a secondary, collapsed option (only when DEMO_PASSWORD is set).
 * Which paths render is decided server-side via signinModes and passed in.
 */
export function SignInClient({
  emailEnabled,
  demoEnabled,
}: {
  emailEnabled: boolean;
  demoEnabled: boolean;
}) {
  const router = useRouter();
  const callbackUrl = safeCallbackUrl(useSearchParams().get("callbackUrl"));

  // --- Real magic-link sign-up ---
  const [email, setEmail] = useState("");
  const [linkPending, setLinkPending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim();
    if (!isUcEmail(normalized)) {
      setLinkError("Use your UC email (@uc.edu or @mail.uc.edu).");
      return;
    }
    setLinkPending(true);
    setLinkError(null);
    const res = await signIn("email", {
      email: normalized,
      callbackUrl,
      redirect: false,
    });
    if (!res || res.error) {
      setLinkPending(false);
      setLinkError("Couldn't send the link. Try again in a moment.");
      return;
    }
    router.push(`/signin/sent?email=${encodeURIComponent(normalized)}`);
  }

  // --- Demo persona picker (secondary) ---
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoEmail, setDemoEmail] = useState<string>(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState("");
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoPending, setDemoPending] = useState(false);
  const personaRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onPersonaKey(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight")
      next = (index + 1) % DEMO_ACCOUNTS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = (index - 1 + DEMO_ACCOUNTS.length) % DEMO_ACCOUNTS.length;
    else return;
    e.preventDefault();
    setDemoEmail(DEMO_ACCOUNTS[next].email);
    personaRefs.current[next]?.focus();
  }

  async function handleDemo(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setDemoError("Enter the demo password.");
      return;
    }
    setDemoPending(true);
    setDemoError(null);
    const res = await fetch("/api/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: demoEmail, password }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setDemoPending(false);
      setDemoError(json?.error ?? "Something went wrong. Try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="flex items-center gap-2.5">
        <LogoMark className="h-7 w-7" />
        <span className="text-xl font-semibold tracking-tight">
          2nd Time Around
        </span>
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Sign in</h1>
      <p className="mb-8 mt-1 max-w-sm text-center text-sm text-faint">
        UC students only — sign in with your university email.
      </p>

      {emailEnabled ? (
        <form onSubmit={handleMagicLink} noValidate className="w-full max-w-sm">
          <Field label="UC email" htmlFor="email" error={linkError ?? undefined}>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@mail.uc.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (linkError) setLinkError(null);
              }}
              aria-invalid={linkError ? true : undefined}
              className={inputClasses}
            />
          </Field>
          <Button type="submit" disabled={linkPending} className="mt-4 w-full">
            {linkPending ? "Sending link…" : "Email me a magic link"}
          </Button>
        </form>
      ) : !demoEnabled ? (
        <p className="max-w-sm rounded-xl border border-line bg-surface px-5 py-4 text-center text-sm text-faint">
          Sign-ups are opening soon. Check back shortly.
        </p>
      ) : null}

      {demoEnabled && (
        <div className="mt-8 w-full max-w-sm border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setDemoOpen((v) => !v)}
            aria-expanded={demoOpen}
            className="mx-auto block text-sm font-medium text-faint transition-colors hover:text-ink"
          >
            {demoOpen ? "Hide demo accounts" : "Explore with a demo account"}
          </button>

          {demoOpen && (
            <form onSubmit={handleDemo} noValidate className="mt-5">
              <div
                role="radiogroup"
                aria-label="Demo account"
                className="space-y-3"
              >
                {DEMO_ACCOUNTS.map((account, i) => {
                  const selected = demoEmail === account.email;
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
                      onClick={() => setDemoEmail(account.email)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-accent bg-surface"
                          : "border-line bg-surface hover:border-faint"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase ${
                          selected
                            ? "bg-accent text-white"
                            : "border border-line bg-paper"
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
                  error={demoError ?? undefined}
                >
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (demoError) setDemoError(null);
                    }}
                    aria-invalid={demoError ? true : undefined}
                    className={inputClasses}
                  />
                </Field>
              </div>
              <Button type="submit" disabled={demoPending} className="mt-4 w-full">
                {demoPending ? "Signing in…" : "Sign in as demo user"}
              </Button>
            </form>
          )}
        </div>
      )}

      <p className="mt-8 max-w-sm text-center text-xs text-faint">
        UC students only. Only UC email addresses (@uc.edu or @mail.uc.edu) are
        permitted.
      </p>
    </main>
  );
}
