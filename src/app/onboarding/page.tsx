import { redirect } from "next/navigation";
import { LogoMark } from "@/components/icons";
import { getSessionUser } from "@/lib/session";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  // Already onboarded? Straight to browsing.
  if (user.displayName) redirect("/browse");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-16">
      <LogoMark className="h-7 w-7" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Welcome, Bearcat
      </h1>
      <p className="mt-1 text-sm text-faint">
        One quick step: tell other students what to call you.
      </p>
      <div className="mt-8">
        <OnboardingForm />
      </div>
    </main>
  );
}
