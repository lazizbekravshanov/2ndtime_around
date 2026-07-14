"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signInHref } from "@/lib/url";

/** Public-chrome Sign in link that returns the visitor to the current URL. */
export function PublicSignInLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const qs = search.toString();
  const href = signInHref(qs ? `${pathname}?${qs}` : pathname);

  return (
    <Link href={href} className={className}>
      Sign in
    </Link>
  );
}
