import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
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

  const unreadCount = await db.message.count({
    where: {
      readAt: null,
      senderId: { not: user.id },
      conversation: {
        OR: [{ starterId: user.id }, { listing: { ownerId: user.id } }],
      },
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        userId={user.id}
        displayName={user.displayName ?? user.email}
        unreadCount={unreadCount}
      />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
