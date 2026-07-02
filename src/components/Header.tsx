"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  BoxIcon,
  ChatIcon,
  GridIcon,
  HeartIcon,
  LogoMark,
  PlusIcon,
} from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

const NAV = [
  { href: "/browse", label: "Browse", icon: GridIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
  { href: "/my-items", label: "My items", icon: BoxIcon },
];

// 44px-tall icon link (WCAG 2.5.5), focusable in its own right — no nested
// button stealing the tab stop.
const iconLinkClasses =
  "flex h-11 w-11 items-center justify-center rounded-lg text-faint transition-colors hover:bg-line/50 hover:text-ink";

function UserMenu({
  userId,
  displayName,
  isModerator,
}: {
  userId: string;
  displayName: string;
  isModerator: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape — standard menu behavior, keyboardable.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper text-sm font-semibold uppercase"
      >
        {displayName.charAt(0)}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-44 rounded-xl border border-line bg-surface py-1 shadow-float"
        >
          <Link
            role="menuitem"
            href={`/profile/${userId}`}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-paper"
          >
            My profile
          </Link>
          <Link
            role="menuitem"
            href="/saved"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-paper"
          >
            Saved
          </Link>
          <Link
            role="menuitem"
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-paper"
          >
            Notifications
          </Link>
          <Link
            role="menuitem"
            href="/impact"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-paper"
          >
            Campus impact
          </Link>
          {isModerator && (
            <>
              <Link
                role="menuitem"
                href="/funnel"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-paper"
              >
                Funnel
              </Link>
              <Link
                role="menuitem"
                href="/moderation"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-paper"
              >
                Moderation
              </Link>
            </>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-paper"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({
  userId,
  displayName,
  unreadCount,
  notifCount,
  isModerator,
}: {
  userId: string;
  displayName: string;
  unreadCount: number;
  notifCount: number;
  isModerator: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const [accountOpen, setAccountOpen] = useState(false);

  // Close the mobile account sheet whenever the route changes.
  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  const accountLinks = [
    { href: `/profile/${userId}`, label: "My profile" },
    { href: "/saved", label: "Saved" },
    { href: "/notifications", label: "Notifications", badge: notifCount },
    { href: "/impact", label: "Campus impact" },
    ...(isModerator
      ? [
          { href: "/funnel", label: "Funnel" },
          { href: "/moderation", label: "Moderation" },
        ]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-page items-center justify-between gap-4 px-4">
          <Link
            href="/browse"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <LogoMark />
            <span>2nd Time Around</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(href) ? "text-ink" : "text-faint hover:text-ink"
                }`}
              >
                {label}
                {href === "/messages" && unreadCount > 0 && (
                  <span
                    className="absolute right-0.5 top-1.5 h-2 w-2 rounded-full bg-accent"
                    aria-label={`${unreadCount} unread`}
                  />
                )}
                {isActive(href) && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-0.5 bg-accent" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/saved"
              aria-label="Saved"
              className={`hidden sm:flex ${iconLinkClasses}`}
            >
              <HeartIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/notifications"
              aria-label={
                notifCount > 0 ? `${notifCount} notifications` : "Notifications"
              }
              className={`relative hidden sm:flex ${iconLinkClasses}`}
            >
              <BellIcon className="h-5 w-5" />
              {notifCount > 0 && (
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent"
                  aria-hidden="true"
                />
              )}
            </Link>
            <Link
              href="/sell"
              className={`${buttonClasses("primary", "sm")} ml-1`}
            >
              <PlusIcon className="h-4 w-4" />
              Post item
            </Link>
            <UserMenu
              userId={userId}
              displayName={displayName}
              isModerator={isModerator}
            />
          </div>
        </div>
      </header>

      {/* Mobile: bottom tab bar — primary user is on a phone between classes.
          Browse · Messages · Post (center CTA) · My items · Account. */}
      <nav
        aria-label="Main mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-5 items-end">
          <MobileTab
            href="/browse"
            label="Browse"
            icon={GridIcon}
            active={isActive("/browse")}
          />
          <MobileTab
            href="/messages"
            label="Messages"
            icon={ChatIcon}
            active={isActive("/messages")}
            count={unreadCount}
          />

          {/* Center Post CTA — the one accent action. */}
          <Link
            href="/sell"
            aria-label="Post an item"
            className="flex flex-col items-center gap-0.5 py-1.5 text-xs font-medium text-ink"
          >
            <span className="flex h-9 w-12 items-center justify-center rounded-full bg-accent text-white">
              <PlusIcon className="h-5 w-5" />
            </span>
            Post
          </Link>

          <MobileTab
            href="/my-items"
            label="My items"
            icon={BoxIcon}
            active={isActive("/my-items")}
          />

          {/* Account opens a sheet with profile / saved / notifications / etc. */}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen(true)}
            className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
              accountOpen ? "text-accent" : "text-faint"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-semibold uppercase">
              {displayName.charAt(0)}
            </span>
            Account
            {notifCount > 0 && (
              <span
                className="absolute right-[calc(50%-16px)] top-1.5 h-2 w-2 rounded-full bg-accent"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </nav>

      <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} title="Account">
        <div className="space-y-1">
          {accountLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setAccountOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-sm hover:bg-paper"
            >
              {l.label}
              {"badge" in l && (l.badge ?? 0) > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-white">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center rounded-lg px-3 py-3 text-left text-sm hover:bg-paper"
          >
            Sign out
          </button>
        </div>
      </Sheet>
    </>
  );
}

// 5th-of-a-row bottom tab: icon + label, with an optional unread count badge.
function MobileTab({
  href,
  label,
  icon: Icon,
  active,
  count,
}: {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
        active ? "text-accent" : "text-faint"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
      {count !== undefined && count > 0 && (
        <span
          className="absolute right-[calc(50%-18px)] top-1 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold leading-none text-white"
          aria-label={`${count} unread`}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
