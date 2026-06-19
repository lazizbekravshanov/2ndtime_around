import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/ui/Toast";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

// Every route in this group is auth-guarded: requireUser() redirects
// anonymous visitors to /signin and brand-new users to /onboarding.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

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

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        {/* Keyboard users can jump past the nav straight to content
            (WCAG 2.4.1 Bypass Blocks). Hidden until focused. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <Header
          userId={user.id}
          displayName={user.displayName ?? user.email}
          unreadCount={unreadCount}
          notifCount={notifCount}
          isModerator={mod?.isModerator ?? false}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 pb-24 md:pb-6"
        >
          {children}
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
