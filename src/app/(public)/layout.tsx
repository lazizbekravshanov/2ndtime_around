import { Suspense } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LogoMark } from "@/components/icons";
import { PublicSignInLink } from "@/components/PublicSignInLink";
import { ToastProvider } from "@/components/ui/Toast";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// Public route group — pages here (e.g. seller profiles) are viewable without
// signing in. Signed-in visitors still get the full app chrome; anonymous
// visitors get a minimal bar with a sign-in link.
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  let header: React.ReactNode;
  if (user) {
    const [unreadCount, notifCount, mod] = await Promise.all([
      db.message.count({
        where: {
          readAt: null,
          senderId: { not: user.id },
          conversation: {
            OR: [{ starterId: user.id }, { listing: { ownerId: user.id } }],
          },
        },
      }),
      db.notification.count({ where: { userId: user.id, readAt: null } }),
      db.user.findUnique({
        where: { id: user.id },
        select: { isModerator: true },
      }),
    ]);
    header = (
      <Header
        userId={user.id}
        displayName={user.displayName ?? user.email}
        unreadCount={unreadCount}
        notifCount={notifCount}
        isModerator={mod?.isModerator ?? false}
      />
    );
  } else {
    header = (
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-page items-center justify-between px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <span className="text-sm font-semibold tracking-tight">
              2nd Time Around
            </span>
          </Link>
          <Suspense
            fallback={
              <Link
                href="/signin"
                className="tap-target -mr-2 inline-flex items-center px-2 text-sm font-medium text-faint transition-colors hover:text-ink"
              >
                Sign in
              </Link>
            }
          >
            <PublicSignInLink className="tap-target -mr-2 inline-flex items-center px-2 text-sm font-medium text-faint transition-colors hover:text-ink" />
          </Suspense>
        </div>
      </header>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        {header}
        {/* pb clears the mobile bottom-tab bar for signed-in visitors only. */}
        <main
          id="main-content"
          className={`mx-auto w-full max-w-page flex-1 px-4 py-6 ${
            user ? "pb-24 md:pb-6" : "pb-6"
          }`}
        >
          {children}
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
