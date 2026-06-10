"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  BoxIcon,
  ChatIcon,
  GridIcon,
  LogoMark,
  PlusIcon,
} from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";

const NAV = [
  { href: "/browse", label: "Browse", icon: GridIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
  { href: "/my-items", label: "My items", icon: BoxIcon },
];

function UserMenu({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
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
            href="/impact"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-paper"
          >
            Campus impact
          </Link>
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
}: {
  userId: string;
  displayName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
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

          <div className="flex items-center gap-3">
            <Link href="/sell" className={buttonClasses("primary", "sm")}>
              <PlusIcon className="h-4 w-4" />
              Post item
            </Link>
            <UserMenu userId={userId} displayName={displayName} />
          </div>
        </div>
      </header>

      {/* Mobile: bottom tab bar — primary user is on a phone between classes */}
      <nav
        aria-label="Main mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
      >
        <div className="grid grid-cols-3">
          {NAV.map(({ href, label, icon: Icon }) => (
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
              {href === "/messages" && unreadCount > 0 && (
                <span className="absolute right-[calc(50%-16px)] top-1.5 h-2 w-2 rounded-full bg-accent" />
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
