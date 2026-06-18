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

const NAV = [
  { href: "/browse", label: "Browse", icon: GridIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
  { href: "/my-items", label: "My items", icon: BoxIcon },
];

// Mobile bottom bar: Notifications joins the primary nav so its unread state
// is visible without opening the account menu (it was previously buried there).
const MOBILE_NAV = [
  { href: "/browse", label: "Browse", icon: GridIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
  { href: "/notifications", label: "Alerts", icon: BellIcon },
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
          className="absolute right-0 top-11 w-44 rounded-xl border border-line bg-surface py-1 shadow-sm"
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
            <Link
              role="menuitem"
              href="/moderation"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-paper"
            >
              Moderation
            </Link>
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

  // Frosted header that stays borderless at the top and separates (border +
  // soft shadow) once the page scrolls — the Apple "material lifts off" cue.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b bg-surface/80 backdrop-blur-lg transition-shadow duration-300 ${
          scrolled ? "border-line shadow-card" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4">
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

      {/* Mobile: bottom tab bar — primary user is on a phone between classes */}
      <nav
        aria-label="Main mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/80 backdrop-blur-lg md:hidden"
      >
        <div className="grid grid-cols-4">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const dot =
              (href === "/messages" && unreadCount > 0) ||
              (href === "/notifications" && notifCount > 0);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  isActive(href) ? "text-accent" : "text-faint"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
                {dot && (
                  <span
                    className="absolute right-[calc(50%-16px)] top-1.5 h-2 w-2 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
